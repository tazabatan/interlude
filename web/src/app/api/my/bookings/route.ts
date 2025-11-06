import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { buildGuestBookingView, type GuestBookingRow } from '@/lib/bookings/view-model'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
    console.error('Failed to load member bookings', response.error)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }

  const rows = (response.data ?? []) as GuestBookingRow[]
  const bookings = rows.map((row) => buildGuestBookingView(row))

  return NextResponse.json({ bookings })
}
