"use server"

import { Buffer } from "node:buffer"
import { getSupabaseServer } from "@/lib/supabase/server"
import type { AccountFormState } from "./types"

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
  const phone = formData.get("phone")?.toString() ?? ""
  const title = formData.get("title")?.toString() ?? ""

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName || null,
      phone: phone || null,
      job_title: title || null,
    },
  })

  if (error) {
    return { status: "error", message: error.message }
  }

  return { status: "success", message: "Profile updated" }
}
