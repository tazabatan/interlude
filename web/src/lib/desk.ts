import { cookies } from 'next/headers'
import { getServiceRoleBaseUrl, serviceRoleFetch, serviceRoleRpc } from '@/lib/supabase/service-role'

function parseSupabaseAuthCookie(value: string) {
  const base64Prefix = 'base64-'
  let raw = value

  if (raw.startsWith(base64Prefix)) {
    const base64Payload = raw.slice(base64Prefix.length)
    try {
      const globalBuffer = (globalThis as typeof globalThis & { Buffer?: typeof Buffer }).Buffer
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

type PassProfileAsset = {
  id?: string
  name?: string | null
  storagePath?: string | null
  url?: string | null
}

type PassProfilePayload = {
  heroImage?: PassProfileAsset | null
  economicsType?: string | null
  prepaidCreditAmountCents?: number | null
}

export type DeskBooking = {
  id: string
  user_id: string
  pass_id: string
  date: string
  party_size: number
  guest_adult_count: number | null
  guest_child_count: number | null
  guest_ages: number[] | null
  status: string
  arrival_window_start: string | null
  arrival_window_end: string | null
  requested_arrival_time: string | null
  hold_amount: number | null
  hold_currency: string | null
  hold_status: string | null
  created_at: string | null
  qr_jti: string | null
  pass: {
    kind: string | null
    currency: string | null
    min_spend_amount: number | null
    display_price_text: string | null
    interlude_perk: string | null
    auto_approve_enabled: boolean
    default_arrival_start_local: string | null
    default_arrival_window_minutes: number | null
    profile: PassProfilePayload | null
    venue: {
      name: string | null
      tz: string | null
    } | null
  } | null
}

export type DeskPass = {
  id: string
  kind: string | null
  currency: string | null
  min_spend_amount: number | null
  display_price_text: string | null
  interlude_perk: string | null
  status: string | null
  visibility: string | null
  auto_approve_enabled: boolean
  default_arrival_start_local: string | null
  default_arrival_window_minutes: number | null
  no_show_amount_per_person: number | null
  service_hours_open_local: string | null
  service_hours_close_local: string | null
  arrival_grace_minutes: number | null
  default_daily_cap: number
  profile: PassProfilePayload | null
  venue: {
    name: string | null
    tz: string | null
  } | null
}

const STORAGE_BUCKET = 'venue-media'

function getSupabaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321').replace(/\/$/, '')
}

function resolveStorageUrl(path?: string | null) {
  if (!path) return null
  const cleanPath = path.replace(/^\/+/, '')
  return `${getSupabaseUrl()}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`
}

export function getPassHeroImageUrl(source?: { profile?: PassProfilePayload | null } | null) {
  const asset = source?.profile?.heroImage ?? null
  if (!asset) return null
  if (asset.storagePath) return resolveStorageUrl(asset.storagePath)
  if (asset.url) return asset.url
  return null
}

const BOOKING_SELECT = [
  'id',
  'user_id',
  'pass_id',
  'date',
  'party_size',
  'guest_adult_count',
  'guest_child_count',
  'guest_ages',
  'status',
  'arrival_window_start',
  'arrival_window_end',
  'requested_arrival_time',
  'created_at',
  'hold_amount',
  'hold_currency',
  'hold_status',
  'qr_jti',
  [
    'pass:passes(',
    'kind,',
    'currency,',
    'min_spend_amount,',
    'display_price_text,',
    'interlude_perk,',
    'auto_approve_enabled,',
    'default_arrival_start_local,',
    'default_arrival_window_minutes,',
    'profile,',
    'venue:venues(name,tz)',
    ')',
  ].join(''),
].join(',')

export const PASS_SELECT = [
  'id',
  'kind',
  'currency',
  'min_spend_amount',
  'display_price_text',
  'interlude_perk',
  'status',
  'visibility',
  'auto_approve_enabled',
  'default_arrival_start_local',
  'default_arrival_window_minutes',
  'no_show_amount_per_person',
  'service_hours_open_local',
  'service_hours_close_local',
  'arrival_grace_minutes',
  'default_daily_cap',
  'profile',
  'venue:venues(name,tz)',
].join(',')

function buildStatusFilter(statuses: string[]) {
  if (statuses.length === 1) {
    return `status=eq.${statuses[0]}`
  }
  return `status=in.(${statuses.join(',')})`
}

async function fetchBookingsWithFilter(filter: string, venueId?: string) {
  let url = `/rest/v1/bookings?${filter}&order=created_at.desc&select=${encodeURIComponent(BOOKING_SELECT)}`

  if (venueId) {
    url += `&venue_id=eq.${venueId}`
  }

  const res = await serviceRoleFetch(url)
  return (await res.json()) as DeskBooking[]
}

export async function fetchDeskBookings(status: 'requested' | 'pending_verification', venueId?: string) {
  return fetchBookingsWithFilter(buildStatusFilter([status]), venueId)
}

export async function fetchDeskBookingById(bookingId: string, venueId?: string) {
  let url = `/rest/v1/bookings?id=eq.${bookingId}&limit=1&select=${encodeURIComponent(BOOKING_SELECT)}`

  if (venueId) {
    url += `&venue_id=eq.${venueId}`
  }

  const res = await serviceRoleFetch(url)
  const rows = (await res.json()) as DeskBooking[]
  return rows[0] ?? null
}

export async function fetchDeskBookingsByStatuses(statuses: string[], venueId?: string) {
  if (statuses.length === 0) return []
  return fetchBookingsWithFilter(buildStatusFilter(statuses), venueId)
}

export async function fetchVenuePasses(venueId: string) {
  const res = await serviceRoleFetch(
    `/rest/v1/passes?venue_id=eq.${venueId}&order=created_at.asc&select=${encodeURIComponent(PASS_SELECT)}`
  )
  return (await res.json()) as DeskPass[]
}

export async function fetchPassById(passId: string) {
  const res = await serviceRoleFetch(
    `/rest/v1/passes?id=eq.${passId}&limit=1&select=${encodeURIComponent(PASS_SELECT)}`
  )
  const rows = (await res.json()) as DeskPass[]
  return rows[0] ?? null
}

export async function fetchPassesByIds(passIds: string[]) {
  const uniqueIds = Array.from(new Set(passIds.filter(Boolean)))
  if (uniqueIds.length === 0) return []
  const sanitized = uniqueIds.map((id) => id.replace(/"/g, ''))
  const quoted = sanitized.map((id) => `"${id}"`).join(',')
  const res = await serviceRoleFetch(
    `/rest/v1/passes?id=in.(${quoted})&select=${encodeURIComponent(PASS_SELECT)}`
  )
  return (await res.json()) as DeskPass[]
}

export async function deskAction(action: string, payload: unknown) {
  const cookieStore = await cookies()
  const cookiesList = cookieStore.getAll()

  let accessToken =
    cookieStore.get('sb-access-token')?.value ??
    cookieStore.get('sb:token')?.value ??
    cookieStore.get('access-token')?.value

  if (!accessToken) {
    const authCookie =
      cookiesList.find((c) => c.name.endsWith('-auth-token')) ??
      cookiesList.find((c) => c.name.includes('-auth-token'))
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

  const res = await fetch(`${getServiceRoleBaseUrl()}/functions/v1/desk_controls`, {
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
  return serviceRoleRpc('fn_approve_booking', {
    _booking_id: params.bookingId,
    _window_start: params.windowStart,
    _window_end: params.windowEnd,
    _issue_now: params.issueNow ?? true,
  })
}

export async function declineBooking(params: { bookingId: string; reason?: string | null }) {
  return serviceRoleRpc('fn_decline_booking', {
    _booking_id: params.bookingId,
    _reason: params.reason ?? null,
    _idem_key: null,
  })
}

export async function undoDeclineBooking(params: { bookingId: string }) {
  return serviceRoleRpc('fn_restore_declined_booking', {
    _booking_id: params.bookingId,
  })
}

export async function redeemBooking(params: { qrJti: string; serverName?: string | null; tableRef?: string | null }) {
  return serviceRoleRpc('fn_redeem', {
    _qr_jti: params.qrJti,
    _server_name: params.serverName ?? null,
    _table_ref: params.tableRef ?? null,
  })
}

export type PassInventory = {
  id: string
  pass_id: string
  date: string
  cap: number
  paused: boolean
}

export async function fetchBookingsByDateRange(startDate: string, endDate: string, venueId?: string) {
  let url = `/rest/v1/bookings?date=gte.${startDate}&date=lte.${endDate}&order=date.asc&select=${encodeURIComponent(BOOKING_SELECT)}`
  if (venueId) {
    url += `&venue_id=eq.${venueId}`
  }
  const res = await serviceRoleFetch(url)
  return (await res.json()) as DeskBooking[]
}

export async function fetchPassInventoryByDateRange(startDate: string, endDate: string, venueId?: string) {
  const baseSelect = 'id,pass_id,date,cap,paused'
  const select = venueId ? `${baseSelect},pass:passes(venue_id)` : baseSelect
  let url = `/rest/v1/pass_inventory?date=gte.${startDate}&date=lte.${endDate}&select=${encodeURIComponent(select)}`
  if (venueId) {
    url += `&pass.venue_id=eq.${venueId}`
  }
  const res = await serviceRoleFetch(url)
  return (await res.json()) as PassInventory[]
}

export async function fetchBookingsByDate(date: string, venueId?: string) {
  let url = `/rest/v1/bookings?date=eq.${date}&order=created_at.desc&select=${encodeURIComponent(BOOKING_SELECT)}`
  if (venueId) {
    url += `&venue_id=eq.${venueId}`
  }
  const res = await serviceRoleFetch(url)
  return (await res.json()) as DeskBooking[]
}
