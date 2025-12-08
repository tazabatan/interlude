"use server"

import { revalidatePath } from "next/cache"
import { serviceRoleFetch } from "@/lib/supabase/service-role"

type AssignmentInput = {
  passId: string
  userId: string
  role: "manager" | "staff"
}

export async function addConciergeAssignment({ passId, userId, role }: AssignmentInput) {
  const payload = { pass_id: passId, user_id: userId, role }
  const res = await serviceRoleFetch("/rest/v1/concierge_pass_assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    throw new Error(text)
  }
  revalidatePath("/admin/assignments")
  revalidatePath("/admin/create")
  return { ok: true }
}

export async function removeConciergeAssignment(id: string) {
  const res = await serviceRoleFetch(`/rest/v1/concierge_pass_assignments?id=eq.${id}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    throw new Error(text)
  }
  revalidatePath("/admin/assignments")
  revalidatePath("/admin/create")
  return { ok: true }
}
