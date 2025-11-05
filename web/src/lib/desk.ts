import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321'

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, '')
}

function getServiceRoleKey() {
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!srk) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return srk
}

function parseSupabaseAuthCookie(value: string) {
  const base64Prefix = 'base64-'
  let raw = value

  if (raw.startsWith(base64Prefix)) {
    const base64Payload = raw.slice(base64Prefix.length)
    try {
      const globalBuffer = (globalThis as any)?.Buffer
      if (globalBuffer?.from) {
        raw = globalBuffer.from(base64Payload, 'base64').toString('utf-8')
      } else if (typeof atob === 'function') {
        raw = atob(base64Payload)
      } else {
        throw new Error('No base64 decoder available')
      }
    } catch (error) {
      console.warn('deskAction failed to decode auth cookie', error)
      return null
    }
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    console.warn('deskAction failed to parse auth cookie', error)
    return null
  }
}

type SupabaseAuthState = {
  currentSession?: { access_token?: string; accessToken?: string }
  session?: { access_token?: string; accessToken?: string }
  user?: { access_token?: string; accessToken?: string }
  access_token?: string
  accessToken?: string
}

async function callSupabase(path: string, init: RequestInit = {}) {
  const srk = getServiceRoleKey()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${srk}`)
  headers.set('apikey', srk)

  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`Supabase request failed (${res.status}): ${text}`)
  }

  return res
}

async function callRpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const res = await callSupabase(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<T>
}

export type DeskBooking = {
  id: string
  pass_id: string
  date: string
  party_size: number
  status: string
  arrival_window_start: string | null
  arrival_window_end: string | null
  pass: {
    kind: string | null
    auto_approve_enabled: boolean
    default_arrival_start_local: string | null
    default_arrival_window_minutes: number | null
    venue: {
      name: string | null
      tz: string | null
    } | null
  } | null
}

export async function fetchDeskBookings(status: 'requested' | 'pending_verification') {
  const select = [
    'id',
    'pass_id',
    'date',
    'party_size',
    'status',
    'arrival_window_start',
    'arrival_window_end',
    'created_at',
    'pass:passes(kind,auto_approve_enabled,default_arrival_start_local,default_arrival_window_minutes,venue:venues(name,tz))',
  ].join(',')

  const res = await callSupabase(
    `/rest/v1/bookings?status=eq.${status}&order=created_at.desc&select=${encodeURIComponent(select)}`,
  )
  return (await res.json()) as DeskBooking[]
}

export async function deskAction(action: string, payload: unknown) {
  const cookieStore = await cookies()
  const cookiesList = cookieStore.getAll()

  let accessToken =
    cookieStore.get('sb-access-token')?.value ??
    cookieStore.get('sb:token')?.value ??
    cookieStore.get('access-token')?.value

  if (!accessToken) {
    const authCookie = cookiesList.find((c) => c.name.includes('-auth-token'))
    if (authCookie?.value) {
      const parsed = parseSupabaseAuthCookie(authCookie.value)
      if (parsed) {
        const authState = parsed as SupabaseAuthState
        accessToken =
          authState.currentSession?.access_token ??
          authState.currentSession?.accessToken ??
          authState.accessToken ??
          authState.access_token ??
          authState.session?.access_token ??
          authState.session?.accessToken ??
          authState.user?.access_token ??
          authState.user?.accessToken ??
          null
      }
    }
  }

  if (!accessToken) {
    console.warn('deskAction missing access token. Cookies:', cookiesList.map((c) => c.name))
    throw new Error('Not authenticated; please sign in again')
  }

  const res = await fetch(`${getBaseUrl()}/functions/v1/desk_controls`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({ action, payload }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`desk_controls ${action} failed: ${await res.text()}`)
  }

  return res.json()
}



export async function approveBooking(params: {
  bookingId: string
  windowStart: string | null
  windowEnd: string | null
  issueNow?: boolean
}) {
  return callRpc('fn_approve_booking', {
    _booking_id: params.bookingId,
    _window_start: params.windowStart,
    _window_end: params.windowEnd,
    _issue_now: params.issueNow ?? true,
  })
}

export async function declineBooking(params: { bookingId: string; reason?: string | null }) {
  return callRpc('fn_decline_booking', {
    _booking_id: params.bookingId,
    _reason: params.reason ?? null,
    _idem_key: null,
  })
}
