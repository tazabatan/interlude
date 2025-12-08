import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { notifyBookingRequested } from '@/lib/email/triggers'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json().catch(() => null)) as { bookingId?: string } | null
    const bookingId = payload?.bookingId
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    }

    // Verify booking exists via service role (works for both guests and signed-in users)
    const verifyRes = await serviceRoleFetch(
      `/rest/v1/bookings?id=eq.${bookingId}&select=id&limit=1`,
      { method: "GET" }
    )
    const existing = (await verifyRes.json().catch(() => [])) as Array<{ id: string }>
    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    await notifyBookingRequested(bookingId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[email] booking request notify failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
