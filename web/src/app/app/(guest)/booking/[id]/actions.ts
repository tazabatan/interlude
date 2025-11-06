'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'

export type CancelBookingActionState = {
  ok: boolean
  message: string
}

const DEFAULT_STATE: CancelBookingActionState = { ok: false, message: '' }

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
  const { error } = await supabase.rpc('fn_cancel_booking', { p_booking_id: bookingId })

  if (error) {
    if (error.message.includes('too_late_to_cancel')) {
      return { ok: false, message: 'Too late to cancel—your arrival window has started.' }
    }
    if (error.message.includes('invalid_status_for_cancel')) {
      return { ok: false, message: 'This booking can no longer be cancelled.' }
    }
    return { ok: false, message: 'Could not cancel the booking. Please try again.' }
  }

  revalidatePath('/app')
  revalidatePath(`/app/booking/${bookingId}`)

  return { ok: true, message: 'Booking cancelled.' }
}
