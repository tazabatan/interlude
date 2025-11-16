import { decodeJwt } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeImpersonationCookie } from '@/lib/impersonation-cookie'

const guestRoles = ['member', 'admin']
const deskRoles = ['venue_manager', 'venue_staff', 'admin']
const adminRoles = ['admin']

function isPublicAppPath(pathname: string) {
  if (pathname === '/app' || pathname === '/app/') return true
  if (pathname.startsWith('/app/explore')) return true
  if (pathname.startsWith('/app/venue')) return true
  return false
}

type AuthUser = {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

type SupabaseAuthUser = {
  id?: string
  email?: string
  user_metadata?: Record<string, unknown> | null
}

type SupabaseSession = {
  access_token?: string
  accessToken?: string
  user?: SupabaseAuthUser | null
}

type SupabaseAuthState =
  | {
      currentSession?: SupabaseSession | null
      session?: SupabaseSession | null
      user?: SupabaseAuthUser | null
      access_token?: string
      accessToken?: string
    }
  | [SupabaseSession | null | undefined, SupabaseAuthUser | null | undefined]

function parseSupabaseAuthCookie(value: string) {
  try {
    // Handle base64-encoded cookies (Supabase SSR format)
    if (value.startsWith('base64-')) {
      const base64String = value.slice(7) // Remove 'base64-' prefix
      const decoded = atob(base64String) // Decode base64 to string
      return JSON.parse(decoded) as SupabaseAuthState
    }
    // Try parsing as raw JSON
    return JSON.parse(value) as SupabaseAuthState
  } catch (err) {
    console.error('Failed to parse auth cookie:', err)
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' ? value.id : null
  if (!id) return null

  const normalized: AuthUser = { id }

  if (typeof value.email === 'string') {
    normalized.email = value.email
  }

  const metadata = value.user_metadata
  if (isRecord(metadata)) {
    normalized.user_metadata = metadata
  }

  return normalized
}

function getTokenFromState(state: SupabaseAuthState | null) {
  if (!state) return null
  if (Array.isArray(state)) {
    const session = state[0]
    return session?.access_token ?? session?.accessToken ?? null
  }

  return (
    state.currentSession?.access_token ??
    state.currentSession?.accessToken ??
    state.session?.access_token ??
    state.session?.accessToken ??
    (typeof state.access_token === 'string' ? state.access_token : null) ??
    (typeof state.accessToken === 'string' ? state.accessToken : null)
  )
}

function getUserFromState(state: SupabaseAuthState | null): AuthUser | null {
  if (!state) return null
  if (Array.isArray(state)) {
    const [, userEntry] = state
    return normalizeAuthUser(userEntry) ?? normalizeAuthUser(state[0]?.user)
  }

  return (
    normalizeAuthUser(state.currentSession?.user) ??
    normalizeAuthUser(state.session?.user) ??
    normalizeAuthUser(state.user)
  )
}

function decodeUserFromToken(accessToken: string): AuthUser | null {
  try {
    const payload = decodeJwt(accessToken) as Record<string, unknown>
    const sub = typeof payload.sub === 'string' ? payload.sub : null
    if (!sub) return null

    const normalized: AuthUser = { id: sub }
    if (typeof payload.email === 'string') {
      normalized.email = payload.email
    }

    let metadata = isRecord(payload.user_metadata) ? { ...payload.user_metadata } : undefined
    const appRole =
      isRecord(payload.app_metadata) && typeof payload.app_metadata['app_role'] === 'string'
        ? (payload.app_metadata['app_role'] as string)
        : null

    if (appRole && (!metadata || typeof metadata['app_role'] === 'undefined')) {
      metadata = { ...(metadata ?? {}), app_role: appRole }
    }

    if (metadata) {
      normalized.user_metadata = metadata
    }

    return normalized
  } catch {
    return null
  }
}

function getAuthContext(req: NextRequest) {
  const directToken =
    req.cookies.get('sb-access-token')?.value ??
    req.cookies.get('sb:token')?.value ??
    req.cookies.get('access-token')?.value

  const authCookie =
    req.cookies.get('sb-auth-token') ??
    req.cookies.get('supabase-auth-token') ??
    req.cookies.getAll().find((cookie) => cookie.name.endsWith('-auth-token') || cookie.name.includes('-auth-token'))

  const parsedState = authCookie?.value ? parseSupabaseAuthCookie(authCookie.value) : null
  const accessToken = directToken ?? getTokenFromState(parsedState) ?? null
  const user = getUserFromState(parsedState) ?? (accessToken ? decodeUserFromToken(accessToken) : null)

  return { accessToken, user }
}

async function fetchUser(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return null

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = (await res.json()) as {
    id: string
    email?: string
    user_metadata?: Record<string, unknown>
  }

  return {
    id: data.id,
    email: data.email,
    user_metadata: data.user_metadata,
  }
}

export async function proxy(req: NextRequest) {
  const { accessToken, user: cachedUser } = getAuthContext(req)
  let user = cachedUser
  if (!user && accessToken) {
    user = await fetchUser(accessToken)
  }
  let role = (user?.user_metadata?.['app_role'] as string | undefined) ?? 'guest'

  const impersonationCookie = req.cookies.get('impersonation_session')
  if (impersonationCookie && user) {
    const session = await decodeImpersonationCookie(impersonationCookie.value)
    if (session && session.adminUserId === user.id && Date.now() <= session.expiresAt) {
      role = session.impersonatedRole ?? role
    }
  }

  const path = req.nextUrl.pathname

  const buildRedirect = (target: string) => {
    const url = new URL(target, req.url)
    if (!user && !url.searchParams.has('next')) {
      url.searchParams.set('next', req.nextUrl.pathname)
    }
    return NextResponse.redirect(url)
  }

  if (path.startsWith('/desk')) {
    if (!user) return buildRedirect('/auth')
    if (!deskRoles.includes(role)) return buildRedirect('/app')
  } else if (path.startsWith('/admin')) {
    if (!user) return buildRedirect('/auth')
    if (!adminRoles.includes(role)) return buildRedirect('/app')
  } else if (path.startsWith('/app')) {
    const publicAppPath = isPublicAppPath(path)
    if (!user && !publicAppPath) return buildRedirect('/auth')
    if (user) {
      if (deskRoles.includes(role) && !guestRoles.includes(role)) return buildRedirect('/desk')
      if (!guestRoles.includes(role)) return buildRedirect('/auth')
    }
  } else if (path.startsWith('/account')) {
    if (!user) return buildRedirect('/auth')
  }

  return NextResponse.next()
}

export const middleware = proxy
export default proxy
