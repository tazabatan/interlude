import { NextResponse } from 'next/server'
import { fetchPassesByIds } from '@/lib/desk'
import { getSupabaseServer } from '@/lib/supabase/server'
import { buildGuestBookingView, type GuestBookingRow } from '@/lib/bookings/view-model'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await getSupabaseServer()
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
        pass_id,
        date,
        party_size,
        status,
        arrival_window_start,
        arrival_window_end,
        requested_arrival_time,
        qr_jti,
        hold_status,
        pass:passes(kind,profile,display_price_text,min_spend_amount,currency,venue:venues(name,tz,provider_type))
      `
    )
    .eq('user_id', user.id)
    .order('arrival_window_start', { ascending: true })

  if (response.error) {
    console.error('Failed to load member bookings', response.error)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }

  const rows = (response.data ?? []) as unknown as GuestBookingRow[]
  const passes = await fetchPassesByIds(rows.map((row) => row.pass_id))
  const passMap = new Map(passes.map((pass) => [pass.id, pass]))
  const bookings = rows.map((row) => buildGuestBookingView(row, passMap.get(row.pass_id)))

  return NextResponse.json({ bookings })
}
