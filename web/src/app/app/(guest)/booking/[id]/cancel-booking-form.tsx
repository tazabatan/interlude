'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBookingAction, type CancelBookingActionState } from './actions'

const initialState: CancelBookingActionState = { ok: false, message: '' }

export default function CancelBookingForm({ bookingId, disabled }: { bookingId: string; disabled: boolean }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(cancelBookingAction, initialState)

  useEffect(() => {
    if (state.ok) {
      // Return to wallet and refresh state so the card disappears.
      router.replace('/app')
      router.refresh()
    }
  }, [state.ok, router])

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50 disabled:text-red-400"
      >
        {pending ? 'Cancelling…' : 'Cancel reservation'}
      </button>
      {state.message && (
        <p className={`text-sm ${state.ok ? 'text-emerald-600' : 'text-red-600'}`}>{state.message}</p>
      )}
      {!pending && disabled && !state.message && (
        <p className="text-sm text-gray-500">Arrival window has started; contact support to adjust.</p>
      )}
    </form>
  )
}
