"use server"

import { Buffer } from "node:buffer"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseServer } from "@/lib/supabase/server"
import { sendPasswordChangedEmail } from "@/emails"
import type { AccountFormState } from "./types"

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")

export async function updateMemberProfileAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: "error", message: "Not signed in" }
  }

  const fullName = formData.get("fullName")?.toString() ?? ""
  const phone = formData.get("phone")?.toString() ?? ""
  const dietaryNotes = formData.get("dietaryNotes")?.toString() ?? ""
  const loungePreferences = formData.get("loungePreferences")?.toString() ?? ""
  const contactPreference = formData.get("contactPreference")?.toString() ?? ""
  const cardNickname = formData.get("cardNickname")?.toString() ?? ""
  const cardLast4 = formData.get("cardLast4")?.toString().slice(-4) ?? ""
  const currentAvatarPath = formData.get("currentAvatarPath")?.toString() || null
  const avatarFile = formData.get("avatar")

  let avatarPath = currentAvatarPath

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const extension = avatarFile.name.split(".").pop() ?? "jpg"
    const fileName = `avatar-${user.id}-${Date.now()}.${extension}`
    const storagePath = `${user.id}/${fileName}`
    const arrayBuffer = await avatarFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(storagePath, buffer, {
        contentType: avatarFile.type || "image/jpeg",
        upsert: true,
      })

    if (uploadError) {
      return { status: "error", message: "Failed to upload photo" }
    }

    avatarPath = storagePath
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName || null,
      phone: phone || null,
      dietary_notes: dietaryNotes || null,
      lounge_preferences: loungePreferences || null,
      contact_preference: contactPreference || null,
      card_nickname: cardNickname || null,
      card_last4: cardLast4 || null,
      avatar_url: avatarPath,
    },
  })

  if (error) {
    return { status: "error", message: error.message }
  }

  return { status: "success", message: "Profile updated" }
}

export async function updateStaffProfileAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: "error", message: "Not signed in" }
  }

  const fullName = formData.get("fullName")?.toString() ?? ""
  const phoneInput = formData.get("phone")?.toString() ?? ""
  const title = formData.get("title")?.toString() ?? ""
  const whatsappOptIn = formData.get("whatsappOptIn") === "on"

  const normalizedPhone = phoneInput.trim().replace(/\s+/g, "")

  if (whatsappOptIn && !normalizedPhone) {
    return { status: "error", message: "Add a mobile number to enable WhatsApp alerts." }
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName || null,
      phone: normalizedPhone || null,
      job_title: title || null,
      whatsapp_opt_in: whatsappOptIn,
      whatsapp_phone: normalizedPhone || null,
    },
  })

  if (error) {
    return { status: "error", message: error.message }
  }

  return { status: "success", message: "Profile updated" }
}

export async function changePasswordAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { status: "error", message: "Not signed in" }
  }

  const currentPassword = formData.get("currentPassword")?.toString() ?? ""
  const newPassword = formData.get("newPassword")?.toString() ?? ""
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? ""

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { status: "error", message: "All fields are required." }
  }

  if (newPassword.length < 8) {
    return { status: "error", message: "Password must be at least 8 characters." }
  }

  if (newPassword !== confirmPassword) {
    return { status: "error", message: "New passwords do not match." }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return { status: "error", message: "Supabase is not configured." }
  }

  const verifier = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (verifyError) {
    return { status: "error", message: "Current password is incorrect." }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { status: "error", message: updateError.message }
  }

  await sendPasswordChangedEmail({
    recipient: { email: user.email, name: (user.user_metadata?.full_name as string | undefined) ?? null },
    supportUrl: `${SITE_URL}/support`,
  })

  return { status: "success", message: "Password updated" }
}
