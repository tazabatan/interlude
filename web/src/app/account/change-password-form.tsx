'use client'

import { useActionState } from 'react'
import type { AccountFormState } from './types'
import { ACCOUNT_FORM_INITIAL_STATE } from './types'
import { changePasswordAction } from './actions'

export default function ChangePasswordForm() {
  const [state, formAction] = useActionState<AccountFormState, FormData>(changePasswordAction, ACCOUNT_FORM_INITIAL_STATE)

  return (
    <form action={formAction} className="mt-10 space-y-6 border-t border-[#E8E4D7] pt-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Security</p>
        <h2 className="mt-1 text-lg font-semibold uppercase tracking-[0.08em] text-black">Change password</h2>
        <p className="text-sm text-[#6F716D]">Update your password to keep your account secure.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
          Current password
          <input
            required
            type="password"
            name="currentPassword"
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm font-normal text-[#31332f]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
          New password
          <input
            required
            type="password"
            name="newPassword"
            minLength={8}
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm font-normal text-[#31332f]"
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D] md:col-span-2">
          Confirm new password
          <input
            required
            type="password"
            name="confirmPassword"
            minLength={8}
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm font-normal text-[#31332f]"
          />
        </label>
      </div>

      {state.status === 'error' ? (
        <p className="text-sm text-[#B4231F]">{state.message ?? 'Unable to update password.'}</p>
      ) : null}
      {state.status === 'success' ? (
        <p className="text-sm text-[#035C4C]">{state.message ?? 'Password updated.'}</p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800"
      >
        Save password
      </button>
    </form>
  )
}
