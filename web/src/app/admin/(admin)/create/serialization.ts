import { VenueRecord, VenueFormState, PassRecord, PassEconomicsType, VenueStatus, ImageAsset, PassFormState } from "./types"
import { createEmptyVenueFormState } from "./state"
export type { VenueRecord, PassRecord } from "./types"

type StoredImageAsset = {
  id: string
  name: string
  storagePath: string | null
  url?: string | null
}

export type VenueProfilePayload = Omit<VenueFormState, "status" | "heroImage" | "galleryImages"> & {
  heroImage: StoredImageAsset | null
  galleryImages: StoredImageAsset[]
}

export type PassProfilePayload = {
  displayName: string
  presentationKind: PassFormState["kind"]
  shortDescription: string
  economicsType: PassEconomicsType
  heroImage: StoredImageAsset | null
  prepaidCreditAmountCents?: number | null
}

export type PassRow = {
  id: string
  venue_id: string
  created_at: string | null
  kind: string | null
  status: string | null
  currency: string | null
  min_spend_amount: number | null
  display_price_text: string | null
  interlude_perk: string | null
  visibility: string | null
  auto_approve_enabled: boolean
  default_arrival_start_local: string | null
  default_arrival_window_minutes: number | null
  service_hours_open_local: string | null
  service_hours_close_local: string | null
  arrival_grace_minutes: number | null
  default_daily_cap: number | null
  no_show_amount_per_person: number | null
  cancellation_window_days: number | null
  cancellation_cutoff_local: string | null
  profile: PassProfilePayload | null
}

export type VenueRow = {
  id: string
  name: string | null
  tz: string | null
  status: string | null
  created_at: string | null
  profile: VenueProfilePayload | null
  passes?: PassRow[]
}

const STORAGE_BUCKET = "venue-media"

const coerceVenueStatus = (value: string | null | undefined): VenueStatus => {
  if (value === "active" || value === "paused" || value === "draft") return value
  return "draft"
}

const coercePassStatus = (value: string | null | undefined): "draft" | "active" | "paused" => {
  if (value === "active" || value === "paused" || value === "draft") return value
  return "draft"
}

const fallback = <T>(value: T | null | undefined, defaultValue: T): T => {
  return value === null || value === undefined ? defaultValue : value
}

const getSupabaseUrl = () => {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321").replace(/\/$/, "")
}

const resolveStorageUrl = (storagePath?: string | null) => {
  if (!storagePath) return ""
  const cleanPath = storagePath.replace(/^\/+/, "")
  return `${getSupabaseUrl()}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`
}

const mapStoredImageToAsset = (image: StoredImageAsset | null): ImageAsset | null => {
  if (!image) return null
  const url = image.storagePath ? resolveStorageUrl(image.storagePath) : image.url ?? ""
  return {
    id: image.id,
    name: image.name,
    storagePath: image.storagePath ?? null,
    url,
  }
}

const mapStoredGallery = (images: StoredImageAsset[] | null | undefined): ImageAsset[] => {
  if (!images) return []
  return images
    .map((entry) => mapStoredImageToAsset(entry))
    .filter((candidate): candidate is ImageAsset => Boolean(candidate))
}

export function mapPassRowToRecord(row: PassRow): PassRecord {
  const profile = row.profile ?? null
  const economicsType = profile?.economicsType ?? "min_spend"
  const heroImage = mapStoredImageToAsset(profile?.heroImage ?? null)
  const presentationKind = profile?.presentationKind ?? "BEACH_PASS"
  const shortDescription = profile?.shortDescription ?? ""
  const prepaidCreditCents = profile?.prepaidCreditAmountCents ?? null
  const displayName = profile?.displayName ?? row.kind ?? "Pass"

  return {
    id: row.id,
    venueId: row.venue_id,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.created_at ?? new Date().toISOString(),
    status: coercePassStatus(row.status),
    name: displayName,
    kind: presentationKind,
    shortDescription,
    economicsType,
    interludePerk: row.interlude_perk ?? "",
    minSpendAmountCents: row.min_spend_amount,
    prepaidCreditCents,
    currency: row.currency ?? "USD",
    displayPriceText: row.display_price_text ?? "",
    heroImage,
    autoApprove: row.auto_approve_enabled,
    serviceOpen: row.service_hours_open_local ?? "09:00",
    serviceClose: row.service_hours_close_local ?? "18:00",
    arrivalStart: row.default_arrival_start_local ?? "10:00",
    arrivalDurationMinutes: row.default_arrival_window_minutes ?? 120,
    visibility: (row.visibility as PassRecord["visibility"]) ?? "members",
    defaultDailyCap: row.default_daily_cap ?? 10,
    graceMinutes: row.arrival_grace_minutes ?? 30,
    noShowHoldAmountCents: row.no_show_amount_per_person ?? null,
    cancellationWindowDays: row.cancellation_window_days ?? 2,
    cancellationWindowTime: row.cancellation_cutoff_local ?? "12:00",
  }
}

