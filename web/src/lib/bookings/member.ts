import { getSupabaseServer } from '@/lib/supabase/server'
import { buildGuestBookingView, type GuestBookingRow } from './view-model'

export async function fetchMemberBookings() {
  const supabase = getSupabaseServer()
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
        date,
        party_size,
        status,
        arrival_window_start,
        arrival_window_end,
        qr_jti,
        hold_status,
        venue:venues(name,tz)
      `
    )
    .eq('user_id', user.id)
    .order('arrival_window_start', { ascending: true })

  if (response.error) {
    console.error('fetchMemberBookings failed', response.error)
    throw new Error('Failed to load bookings')
  }

  const rows = (response.data ?? []) as GuestBookingRow[]
  const bookings = rows.map((row) => buildGuestBookingView(row))

  return { bookings, user }
}
