"use server"

import { getSupabaseServer } from "@/lib/supabase/server"
import { sendPasswordChangedEmail } from "@/emails"
import type { AccountFormState } from "@/app/account/types"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")

export async function resetPasswordAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { status: "error", message: "You need to sign in again from the reset link." }
  }

  const newPassword = formData.get("newPassword")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  if (!newPassword || !confirmPassword) {
    return { status: "error", message: "Enter and confirm your new password." }
  }

  if (newPassword.length < 8) {
    return { status: "error", message: "Password must be at least 8 characters." }
  }

  if (newPassword !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { status: "error", message: error.message }
  }

  await sendPasswordChangedEmail({
    recipient: { email: user.email, name: (user.user_metadata?.full_name as string | undefined) ?? null },
    supportUrl: `${SITE_URL}/support`,
  })

  return { status: "success", message: "Password updated." }
}
