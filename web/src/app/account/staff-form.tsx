"use client"

import { useActionState } from "react"
import { updateStaffProfileAction } from "./actions"
import type { AccountFormState } from "./types"
import { ACCOUNT_FORM_INITIAL_STATE } from "./types"

type StaffAccountFormProps = {
  role: string
  initialData: {
    fullName: string
    email: string
    phone: string
    title: string
  }
}

export default function StaffAccountForm({ role, initialData }: StaffAccountFormProps) {
  const [state, formAction] = useActionState<AccountFormState, FormData>(
    updateStaffProfileAction,
    ACCOUNT_FORM_INITIAL_STATE
  )

  return (
    <form action={formAction} className="space-y-8">
      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-[#02374D]">Profile</h2>
          <p className="text-sm text-[#6F716D]">
            {role === "admin"
              ? "Basic admin details for operational access."
              : "These details help venues know who is managing the desk."}
          </p>
        </header>

        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Full name
          <input
            type="text"
            name="fullName"
            defaultValue={initialData.fullName}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>

        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Email
          <input
            type="email"
            name="email"
            value={initialData.email}
            readOnly
            className="mt-2 w-full rounded border border-dashed border-[#DBD8C9] bg-[#F7F4EA] px-4 py-3 text-sm text-[#6F716D]"
          />
        </label>

        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Mobile number
          <input
            type="tel"
            name="phone"
            defaultValue={initialData.phone}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>

        <label className="block text-xs uppercase tracking-[0.2em] text-[#6F716D]">
          Title / role
          <input
            type="text"
            name="title"
            placeholder="Venue Manager, Head Concierge..."
            defaultValue={initialData.title}
            className="mt-2 w-full rounded border border-[#DBD8C9] px-4 py-3 text-sm text-[#02374D]"
          />
        </label>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {state.status !== "idle" && (
          <p
            className={
              state.status === "success"
                ? "text-sm text-green-600"
                : state.status === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-[#6F716D]"
            }
          >
            {state.message ?? (state.status === "success" ? "Saved" : "Something went wrong")}
          </p>
        )}
        <button
          type="submit"
          className="self-end rounded-full border border-[#02374D] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
        >
          Save changes
        </button>
      </div>
    </form>
  )
}
