"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { initialInviteFormState, type InviteFormState } from "@/app/(actions)/role-invite-action.types"
import { sendRoleInviteAction } from "@/app/(actions)/role-invite-action"

type OptionRole = "venue_manager" | "venue_staff"

type VenueOption = {
  id: string
  name: string | null
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-full bg-[#02374D] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A] disabled:opacity-60"
    >
      {pending ? "Sending invite…" : "Send invite"}
    </button>
  )
}

export function RoleInviteForm({
  mode,
  venues = [],
  managedVenue,
}: {
  mode: "admin" | "manager"
  venues?: VenueOption[]
  managedVenue?: VenueOption | null
}) {
  const [state, formAction] = useActionState<InviteFormState, FormData>(
    sendRoleInviteAction,
    initialInviteFormState
  )
  const roleOptions: Array<{ value: OptionRole; label: string }> = [
    { value: "venue_staff", label: "Venue staff" },
    { value: "venue_manager", label: "Venue manager" },
  ]
  const venueDisabled = mode === "admin" && venues.length === 0

  return (
    <form action={formAction} className="space-y-3 rounded-[24px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Invite email
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-2 text-sm text-black"
          />
        </label>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
        Assign role
        <select
          name="role"
          className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-2 text-sm text-black"
          defaultValue="venue_staff"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {mode === "admin" ? (
        <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Venue
          <select
            name="venueId"
            required
            disabled={venueDisabled}
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-2 text-sm text-black disabled:bg-[#f1efe4]"
            defaultValue={venues[0]?.id ?? ""}
          >
            {venues.length === 0 ? (
              <option value="">No venues available</option>
            ) : (
              venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name ?? "Unnamed venue"}
                </option>
              ))
            )}
          </select>
        </label>
      ) : (
        <>
          <input type="hidden" name="venueId" value={managedVenue?.id ?? ""} />
          <p className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">
            Invites join: <span className="font-semibold text-black">{managedVenue?.name ?? "Your venue"}</span>
          </p>
        </>
      )}

      <SubmitButton disabled={venueDisabled} />

      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      {state.status === "success" && <p className="text-sm text-green-700">{state.message}</p>}
    </form>
  )
}
