import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const guestRoles = ['member', 'admin']
const deskRoles = ['venue_manager', 'venue_staff', 'admin']
const adminRoles = ['admin']

function isPublicAppPath(pathname: string) {
  if (pathname === '/app' || pathname === '/app/') return true
  if (pathname.startsWith('/app/explore')) return true
  if (pathname.startsWith('/app/venue')) return true
  return false
}

type SupabaseAuthState = {
  currentSession?: { access_token?: string; accessToken?: string }
  session?: { access_token?: string; accessToken?: string }
  user?: { access_token?: string; accessToken?: string }
  access_token?: string
  accessToken?: string
}

function parseSupabaseAuthCookie(value: string) {
  try {
    return JSON.parse(value) as SupabaseAuthState
  } catch {
    return null
  }
}

function extractAccessToken(req: NextRequest) {
  const direct =
    req.cookies.get('sb-access-token')?.value ??
    req.cookies.get('sb:token')?.value ??
    req.cookies.get('access-token')?.value

  if (direct) return direct

  const authCookie =
    req.cookies.get('sb-auth-token') ??
    req.cookies.get('supabase-auth-token') ??
    req.cookies.getAll().find((cookie) => cookie.name.endsWith('-auth-token') || cookie.name.includes('-auth-token'))

  if (!authCookie?.value) return null
  const parsed = parseSupabaseAuthCookie(authCookie.value)
  if (!parsed) return null

  return (
    parsed.currentSession?.access_token ??
    parsed.currentSession?.accessToken ??
    parsed.session?.access_token ??
    parsed.session?.accessToken ??
    parsed.user?.access_token ??
    parsed.user?.accessToken ??
    parsed.access_token ??
    parsed.accessToken ??
    null
  )
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
  return res.json() as Promise<{ id: string; user_metadata?: Record<string, unknown> }>
}

export async function proxy(req: NextRequest) {
  const accessToken = extractAccessToken(req)
  const user = accessToken ? await fetchUser(accessToken) : null
  let role = (user?.user_metadata?.['app_role'] as string | undefined) ?? 'guest'

  // Check for impersonation session
  const impersonationCookie = req.cookies.get('impersonation_session')
  if (impersonationCookie && user) {
    try {
      const impersonationSession = JSON.parse(impersonationCookie.value)
      const now = Date.now()
      const expiryTime = impersonationSession.startTime + impersonationSession.timeLimitMinutes * 60 * 1000

      if (now <= expiryTime) {
        const serviceRoleUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleUrl && serviceRoleKey) {
          const query = encodeURIComponent('raw_user_meta_data')
          const filterQuery = encodeURIComponent(`id.eq.${impersonationSession.impersonatedUserId}`)
          const userRes = await fetch(
            `${serviceRoleUrl}/rest/v1/auth_user_profiles?select=${query}&${filterQuery}`,
            {
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              cache: 'no-store',
            }
          )

          if (userRes.ok) {
            const users = (await userRes.json()) as Array<{ raw_user_meta_data: { app_role?: string } }>
            if (users.length > 0) {
              role = (users[0].raw_user_meta_data?.app_role as string | undefined) ?? 'guest'
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse impersonation session in proxy:', error)
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

export const config = {
  matcher: ['/app/:path*', '/desk/:path*', '/admin/:path*', '/account/:path*'],
}
