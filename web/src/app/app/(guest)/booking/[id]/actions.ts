'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { getSupabaseServer } from '@/lib/supabase/server'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import { notifyBookingCancelled } from '@/lib/email/triggers'

export type CancelBookingActionState = {
  ok: boolean
  message: string
}

const DEFAULT_STATE: CancelBookingActionState = { ok: false, message: '' }
const CANCELLABLE_STATUSES = new Set(['requested', 'approved', 'issued', 'pending_verification'])

export async function cancelBookingAction(
  _prevState: CancelBookingActionState = DEFAULT_STATE,
  formData: FormData
): Promise<CancelBookingActionState> {
  void _prevState

  const bookingId = formData.get('bookingId')
  if (!bookingId || typeof bookingId !== 'string') {
    return { ok: false, message: 'Booking not found.' }
  }

  const supabase = await getSupabaseServer()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, message: 'Please sign in again to cancel your booking.' }
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id,status,hold_status,user_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError || !booking) {
    return { ok: false, message: 'Booking not found.' }
  }

  if (booking.user_id !== user.id) {
    return { ok: false, message: 'You can only cancel your own bookings.' }
  }

  if (booking.status === 'cancelled') {
    return { ok: true, message: 'Booking already cancelled.' }
  }

  if (!CANCELLABLE_STATUSES.has(booking.status)) {
    return { ok: false, message: 'This booking can no longer be cancelled.' }
  }

  try {
    await cancelBookingRecord({
      bookingId: booking.id,
      status: booking.status,
      holdStatus: booking.hold_status,
      memberId: user.id,
    })
    await notifyBookingCancelled(booking.id, 'guest', null)
  } catch (error) {
    console.error('cancelBookingAction failed', error)
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('booking_state_conflict')) {
      return { ok: false, message: 'This booking can no longer be cancelled.' }
    }
    return { ok: false, message: 'Could not cancel the booking. Please try again.' }
  }

  revalidatePath('/app')
  revalidatePath(`/app/booking/${bookingId}`)

  return { ok: true, message: 'Booking cancelled.' }
}

async function cancelBookingRecord(params: {
  bookingId: string
  status: string
  holdStatus: string | null
  memberId: string
}) {
  const { bookingId, status, holdStatus, memberId } = params
  const searchParams = new URLSearchParams({
    id: `eq.${bookingId}`,
    status: `eq.${status}`,
  })

  const updateRes = await serviceRoleFetch(`/rest/v1/bookings?${searchParams.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  const updated = (await updateRes.json()) as unknown
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error('booking_state_conflict')
  }

  await serviceRoleFetch('/rest/v1/booking_audit', {
    method: 'POST',
    body: JSON.stringify({
      id: randomUUID(),
      booking_id: bookingId,
      from_status: status,
      to_status: 'cancelled',
      actor: memberId,
      meta: { reason: 'self_cancel' },
    }),
  })

  if (holdStatus === 'authorized') {
    await serviceRoleFetch('/rest/v1/due_jobs', {
      method: 'POST',
      body: JSON.stringify({
        id: randomUUID(),
        job_type: 'hold_cancel',
        booking_id: bookingId,
        run_at: new Date().toISOString(),
        status: 'queued',
        attempts: 0,
      }),
    })
  }
}
