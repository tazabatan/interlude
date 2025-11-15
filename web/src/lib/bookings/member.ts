import { fetchPassById, fetchPassesByIds } from '@/lib/desk'
import { getSupabaseServer } from '@/lib/supabase/server'
import { buildGuestBookingView, type GuestBookingRow } from './view-model'

export async function fetchMemberBookings() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { bookings: [], user: null }
  }

  const response = await supabase
    .from('bookings')
    .select(
      `
        id,
        pass_id,
        date,
        party_size,
        status,
        arrival_window_start,
        arrival_window_end,
        requested_arrival_time,
        qr_jti,
        hold_status,
        pass:passes(kind,profile,display_price_text,min_spend_amount,currency,venue:venues(name,tz))
      `
    )
    .eq('user_id', user.id)
    .order('arrival_window_start', { ascending: true })

  if (response.error) {
    console.error('fetchMemberBookings failed', response.error)
    throw new Error('Failed to load bookings')
  }

  const rows = (response.data ?? []) as unknown as GuestBookingRow[]
  const passes = await fetchPassesByIds(rows.map((row) => row.pass_id))
  const passMap = new Map(passes.map((pass) => [pass.id, pass]))
  const bookings = rows.map((row) => buildGuestBookingView(row, passMap.get(row.pass_id)))

  return { bookings, user }
}

export async function fetchMemberBookingById(bookingId: string) {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const response = await supabase
    .from('bookings')
    .select(
      `
        id,
        pass_id,
        date,
        party_size,
        status,
        arrival_window_start,
        arrival_window_end,
        requested_arrival_time,
        qr_jti,
        hold_status,
        pass:passes(kind,profile,display_price_text,min_spend_amount,currency,venue:venues(name,tz))
      `
    )
    .eq('user_id', user.id)
    .eq('id', bookingId)
    .maybeSingle()

  if (response.error) {
    console.error('fetchMemberBookingById failed', response.error)
    throw new Error('Failed to load booking')
  }

  if (!response.data) {
    return null
  }

  const row = response.data as unknown as GuestBookingRow
  const pass = row.pass_id ? await fetchPassById(row.pass_id) : null
  return buildGuestBookingView(row, pass)
}
