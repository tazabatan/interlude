"use client"

import { useState } from "react"
import { addConciergeAssignment, removeConciergeAssignment } from "./assignments-actions"

type Assignment = {
  id: string
  user_id: string
  role: string
  user_email?: string | null
}

export default function Assignments({
  passId,
  existing,
}: {
  passId: string
  existing: Assignment[]
}) {
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState<"manager" | "staff">("manager")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localAssignments, setLocalAssignments] = useState(existing)

  const handleAdd = async () => {
    if (!userId.trim()) {
      setError("User ID is required")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await addConciergeAssignment({ passId, userId: userId.trim(), role })
      setLocalAssignments((prev) => [...prev, { id: crypto.randomUUID(), user_id: userId.trim(), role }])
      setUserId("")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add assignment"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (id: string) => {
    setSubmitting(true)
    setError(null)
    try {
      await removeConciergeAssignment(id)
      setLocalAssignments((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove assignment"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            User ID
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-2 rounded border border-[#DBD8C9] bg-white px-3 py-2 text-sm text-[#31332F] placeholder:text-[#6F716D]"
              placeholder="auth.users.id"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "manager" | "staff")}
              className="mt-2 rounded border border-[#DBD8C9] bg-white px-3 py-2 text-sm text-[#31332F]"
            >
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            className="h-10 rounded-full border border-[#02374D] px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-[#B4231F]">{error}</p>}
      </div>

      <div className="rounded-2xl border border-[#E8E4D7] bg-white shadow-sm">
        <div className="grid grid-cols-[2fr_1fr_0.5fr] gap-4 border-b border-[#EFE9DC] bg-[#F8F6EF] px-4 py-3 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
          <div>User</div>
          <div>Role</div>
          <div></div>
        </div>
        <div className="divide-y divide-[#EFE9DC]">
          {localAssignments.length === 0 ? (
            <div className="px-4 py-4 text-sm text-[#4F514D]">No assignments yet.</div>
          ) : (
            localAssignments.map((a) => (
              <div key={a.id} className="grid grid-cols-[2fr_1fr_0.5fr] items-center gap-4 px-4 py-3 text-sm text-[#31332F]">
                <div className="break-all text-xs uppercase tracking-[0.1em] text-[#4F514D]">{a.user_email ?? a.user_id}</div>
                <div className="text-[#31332F] capitalize">{a.role}</div>
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  disabled={submitting}
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4231F] hover:text-[#8f1b17] disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
