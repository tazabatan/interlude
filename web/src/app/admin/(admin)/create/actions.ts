"use server"

import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { fetchAdminVenueRowById, fetchAdminPassRowById } from "./data"
import { mapVenueRowToRecord, mapPassRowToRecord, buildVenueProfileFromState, buildPassProfileFromState } from "./serialization"
import type { VenueFormState, PassFormState, ImageAsset, VenueStatus } from "./types"

type SerializableImageInput = {
  id: string
  name: string
  storagePath: string | null
  uploadKey?: string | null
}

type SerializedVenueFormState = Omit<VenueFormState, "heroImage" | "galleryImages"> & {
  heroImage: SerializableImageInput | null
  galleryImages: SerializableImageInput[]
}

type VenueSubmitPayload = {
  venueId?: string | null
  formState: SerializedVenueFormState
}

type SerializedPassFormState = Omit<PassFormState, "heroImage"> & {
  heroImage: SerializableImageInput | null
}

type PassSubmitPayload = {
  passId?: string | null
  venueId: string
  formState: SerializedPassFormState
}

const STORAGE_BUCKET = "venue-media"

const normalizeFileName = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9.-]+/g, "-") || "asset"
}

const dollarsToCents = (value: string): number | null => {
  if (!value) return null
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""))
  if (Number.isNaN(numeric)) return null
  return Math.round(numeric * 100)
}

const parseIntOr = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return parsed
}

const clamp = (value: number, min: number, max?: number) => {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (typeof max === "number" && value > max) return max
  return value
}

const toImageAsset = (descriptor: SerializableImageInput | null): ImageAsset | null => {
  if (!descriptor) return null
  return {
    id: descriptor.id,
    name: descriptor.name,
    url: descriptor.storagePath ? "" : "",
    storagePath: descriptor.storagePath ?? null,
  }
}

