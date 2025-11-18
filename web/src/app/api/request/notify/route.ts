import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { notifyBookingRequested } from '@/lib/email/triggers'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = (await req.json().catch(() => null)) as { bookingId?: string } | null
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    }

    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('id,user_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (!booking || booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    await notifyBookingRequested(bookingId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[email] booking request notify failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
