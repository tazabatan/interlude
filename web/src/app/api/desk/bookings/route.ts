import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { buildVenueBookingView, type VenueBookingRow } from '@/lib/bookings/view-model'

const DESK_ROLES = ['venue_manager', 'venue_staff', 'admin']

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venue_id')
  if (!venueId) {
    return NextResponse.json({ error: 'venue_id is required' }, { status: 400 })
  }

  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const role = (user.user_metadata?.app_role as string | undefined) ?? 'guest'
  if (!DESK_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const response = await supabase
    .from('bookings')
    .select(
      `
        id,
        party_size,
        status,
        arrival_window_start,
        arrival_window_end
      `
    )
    .eq('venue_id', venueId)
    .order('arrival_window_start', { ascending: true })

  if (response.error) {
    console.error('Failed to load venue bookings', response.error)
    return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
  }

  const rows = (response.data ?? []) as VenueBookingRow[]
  const bookings = rows.map((row) => buildVenueBookingView(row))

  return NextResponse.json({ bookings })
}