export function mapVenueRowToRecord(row: VenueRow): VenueRecord {
  const base = createEmptyVenueFormState()
  const profile = row.profile ?? null

  const merged: VenueFormState = {
    ...base,
    status: coerceVenueStatus(row.status),
    displayName: fallback(profile?.displayName, row.name ?? base.displayName),
    internalName: fallback(profile?.internalName, row.name ?? base.internalName),
    shortDescription: fallback(profile?.shortDescription, base.shortDescription),
    address: profile?.address ?? base.address,
    timezone: row.tz ?? profile?.timezone ?? base.timezone,
    primaryContact: profile?.primaryContact ?? base.primaryContact,
    inviteManager: profile?.inviteManager ?? base.inviteManager,
    website: profile?.website ?? base.website,
    termsLink: profile?.termsLink ?? base.termsLink,
    privacyLink: profile?.privacyLink ?? base.privacyLink,
    stripeAccountId: profile?.stripeAccountId ?? base.stripeAccountId,
    currency: profile?.currency ?? base.currency,
    taxJurisdiction: profile?.taxJurisdiction ?? base.taxJurisdiction,
    taxPercentage: profile?.taxPercentage ?? base.taxPercentage,
    taxBehavior: profile?.taxBehavior ?? base.taxBehavior,
    revenueShare: profile?.revenueShare ?? base.revenueShare,
    openingHours: profile?.openingHours ?? base.openingHours,
    blackouts: profile?.blackouts ?? base.blackouts,
    heroImage: mapStoredImageToAsset(profile?.heroImage ?? null),
    galleryImages: mapStoredGallery(profile?.galleryImages ?? []),
  }

  return {
    ...merged,
    id: row.id,
    createdAt: row.created_at ?? new Date().toISOString(),
    passes: (row.passes ?? []).map(mapPassRowToRecord),
  }
}

export function buildVenueProfileFromState(state: VenueFormState): VenueProfilePayload {
  const { heroImage, galleryImages } = state
  const rest = { ...state }
  delete (rest as Partial<VenueFormState>).status
  delete (rest as Partial<VenueFormState>).heroImage
  delete (rest as Partial<VenueFormState>).galleryImages
  return {
    ...(rest as Omit<VenueFormState, "status" | "heroImage" | "galleryImages">),
    heroImage: heroImage
      ? {
          id: heroImage.id,
          name: heroImage.name,
          storagePath: heroImage.storagePath ?? null,
        }
      : null,
    galleryImages: galleryImages.map((image) => ({
      id: image.id,
      name: image.name,
      storagePath: image.storagePath ?? null,
    })),
  }
}

export function buildPassProfileFromState(state: PassFormState): PassProfilePayload {
  return {
    displayName: state.name,
    presentationKind: state.kind,
    shortDescription: state.shortDescription,
    economicsType: state.economicsType,
    heroImage: state.heroImage
      ? {
          id: state.heroImage.id,
          name: state.heroImage.name,
          storagePath: state.heroImage.storagePath ?? null,
        }
      : null,
    prepaidCreditAmountCents:
      state.economicsType === "prepaid_credit" ? Math.round((Number.parseFloat(state.prepaidCreditAmount) || 0) * 100) : null,
  }
}