async function uploadImageIfNeeded(
  descriptor: SerializableImageInput | null,
  formData: FormData,
  buildPath: (fileName: string) => string,
  supabase: ReturnType<typeof getSupabaseAdminClient>
): Promise<SerializableImageInput | null> {
  if (!descriptor) return null
  const uploadKey = descriptor.uploadKey
  if (!uploadKey) {
    return {
      id: descriptor.id,
      name: descriptor.name,
      storagePath: descriptor.storagePath ?? null,
    }
  }
  const file = formData.get(uploadKey)
  if (!(file instanceof File) || file.size === 0) {
    return {
      id: descriptor.id,
      name: descriptor.name,
      storagePath: descriptor.storagePath ?? null,
    }
  }
  const targetPath = `${buildPath(normalizeFileName(file.name))}-${Date.now()}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(targetPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })
  if (error) {
    throw new Error(error.message)
  }
  return {
    id: descriptor.id,
    name: descriptor.name || file.name,
    storagePath: targetPath,
  }
}

const buildVenueHeroPath = (venueId: string) => (fileName: string) => `venues/${venueId}/hero/${fileName}`
const buildVenueGalleryPath = (venueId: string, imageId: string) => (fileName: string) =>
  `venues/${venueId}/gallery/${imageId}/${fileName}`
const buildPassHeroPath = (passId: string) => (fileName: string) => `passes/${passId}/hero/${fileName}`

const ensureHeroStoragePath = (descriptor: SerializableImageInput | null, label: string) => {
  if (!descriptor?.storagePath) {
    throw new Error(`${label} hero image missing storage path`)
  }
}

export async function saveVenueAction(formData: FormData) {
  try {
    const payloadRaw = formData.get("payload")?.toString()
    if (!payloadRaw) {
      return { ok: false, message: "Missing venue payload" } as const
    }
    const payload = JSON.parse(payloadRaw) as VenueSubmitPayload
    const supabase = getSupabaseAdminClient() as ReturnType<typeof getSupabaseAdminClient> & { from: any }
    const venueId = payload.venueId?.trim() || randomUUID()

    const heroDescriptor = await uploadImageIfNeeded(
      payload.formState.heroImage,
      formData,
      buildVenueHeroPath(venueId),
      supabase
    )
    ensureHeroStoragePath(heroDescriptor, "Venue")
    const galleryDescriptors = await Promise.all(
      (payload.formState.galleryImages ?? []).map((image) =>
        uploadImageIfNeeded(image, formData, buildVenueGalleryPath(venueId, image.id), supabase)
      )
    )

    const galleryAssets = galleryDescriptors
      .map((descriptor) => {
        if (!descriptor?.storagePath) return null
        return toImageAsset(descriptor)
      })
      .filter((asset): asset is ImageAsset => Boolean(asset))

    const rest = { ...payload.formState }
    delete (rest as Partial<VenueFormState>).heroImage
    delete (rest as Partial<VenueFormState>).galleryImages
    const normalizedState: VenueFormState = {
      ...(rest as Omit<VenueFormState, "heroImage" | "galleryImages">),
      heroImage: toImageAsset(heroDescriptor),
      galleryImages: galleryAssets,
    }

    const profile = buildVenueProfileFromState(normalizedState)
    type UpsertVenueProfile = ReturnType<typeof buildVenueProfileFromState>
    type UpsertVenueRow = {
      id: string
      name: string
      tz: string
      status: VenueStatus
      profile: UpsertVenueProfile
    }
    const upsertPayload: UpsertVenueRow = {
      id: venueId,
      name: normalizedState.displayName || normalizedState.internalName || "Venue",
      tz: normalizedState.timezone || "America/Anguilla",
      status: normalizedState.status,
      profile,
    }

    const { error } = await supabase.from("venues").upsert(upsertPayload, { onConflict: "id" })

    if (error) {
      return { ok: false, message: error.message } as const
    }

    const row = await fetchAdminVenueRowById(venueId)
    if (!row) {
      return { ok: false, message: "Failed to load saved venue" } as const
    }

    revalidatePath("/admin/create")
    return { ok: true, venue: mapVenueRowToRecord(row) } as const
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while saving venue"
    return { ok: false, message } as const
  }
}

export async function savePassAction(formData: FormData) {
  try {
    const payloadRaw = formData.get("payload")?.toString()
    if (!payloadRaw) {
      return { ok: false, message: "Missing pass payload" } as const
    }
    const payload = JSON.parse(payloadRaw) as PassSubmitPayload
    if (!payload.venueId) {
      return { ok: false, message: "Pass payload missing venueId" } as const
    }
    const passId = payload.passId?.trim() || randomUUID()
    const supabase = getSupabaseAdminClient() as ReturnType<typeof getSupabaseAdminClient> & { from: any }

    const heroDescriptor = await uploadImageIfNeeded(
      payload.formState.heroImage,
      formData,
      buildPassHeroPath(passId),
      supabase
    )
    ensureHeroStoragePath(heroDescriptor, "Pass")

    const rest = { ...payload.formState }
    delete (rest as Partial<PassFormState>).heroImage
    const normalizedState: PassFormState = {
      ...(rest as Omit<PassFormState, "heroImage">),
      heroImage: toImageAsset(heroDescriptor),
    }

    const backendKind = normalizedState.economicsType === "prepaid_credit" ? "DAY_PASS" : "MIN_SPEND"
    const minSpendAmountCents =
      normalizedState.economicsType === "min_spend" ? dollarsToCents(normalizedState.minSpendAmount) : null
    const prepaidCreditCents =
      normalizedState.economicsType === "prepaid_credit" ? dollarsToCents(normalizedState.prepaidCreditAmount) : null
    const arrivalDurationMinutes = clamp(parseIntOr(normalizedState.arrivalDuration, 60), 30)
    const defaultDailyCap = Math.max(0, parseIntOr(normalizedState.defaultDailyCap, 0))
    const graceMinutes = Math.max(0, parseIntOr(normalizedState.graceMinutes, 30))
    const noShowHoldCents = dollarsToCents(normalizedState.noShowHoldAmount) ?? 0
    const cancellationWindowDays = Math.max(0, parseIntOr(normalizedState.cancellationWindowDays, 2))
    const cancellationCutoff = normalizedState.cancellationWindowTime || "12:00"
    const explicitDisplay = normalizedState.displayPriceText.trim()
    const autoDisplay =
      !explicitDisplay && typeof prepaidCreditCents === "number"
        ? `Credit ${normalizedState.currency} ${Math.round(prepaidCreditCents / 100)}`
        : ""
    const displayPriceText = (explicitDisplay || autoDisplay || "").trim() || null
    const interludePerk = normalizedState.interludePerk.trim() || null

    const profile = buildPassProfileFromState(normalizedState)
    type UpsertPassProfile = ReturnType<typeof buildPassProfileFromState>
    type UpsertPassRow = {
      id: string
      venue_id: string
      kind: string
      status: PassFormState["status"]
      currency: string
      min_spend_amount: number | null
      display_price_text: string | null
      interlude_perk: string | null
      visibility: PassFormState["visibility"]
      auto_approve_enabled: boolean
      default_arrival_start_local: string | null
      default_arrival_window_minutes: number
      service_hours_open_local: string | null
      service_hours_close_local: string | null
      arrival_grace_minutes: number
      default_daily_cap: number
      no_show_amount_per_person: number
      cancellation_window_days: number
      cancellation_cutoff_local: string
      profile: UpsertPassProfile
    }

    const passPayload: UpsertPassRow = {
      id: passId,
      venue_id: payload.venueId,
      kind: backendKind,
      status: normalizedState.status,
      currency: normalizedState.currency,
      min_spend_amount: minSpendAmountCents,
      display_price_text: displayPriceText,
      interlude_perk: interludePerk,
      visibility: normalizedState.visibility,
      auto_approve_enabled: normalizedState.autoApprove,
      default_arrival_start_local: normalizedState.arrivalStart,
      default_arrival_window_minutes: arrivalDurationMinutes,
      service_hours_open_local: normalizedState.serviceOpen,
      service_hours_close_local: normalizedState.serviceClose,
      arrival_grace_minutes: graceMinutes,
      default_daily_cap: defaultDailyCap,
      no_show_amount_per_person: noShowHoldCents,
      cancellation_window_days: cancellationWindowDays,
      cancellation_cutoff_local: cancellationCutoff,
      profile,
    }

    const { error } = await supabase.from("passes").upsert(passPayload, { onConflict: "id" })

    if (error) {
      return { ok: false, message: error.message } as const
    }

    const row = await fetchAdminPassRowById(passId)
    if (!row) {
      return { ok: false, message: "Failed to load saved pass" } as const
    }

    revalidatePath("/admin/create")
    return { ok: true, venueId: payload.venueId, pass: mapPassRowToRecord(row) } as const
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while saving pass"
    return { ok: false, message } as const
  }
}
