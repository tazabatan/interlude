'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import type { AccountFormState } from '@/app/account/types'
import { ACCOUNT_FORM_INITIAL_STATE } from '@/app/account/types'
import { resetPasswordAction } from './actions'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    resetPasswordAction,
    ACCOUNT_FORM_INITIAL_STATE
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1E7] px-4 py-10 text-[#02374D] sm:px-8">
      <div className="w-full max-w-md rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-8 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Password reset</p>
          <h1 className="text-3xl font-medium uppercase tracking-[0.08em] text-black">Choose a new password</h1>
          <p className="text-sm text-[#6F716D]">
            You’re signed in from a secure recovery link. Set a new password below.
          </p>
        </header>

        <form action={formAction} className="mt-8 space-y-5">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            New password
            <input
              required
              type="password"
              name="newPassword"
              minLength={8}
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Confirm new password
            <input
              required
              type="password"
              name="confirmPassword"
              minLength={8}
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
            />
          </label>

          {state.status === 'error' ? (
            <p className="text-sm text-center text-[#B4231F]">{state.message ?? 'Unable to update password.'}</p>
          ) : null}
          {state.status === 'success' ? (
            <p className="text-sm text-center text-[#035C4C]">
              Password updated. You can return to the app or go to account settings anytime.
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800"
          >
            Save password
          </button>
          <button
            type="button"
            onClick={() => router.replace('/app')}
            className="w-full rounded-full border border-[#02374D] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
          >
            Return to app
          </button>
        </form>
      </div>
    </div>
  )
}
