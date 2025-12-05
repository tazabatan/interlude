"use client"

import { Dispatch, SetStateAction, useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import clsx from "clsx"
import PassCard from "@/components/pass-card"
import type { PassCardStatus } from "@/components/pass-card"
import {
  DAY_CONFIG,
  VenueStatus,
  VenueFormState,
  PassFormState,
  PassEconomicsType,
  ImageAsset,
  DayKey,
  BlackoutRange,
  VenueRecord,
  PassRecord,
  OpeningHours,
} from "./types"
import { createEmptyVenueFormState, createEmptyPassFormState } from "./state"
import { saveVenueAction, savePassAction } from "./actions"

const STATUS_OPTIONS: { value: VenueStatus; label: string; caption: string }[] = [
  { value: "draft", label: "Draft", caption: "Keep internal until ready" },
  { value: "active", label: "Active", caption: "Visible to desk + members" },
  { value: "paused", label: "Paused", caption: "Temporarily hidden" },
]

const PASS_STATUS_OPTIONS: { value: PassCardStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
]

const PASS_KIND_OPTIONS = [
  { value: "BEACH_PASS", label: "Beach Club Pass" },
  { value: "POOL_PASS", label: "Pool Pass" },
  { value: "GYM_PASS", label: "Gym Pass" },
  { value: "SPA_PASS", label: "Spa Pass" },
] as const

const PASS_ECONOMICS_OPTIONS: { value: PassEconomicsType; label: string; caption: string }[] = [
  { value: "min_spend", label: "Min spend", caption: "Guest pays on arrival" },
  { value: "prepaid_credit", label: "Prepaid credit", caption: "Paid upfront to Interlude" },
]

const PASS_VISIBILITY_OPTIONS = [
  { value: "members", label: "Members only" },
  { value: "guest_only", label: "Guests only" },
  { value: "both", label: "Members & guests" },
] as const

const TIMEZONE_IDS = [
  "America/Anguilla",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
 "Europe/Berlin",
] as const

const formatTimezoneOffset = (timeZone: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
    const parts = formatter.formatToParts(new Date())
    const zoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? ""
    return zoneName.replace("GMT", "UTC")
  } catch {
    return "UTC"
  }
}

const formatTimezoneLabel = (timeZone: string) => {
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone
  const offset = formatTimezoneOffset(timeZone)
  return `${city} (${offset})`
}

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"]

const INPUT_CLASSES =
  "mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332F] placeholder:text-[#6F716D] focus:outline-none focus:ring-2 focus:ring-[#02374D]"
const LABEL_CLASSES = "block text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]"

type BuilderOverlayProps = {
  formState: VenueFormState
  setFormState: Dispatch<SetStateAction<VenueFormState>>
  onClose: () => void
  onPublish: () => void
  formError: string | null
  onFormInteraction: () => void
  isEditing: boolean
  isSubmitting: boolean
}

type PassBuilderOverlayProps = {
  formState: PassFormState
  setFormState: Dispatch<SetStateAction<PassFormState>>
  onClose: () => void
  onPublish: () => void
  formError: string | null
  onFormInteraction: () => void
  isEditing: boolean
  venueName: string
  isSubmitting: boolean
}

type SerializedImagePayload = {
  id: string
  name: string
  storagePath: string | null
  uploadKey?: string
}

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 11)
}

const sortByCreatedAt = <T extends { createdAt: string }>(items: T[]) => {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

const serializeImageForUpload = (image: ImageAsset | null, formData: FormData, fieldKey: string): SerializedImagePayload | null => {
  if (!image) return null
  let uploadKey: string | undefined
  if (image.file instanceof File && image.file.size > 0) {
    uploadKey = `${fieldKey}-${image.id}`
    formData.append(uploadKey, image.file)
  }
  return {
    id: image.id,
    name: image.name,
    storagePath: image.storagePath ?? null,
    ...(uploadKey ? { uploadKey } : {}),
  }
}

const buildVenueFormData = (state: VenueFormState, venueId: string | null) => {
  const formData = new FormData()
  const heroPayload = serializeImageForUpload(state.heroImage, formData, "venue-hero")
  const galleryPayloads = state.galleryImages
    .map((image, index) => serializeImageForUpload(image, formData, `venue-gallery-${index}`))
    .filter((entry): entry is SerializedImagePayload => Boolean(entry))
  const rest = { ...state }
  delete (rest as Partial<VenueFormState>).heroImage
  delete (rest as Partial<VenueFormState>).galleryImages
  const payload = {
    venueId,
    formState: {
      ...(rest as Omit<VenueFormState, "heroImage" | "galleryImages">),
      heroImage: heroPayload,
      galleryImages: galleryPayloads,
    },
  }
  formData.append("payload", JSON.stringify(payload))
  return formData
}

const buildPassFormData = (state: PassFormState, passId: string | null, venueId: string) => {
  const formData = new FormData()
  const heroPayload = serializeImageForUpload(state.heroImage, formData, "pass-hero")
  const rest = { ...state }
  delete (rest as Partial<PassFormState>).heroImage
  const payload = {
    passId,
    venueId,
    formState: {
      ...(rest as Omit<PassFormState, "heroImage">),
      heroImage: heroPayload,
    },
  }
  formData.append("payload", JSON.stringify(payload))
  return formData
}

const cloneFormState = (state: VenueFormState): VenueFormState => ({
  heroImage: state.heroImage ? { ...state.heroImage, file: null } : null,
  galleryImages: state.galleryImages.map((image) => ({ ...image, file: null })),
  displayName: state.displayName,
  internalName: state.internalName,
  shortDescription: state.shortDescription,
  status: state.status,
  address: { ...state.address },
  timezone: state.timezone,
  primaryContact: { ...state.primaryContact },
  inviteManager: { ...state.inviteManager },
  website: state.website,
  termsLink: state.termsLink,
  privacyLink: state.privacyLink,
  stripeAccountId: state.stripeAccountId,
  currency: state.currency,
  taxJurisdiction: state.taxJurisdiction,
  taxPercentage: state.taxPercentage,
  taxBehavior: state.taxBehavior,
  revenueShare: { ...state.revenueShare },
  openingHours: Object.fromEntries(
    Object.entries(state.openingHours).map(([day, details]) => [day as DayKey, { ...details }])
  ) as Record<DayKey, OpeningHours>,
  blackouts: state.blackouts.map((range) => ({ ...range })),
})

const clonePassToFormState = (record: PassRecord): PassFormState => ({
  status: record.status,
  name: record.name,
  kind: record.kind,
  shortDescription: record.shortDescription,
  interludePerk: record.interludePerk || "",
  economicsType: record.economicsType,
  minSpendAmount:
    typeof record.minSpendAmountCents === "number" ? String(Math.max(0, record.minSpendAmountCents) / 100) : "",
  prepaidCreditAmount:
    typeof record.prepaidCreditCents === "number" ? String(Math.max(0, record.prepaidCreditCents) / 100) : "",
  currency: record.currency,
  displayPriceText: record.displayPriceText,
  heroImage: record.heroImage ? { ...record.heroImage, file: null } : null,
  autoApprove: record.autoApprove,
  serviceOpen: record.serviceOpen,
  serviceClose: record.serviceClose,
  arrivalStart: record.arrivalStart,
  arrivalDuration: String(record.arrivalDurationMinutes),
  visibility: record.visibility ?? "members",
  defaultDailyCap: String(record.defaultDailyCap ?? 0),
  graceMinutes: String(record.graceMinutes ?? 0),
  noShowHoldAmount: centsToInputString(record.noShowHoldAmountCents ?? null),
  cancellationWindowDays: String(record.cancellationWindowDays ?? 0),
  cancellationWindowTime: record.cancellationWindowTime ?? "12:00",
})

const validateForm = (state: VenueFormState) => {
  if (!state.displayName.trim()) return "Display name is required."
  if (!state.shortDescription.trim()) return "Short description is required."
  if (state.shortDescription.length > 200) return "Short description must stay within 200 characters."
  if (!state.heroImage) return "Please upload a hero image."
  if (!state.primaryContact.email.trim()) return "Primary contact email is required."
  return null
}

const validatePassForm = (state: PassFormState) => {
  if (!state.name.trim()) return "Pass name is required."
  if (!state.shortDescription.trim()) return "Add a short description."
  if (state.shortDescription.length > 200) return "Description must stay within 200 characters."
  if (state.economicsType === "min_spend" && !state.minSpendAmount.trim()) return "Enter a min spend amount."
  if (state.economicsType === "prepaid_credit" && !state.prepaidCreditAmount.trim())
    return "Enter a prepaid credit amount."
  if (!state.heroImage) return "Please upload a hero image for this pass."
  return null
}

const centsToInputString = (value: number | null) => {
  if (typeof value !== "number") return ""
  return String(value / 100)
}

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

type AdminVenueExperienceProps = {
  initialVenues: VenueRecord[]
}

type TeamMember = {
  id: string
  email: string
  raw_user_meta_data: {
    full_name?: string
    name?: string
    app_role?: string
    venue_id?: string
  }
}

export default function AdminVenueExperience({ initialVenues }: AdminVenueExperienceProps) {
  const [venues, setVenues] = useState<VenueRecord[]>(() => initialVenues ?? [])
  const [isBuilderOpen, setBuilderOpen] = useState(false)
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null)
  const [formState, setFormState] = useState<VenueFormState>(() => createEmptyVenueFormState())
  const [formError, setFormError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"venues" | "passes">("venues")
  const [activeVenueId, setActiveVenueId] = useState<string | null>(null)
  const [isPassBuilderOpen, setPassBuilderOpen] = useState(false)
  const [passFormState, setPassFormState] = useState<PassFormState>(() => createEmptyPassFormState())
  const [passFormError, setPassFormError] = useState<string | null>(null)
  const [editingPassId, setEditingPassId] = useState<string | null>(null)
  const [isSavingVenue, setIsSavingVenue] = useState(false)
  const [isSavingPass, setIsSavingPass] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [venueSearchQuery, setVenueSearchQuery] = useState('')

  const hasVenues = venues.length > 0
  const activeVenue = activeVenueId ? venues.find((venue) => venue.id === activeVenueId) : null
  const viewingPasses = activeView === "passes" && Boolean(activeVenue)

  // Filter venues based on search query
  const filteredVenues = venues.filter((venue) => {
    if (!venueSearchQuery.trim()) return true
    const query = venueSearchQuery.toLowerCase()
    const name = venue.displayName?.toLowerCase() || ''
    return name.includes(query)
  })

  // Fetch team members when viewing a venue
  useEffect(() => {
    if (!activeVenueId) {
      setTeamMembers([])
      return
    }

    async function fetchTeamMembers(venueId: string) {
      try {
        const res = await fetch(`/api/admin/team-members?venue_id=${venueId}`)
        if (!res.ok) return []
        const data = await res.json()
        return data.teamMembers || []
      } catch (error) {
        console.error('Error fetching team members:', error)
        return []
      }
    }

    fetchTeamMembers(activeVenueId).then(setTeamMembers)
  }, [activeVenueId])

  const openForCreate = () => {
    setEditingVenueId(null)
    setFormState(createEmptyVenueFormState())
    setBuilderOpen(true)
    setFormError(null)
  }

  const closeBuilder = () => {
    setBuilderOpen(false)
    setEditingVenueId(null)
    setFormState(createEmptyVenueFormState())
    setFormError(null)
    setIsSavingVenue(false)
  }

  const handlePublish = async () => {
    const error = validateForm(formState)
    if (error) {
      setFormError(error)
      return
    }
    if (isSavingVenue) return
    setFormError(null)
    setIsSavingVenue(true)
    try {
      const formData = buildVenueFormData(formState, editingVenueId)
      const result = await saveVenueAction(formData)
      if (!result.ok) {
        setFormError(result.message ?? "Failed to save venue")
        return
      }
      setVenues((prev) => {
        const exists = prev.some((venue) => venue.id === result.venue.id)
        if (exists) {
          return prev.map((venue) => (venue.id === result.venue.id ? result.venue : venue))
        }
        return sortByCreatedAt([...prev, result.venue])
      })
      closeBuilder()
    } catch (venueError) {
      const message = venueError instanceof Error ? venueError.message : "Failed to save venue"
      setFormError(message)
    } finally {
      setIsSavingVenue(false)
    }
  }

  const handleEdit = (venueId: string) => {
    const current = venues.find((venue) => venue.id === venueId)
    if (!current) return
    setFormState(cloneFormState(current))
    setEditingVenueId(venueId)
    setBuilderOpen(true)
    setFormError(null)
  }

  const handleViewPasses = (venueId: string) => {
    const nextVenue = venues.find((venue) => venue.id === venueId)
    setActiveVenueId(venueId)
    setActiveView("passes")
    setPassBuilderOpen(false)
    setEditingPassId(null)
    setPassFormError(null)
    setPassFormState(createEmptyPassFormState(nextVenue?.currency || "USD"))
  }

  const handleBackToVenues = () => {
    setActiveView("venues")
    setActiveVenueId(null)
    setPassBuilderOpen(false)
    setEditingPassId(null)
    setPassFormError(null)
  }

  const openPassBuilder = () => {
    if (!activeVenue) return
    setPassFormState(createEmptyPassFormState(activeVenue.currency || "USD"))
    setEditingPassId(null)
    setPassFormError(null)
    setPassBuilderOpen(true)
  }

  const closePassBuilder = () => {
    setPassBuilderOpen(false)
    setPassFormError(null)
    setEditingPassId(null)
    setPassFormState(createEmptyPassFormState(activeVenue?.currency || "USD"))
    setIsSavingPass(false)
  }

  const handlePassPublish = async () => {
    if (!activeVenue) return
    const error = validatePassForm(passFormState)
    if (error) {
      setPassFormError(error)
      return
    }
    if (isSavingPass) return
    setPassFormError(null)
    setIsSavingPass(true)
    try {
      const formData = buildPassFormData(passFormState, editingPassId, activeVenue.id)
      const result = await savePassAction(formData)
      if (!result.ok) {
        setPassFormError(result.message ?? "Failed to save pass")
        return
      }
      setVenues((prev) =>
        prev.map((venue) => {
          if (venue.id !== result.venueId) return venue
          const exists = venue.passes.some((pass) => pass.id === result.pass.id)
          const updatedPasses = exists
            ? venue.passes.map((pass) => (pass.id === result.pass.id ? result.pass : pass))
            : sortByCreatedAt([...venue.passes, result.pass])
          return { ...venue, passes: updatedPasses }
        })
      )
      closePassBuilder()
    } catch (passError) {
      const message = passError instanceof Error ? passError.message : "Failed to save pass"
      setPassFormError(message)
    } finally {
      setIsSavingPass(false)
    }
  }

  const handlePassEdit = (passId: string) => {
    if (!activeVenue) return
    const pass = activeVenue.passes.find((entry) => entry.id === passId)
    if (!pass) return
    setPassFormState(clonePassToFormState(pass))
    setEditingPassId(passId)
    setPassFormError(null)
    setPassBuilderOpen(true)
  }

  return (
    <div className="space-y-10 text-[#02374D]">
      {viewingPasses && activeVenue ? (
        <>
          <div className="mx-auto w-full max-w-5xl">
            <button
              type="button"
              onClick={handleBackToVenues}
              className="mb-6 w-fit rounded-full border border-[#6F716D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D] transition hover:bg-[#F4F1E7]"
            >
              ← Venues
            </button>
          </div>

          <header className="relative mx-auto w-full max-w-5xl py-8">
            <h1 className="text-center text-3xl font-medium uppercase tracking-[0.05em] text-black">Passes</h1>
            <button
              type="button"
              aria-label="Add pass"
              onClick={openPassBuilder}
              className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#DBD8C9] text-black transition hover:bg-[#d0ccba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#02374D]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          {activeVenue.passes.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-[#DAD7C7] bg-[#F5F0E3] px-8 py-16 text-center text-sm text-[#4F514D]">
              No passes yet. Click the plus icon to design the first pass for {activeVenue.displayName || "this venue"}.
            </div>
          ) : (
            <section className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {activeVenue.passes.map((pass) => (
                  <div key={pass.id} className="space-y-3">
                    <PassCard
                      passId={pass.id}
                      name={pass.name}
                      location={activeVenue.address.city || activeVenue.address.country || "Anguilla"}
                      kind={pass.kind}
                      displayPriceText={pass.displayPriceText}
                      minSpendAmount={pass.minSpendAmountCents ?? pass.prepaidCreditCents ?? null}
                      currency={pass.currency}
                      href={`/admin/create?pass=${pass.id}`}
                      srLabel={`Edit ${pass.name}`}
                      showStatusBadge
                      status={pass.status}
                      imageUrl={pass.heroImage?.url}
                      onClick={() => handlePassEdit(pass.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Team Section */}
          <header className="relative mx-auto w-full max-w-5xl py-8 mt-16">
            <h1 className="text-center text-3xl font-medium uppercase tracking-[0.05em] text-black">Team</h1>
            <Link
              href="/admin"
              aria-label="Invite team member"
              className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#DBD8C9] text-black transition hover:bg-[#d0ccba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#02374D]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          </header>

          {teamMembers.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-[#DAD7C7] bg-[#F5F0E3] px-8 py-16 text-center text-sm text-[#4F514D]">
              No team members yet for this venue. Use the invite button to add team members.
            </div>
          ) : (
            <section className="space-y-6">
              <div className="flex flex-wrap justify-center gap-6">
                {teamMembers.map((member) => {
                  const displayName =
                    member.raw_user_meta_data?.full_name ||
                    member.raw_user_meta_data?.name ||
                    member.email.split('@')[0]
                  const role = member.raw_user_meta_data?.app_role || 'staff'
                  const roleLabel =
                    role === 'venue_manager' ? 'Manager' : role === 'venue_staff' ? 'Staff' : role.replace('_', ' ')

                  // Generate initials for avatar
                  const initials = displayName
                    .split(/\s+/)
                    .map((word) => word[0]?.toUpperCase())
                    .slice(0, 2)
                    .join('')

                  return (
                    <div
                      key={member.id}
                      className="flex w-48 flex-col items-center rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 text-center shadow-[0px_4px_18px_rgba(0,0,0,0.08)]"
                    >
                      {/* Avatar */}
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#02374D] text-lg font-semibold text-white">
                        {initials}
                      </div>

                      {/* Name */}
                      <p className="mt-3 font-semibold text-[#02374D]">{displayName}</p>

                      {/* Role */}
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#6F716D]">{roleLabel}</p>

                      {/* Email */}
                      <p className="mt-2 text-xs text-[#4F514D]">{member.email}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="mx-auto w-full max-w-5xl">
            <button
              type="button"
              className="invisible mb-6 w-fit rounded-full border border-[#6F716D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              aria-hidden="true"
            >
              ← Venues
            </button>
          </div>

          <div className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <h1 className="text-3xl font-medium uppercase tracking-[0.05em] text-black">Venues</h1>
              <p className="text-xs uppercase tracking-[0.25em] text-[#6F716D]">Manage drafts & contacts</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <input
                type="text"
                placeholder="Search venues..."
                value={venueSearchQuery}
                onChange={(e) => setVenueSearchQuery(e.target.value)}
                className="w-full rounded-full border border-[#E8E4D7] bg-white px-5 py-2.5 text-sm text-[#02374D] placeholder:text-[#6F716D] focus:border-[#02374D] focus:outline-none focus:ring-2 focus:ring-[#02374D]/20 sm:w-64"
              />
              <button
                type="button"
                aria-label="Add venue"
                onClick={openForCreate}
                className="flex h-12 w-full items-center justify-center rounded-full bg-[#DBD8C9] text-black transition hover:bg-[#d0ccba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#02374D] sm:w-12"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {hasVenues ? (
            <section className="space-y-6">
              {filteredVenues.length === 0 ? (
                <div className="rounded-[32px] border border-dashed border-[#DAD7C7] bg-[#F5F0E3] px-8 py-16 text-center text-sm text-[#4F514D]">
                  No venues found matching &quot;{venueSearchQuery}&quot;
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredVenues.map((venue) => {
                  const city = venue.address.city?.trim()
                  const country = venue.address.country?.trim()
                  const locationLabel = city || country || undefined
                  const status: PassCardStatus = venue.status
                  return (
                    <div key={venue.id} className="space-y-3">
                      <PassCard
                        passId={venue.id}
                        name={venue.displayName}
                        location={locationLabel}
                        kind={null}
                        displayPriceText={venue.shortDescription || "Draft in progress"}
                        minSpendAmount={null}
                        currency={venue.currency}
                        href={`/admin/create?venue=${venue.id}`}
                        srLabel={`View draft for ${venue.displayName}`}
                        showStatusBadge
                        status={status}
                        imageUrl={venue.heroImage?.url}
                        pricePrefix=""
                        showSubtitle={false}
                        onClick={() => handleViewPasses(venue.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleEdit(venue.id)}
                        className="w-full rounded-full bg-[#02374D] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#012636]"
                      >
                        Edit profile
                      </button>
                    </div>
                  )
                })}
                </div>
              )}
            </section>
          ) : (
            <div className="rounded-[32px] border border-dashed border-[#DAD7C7] bg-[#F5F0E3] px-8 py-16 text-center text-sm text-[#4F514D]">
              Add your first hotel profile to unlock invitations and pass controls.
            </div>
          )}
        </>
      )}

      {isBuilderOpen && (
        <VenueBuilderOverlay
          formState={formState}
          setFormState={setFormState}
          onClose={closeBuilder}
          onPublish={handlePublish}
          formError={formError}
          onFormInteraction={() => setFormError(null)}
          isEditing={Boolean(editingVenueId)}
          isSubmitting={isSavingVenue}
        />
      )}

      {isPassBuilderOpen && activeVenue ? (
        <PassBuilderOverlay
          formState={passFormState}
          setFormState={setPassFormState}
          onClose={closePassBuilder}
          onPublish={handlePassPublish}
          formError={passFormError}
          onFormInteraction={() => setPassFormError(null)}
          isEditing={Boolean(editingPassId)}
          venueName={activeVenue.displayName || "Venue"}
          isSubmitting={isSavingPass}
        />
      ) : null}
    </div>
  )
}

function VenueBuilderOverlay({
  formState,
  setFormState,
  onClose,
  onPublish,
  formError,
  onFormInteraction,
  isEditing,
  isSubmitting,
}: BuilderOverlayProps) {
  const shortDescriptionCount = formState.shortDescription.length

  const statusButtons = STATUS_OPTIONS.map((option) => (
    <button
      type="button"
      key={option.value}
      onClick={() => {
        onFormInteraction()
        setFormState((prev) => ({ ...prev, status: option.value }))
      }}
      className={clsx(
        "flex flex-col rounded-[24px] border px-4 py-3 text-left text-sm transition",
        formState.status === option.value
          ? "border-[#02374D] bg-[#02374D] text-white"
          : "border-[#E8E4D7] bg-[#F5F0E3] hover:border-[#02374D]/60"
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.label}</span>
      <span className="text-[0.7rem] text-[#D4CEC0]">{option.caption}</span>
    </button>
  ))

  const handleHeroImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file)
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      heroImage: {
        id: createId(),
        name: file.name,
        url,
        storagePath: null,
        file,
      },
    }))
    input.value = ""
  }

  const handleGalleryImagesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return
    const assets = await Promise.all(
      files.map(async (file) => ({
        id: createId(),
        name: file.name,
        url: await fileToDataUrl(file),
        storagePath: null,
        file,
      }))
    )
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      galleryImages: [...prev.galleryImages, ...assets],
    }))
    input.value = ""
  }

  const removeGalleryImage = (imageId: string) => {
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((image) => image.id !== imageId),
    }))
  }

  const updateOpeningHours = (day: DayKey, patch: Partial<OpeningHours>) => {
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          ...patch,
        },
      },
    }))
  }

  const addBlackout = () => {
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      blackouts: [
        ...prev.blackouts,
        {
          id: createId(),
          startDate: "",
          endDate: "",
          note: "",
        },
      ],
    }))
  }

  const updateBlackout = (rangeId: string, patch: Partial<BlackoutRange>) => {
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      blackouts: prev.blackouts.map((range) => (range.id === rangeId ? { ...range, ...patch } : range)),
    }))
  }

  const removeBlackout = (rangeId: string) => {
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      blackouts: prev.blackouts.filter((range) => range.id !== rangeId),
    }))
  }

  const heroImagePreview = formState.heroImage?.url ?? ""

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 px-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[40px] border border-[#E8E4D7] bg-[#FBF7ED] shadow-[0_30px_60px_rgba(0,0,0,0.25)]"
      >
        <header className="flex items-center justify-between border-b border-[#E8E4D7] px-8 py-6">
          <div>
            <h2 className="text-2xl uppercase tracking-[0.08em] text-black">{isEditing ? "Edit venue" : "Create venue"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DBD8C9] bg-[#F5F0E3] text-[#6F716D] transition hover:text-black"
            aria-label="Close venue builder"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
          <section className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Status</p>
              <div className="grid gap-4 sm:grid-cols-3">{statusButtons}</div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div>
                <div className="relative h-72 w-full overflow-hidden rounded-[32px] border border-dashed border-[#D1CCBD] bg-[#F5F0E3]">
                  {heroImagePreview ? (
                    <Image
                      src={heroImagePreview}
                      alt="Hero preview"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 800px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-[#6F716D]">
                      <span>Hero image</span>
                      <span className="text-xs uppercase tracking-[0.3em]">2400 × 1600</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <label className={LABEL_CLASSES}>
                  Hero image
                  <input type="file" accept="image/*" className="sr-only" onChange={handleHeroImageChange} />
                  <span className="mt-3 block rounded-full border border-[#02374D] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D]">
                    Upload hero
                  </span>
                </label>
                {formState.heroImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFormInteraction()
                      setFormState((prev) => ({ ...prev, heroImage: null }))
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4231F]"
                  >
                    Remove image
                  </button>
                ) : (
                  <p className="text-xs text-[#6F716D]">Single landscape image (JPG/PNG).</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <label className={LABEL_CLASSES}>
                Secondary images
                <input type="file" multiple accept="image/*" className="sr-only" onChange={handleGalleryImagesChange} />
                <span className="mt-3 block rounded-full border border-dashed border-[#6F716D] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                  Add gallery images
                </span>
              </label>
              {formState.galleryImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {formState.galleryImages.map((image) => (
                    <div key={image.id} className="relative h-32 overflow-hidden rounded-3xl border border-[#E8E4D7]">
                      <Image
                        src={image.url}
                        alt={image.name || "Gallery image"}
                        fill
                        className="object-cover"
                        sizes="160px"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(image.id)}
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
                        aria-label={`Remove ${image.name || "gallery image"}`}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">VENUE PROFILE</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Display name
                <input
                  type="text"
                  value={formState.displayName}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, displayName: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Internal name
                <input
                  type="text"
                  value={formState.internalName}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, internalName: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
            <label className={LABEL_CLASSES}>
              Guest blurb
              <textarea
                maxLength={200}
                rows={3}
                value={formState.shortDescription}
                onChange={(event) => {
                  onFormInteraction()
                  setFormState((prev) => ({ ...prev, shortDescription: event.target.value }))
                }}
                className={`${INPUT_CLASSES} resize-none`}
              />
              <span className="mt-1 block text-right text-xs text-[#6F716D]">{200 - shortDescriptionCount} characters</span>
            </label>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">LOCATION & TIMEZONE</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Street
                <input
                  type="text"
                  value={formState.address.street}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      address: { ...prev.address, street: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                City
                <input
                  type="text"
                  value={formState.address.city}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      address: { ...prev.address, city: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Region
                <input
                  type="text"
                  value={formState.address.region}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      address: { ...prev.address, region: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Country
                <input
                  type="text"
                  value={formState.address.country}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      address: { ...prev.address, country: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Postcode
                <input
                  type="text"
                  value={formState.address.postcode}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      address: { ...prev.address, postcode: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Timezone
                <select
                  value={formState.timezone}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, timezone: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                >
                  {TIMEZONE_IDS.map((timeZone) => (
                    <option key={timeZone} value={timeZone}>
                      {formatTimezoneLabel(timeZone)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">CONTACTS & LINKS</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Primary contact name
                <input
                  type="text"
                  value={formState.primaryContact.name}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      primaryContact: { ...prev.primaryContact, name: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Primary contact email
                <input
                  type="email"
                  value={formState.primaryContact.email}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      primaryContact: { ...prev.primaryContact, email: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <label className={LABEL_CLASSES}>
                Website link
                <input
                  type="url"
                  value={formState.website}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, website: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Terms link
                <input
                  type="url"
                  value={formState.termsLink}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, termsLink: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Privacy link
                <input
                  type="url"
                  value={formState.privacyLink}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, privacyLink: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">COMMERCIAL & PAYOUT</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-3">
              <label className={LABEL_CLASSES}>
                Stripe account ID
                <input
                  type="text"
                  value={formState.stripeAccountId}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, stripeAccountId: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                  placeholder="acct_..."
                />
              </label>
              <label className={LABEL_CLASSES}>
                Currency
                <select
                  value={formState.currency}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, currency: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className={LABEL_CLASSES}>
                Tax jurisdiction
                <input
                  type="text"
                  value={formState.taxJurisdiction}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, taxJurisdiction: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                VAT / GST %
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formState.taxPercentage}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, taxPercentage: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Tax behavior
                <div className="mt-2 flex gap-3">
                  {(["included", "excluded"] as const).map((behavior) => (
                    <button
                      key={behavior}
                      type="button"
                      onClick={() => {
                        onFormInteraction()
                        setFormState((prev) => ({ ...prev, taxBehavior: behavior }))
                      }}
                      className={clsx(
                        "flex-1 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
                        formState.taxBehavior === behavior
                          ? "border-[#02374D] bg-[#02374D] text-white"
                          : "border-[#E8E4D7] text-[#6F716D] hover:border-[#02374D]/60"
                      )}
                    >
                      {behavior}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">REVENUE SHARE & FEES</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Interlude share %
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formState.revenueShare.interludePercent}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      revenueShare: { ...prev.revenueShare, interludePercent: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Minimum USD
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formState.revenueShare.minimumUsd}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({
                      ...prev,
                      revenueShare: { ...prev.revenueShare, minimumUsd: event.target.value },
                    }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">OPERATING HOURS</h3>
            </header>
            <div className="space-y-3">
              {DAY_CONFIG.map((day) => {
                const details = formState.openingHours[day.key]
                return (
                  <div
                    key={day.key}
                    className="flex flex-col gap-3 rounded-[24px] border border-[#E8E4D7] bg-[#F5F0E3] p-4 md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-pressed={details.enabled}
                        onClick={() => updateOpeningHours(day.key, { enabled: !details.enabled })}
                        className={clsx(
                          "h-9 w-16 rounded-full border transition",
                          details.enabled ? "border-[#02374D] bg-[#02374D]" : "border-[#DAD7C7] bg-[#F5F0E3]"
                        )}
                      >
                        <span
                          className={clsx(
                            "inline-block h-7 w-7 transform rounded-full bg-[#FBF7ED] shadow transition",
                            details.enabled ? "translate-x-7" : "translate-x-1"
                          )}
                        />
                      </button>
                      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4F514D]">{day.label}</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                      <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                        Opens
                        <input
                          type="time"
                          value={details.opensAt}
                          disabled={!details.enabled}
                          onChange={(event) => updateOpeningHours(day.key, { opensAt: event.target.value })}
                          className={`${INPUT_CLASSES} md:w-auto`}
                        />
                      </label>
                      <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                        Closes
                        <input
                          type="time"
                          value={details.closesAt}
                          disabled={!details.enabled}
                          onChange={(event) => updateOpeningHours(day.key, { closesAt: event.target.value })}
                          className={`${INPUT_CLASSES} md:w-auto`}
                        />
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="space-y-5">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">BLACKOUTS</h3>
              <button
                type="button"
                onClick={addBlackout}
                className="rounded-full border border-dashed border-[#6F716D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6F716D]"
              >
                Add blackout
              </button>
            </header>
            {formState.blackouts.length === 0 ? (
              <p className="text-sm text-[#6F716D]">No seasonal closures added.</p>
            ) : (
              <div className="space-y-4">
                {formState.blackouts.map((range) => (
                  <div
                    key={range.id}
                    className="flex flex-col gap-3 rounded-[28px] border border-[#E8E4D7] bg-[#F5F0E3] p-4 md:flex-row md:items-center"
                  >
                    <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                      Start date
                      <input
                        type="date"
                        value={range.startDate}
                        onChange={(event) => updateBlackout(range.id, { startDate: event.target.value })}
                        className={INPUT_CLASSES}
                      />
                    </label>
                    <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                      End date
                      <input
                        type="date"
                        value={range.endDate}
                        onChange={(event) => updateBlackout(range.id, { endDate: event.target.value })}
                        className={INPUT_CLASSES}
                      />
                    </label>
                    <label className="flex flex-1 flex-col text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                      Notes
                      <input
                        type="text"
                        value={range.note}
                        onChange={(event) => updateBlackout(range.id, { note: event.target.value })}
                        className={INPUT_CLASSES}
                        placeholder="Pool refresh"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBlackout(range.id)}
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4231F]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#E8E4D7] bg-[#F5F0E3] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[#B4231F]">{formError}</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#6F716D] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D] hover:bg-[#F4F1E7]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={isSubmitting}
              className={clsx(
                "rounded-full border border-[#02374D] bg-[#02374D] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition",
                isSubmitting ? "opacity-60" : "hover:bg-[#012636]"
              )}
            >
              {isSubmitting ? (isEditing ? "Saving..." : "Publishing...") : isEditing ? "Update venue" : "Publish venue"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function PassBuilderOverlay({
  formState,
  setFormState,
  onClose,
  onPublish,
  formError,
  onFormInteraction,
  isEditing,
  venueName,
  isSubmitting,
}: PassBuilderOverlayProps) {
  const descriptionRemaining = 200 - formState.shortDescription.length
  const heroPreview = formState.heroImage?.url ?? ""
  const showMinSpend = formState.economicsType === "min_spend"
  const showPrepaid = formState.economicsType === "prepaid_credit"

  const handleHeroImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file)
    onFormInteraction()
    setFormState((prev) => ({
      ...prev,
      heroImage: {
        id: createId(),
        name: file.name,
        url,
        storagePath: null,
        file,
      },
    }))
    event.target.value = ""
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 px-4 py-10">
      <div className="mx-auto flex h-full max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[40px] border border-[#E8E4D7] bg-[#FBF7ED] shadow-[0_30px_60px_rgba(0,0,0,0.25)]">
        <header className="flex items-center justify-between border-b border-[#E8E4D7] px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
              {venueName ? `${venueName} · Pass` : "Venue pass"}
            </p>
            <h2 className="text-2xl uppercase tracking-[0.08em] text-black">{isEditing ? "Edit pass" : "Create pass"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DBD8C9] bg-[#F5F0E3] text-[#6F716D] transition hover:text-black"
            aria-label="Close pass builder"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-9 overflow-y-auto px-8 py-8">
          <section className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Status</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {PASS_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onFormInteraction()
                      setFormState((prev) => ({ ...prev, status: option.value }))
                    }}
                    className={clsx(
                      "rounded-[24px] border px-4 py-3 text-left text-sm transition",
                      formState.status === option.value
                        ? "border-[#02374D] bg-[#02374D] text-white"
                        : "border-[#E8E4D7] bg-[#F5F0E3] text-[#4F514D]"
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="relative h-60 w-full overflow-hidden rounded-[32px] border border-dashed border-[#D1CCBD] bg-[#F5F0E3]">
                {heroPreview ? (
                  <Image
                    src={heroPreview}
                    alt="Pass hero preview"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 600px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-[#6F716D]">
                    <span>Pass hero image</span>
                    <span className="text-xs uppercase tracking-[0.3em]">2000 × 1400</span>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <label className={LABEL_CLASSES}>
                  Hero image
                  <input type="file" accept="image/*" className="sr-only" onChange={handleHeroImageChange} />
                  <span className="mt-3 block rounded-full border border-[#02374D] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D]">
                    Upload hero
                  </span>
                </label>
                {formState.heroImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      onFormInteraction()
                      setFormState((prev) => ({ ...prev, heroImage: null }))
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B4231F]"
                  >
                    Remove image
                  </button>
                ) : (
                  <p className="text-xs text-[#6F716D]">Use a single statement image for instant recognition.</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">PASS PROFILE</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Pass name
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Kind
                <select
                  value={formState.kind}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, kind: event.target.value as PassFormState["kind"] }))
                  }}
                  className={INPUT_CLASSES}
                >
                  {PASS_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={LABEL_CLASSES}>
              Short description
              <textarea
                maxLength={200}
                rows={3}
                value={formState.shortDescription}
                onChange={(event) => {
                  onFormInteraction()
                  setFormState((prev) => ({ ...prev, shortDescription: event.target.value }))
                }}
                className={`${INPUT_CLASSES} resize-none`}
              />
              <span className="mt-1 block text-right text-xs text-[#6F716D]">{descriptionRemaining} characters</span>
            </label>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">ECONOMICS</h3>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              {PASS_ECONOMICS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, economicsType: option.value }))
                  }}
                  className={clsx(
                    "rounded-[24px] border px-4 py-3 text-left text-sm transition",
                    formState.economicsType === option.value
                      ? "border-[#02374D] bg-[#02374D] text-white"
                      : "border-[#E8E4D7] bg-[#F5F0E3] text-[#4F514D]"
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.label}</span>
                  <span className="text-[0.7rem] text-[#D4CEC0]">{option.caption}</span>
                </button>
              ))}
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <label className={LABEL_CLASSES}>
                Currency
                <select
                  value={formState.currency}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, currency: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                >
                  {CURRENCY_OPTIONS.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              {showMinSpend && (
                <label className={LABEL_CLASSES}>
                  Min spend amount
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.minSpendAmount}
                    onChange={(event) => {
                      onFormInteraction()
                      setFormState((prev) => ({ ...prev, minSpendAmount: event.target.value }))
                    }}
                    className={INPUT_CLASSES}
                  />
                </label>
              )}
              {showPrepaid && (
                <label className={LABEL_CLASSES}>
                  Prepaid credit amount
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formState.prepaidCreditAmount}
                    onChange={(event) => {
                      onFormInteraction()
                      setFormState((prev) => ({ ...prev, prepaidCreditAmount: event.target.value }))
                    }}
                    className={INPUT_CLASSES}
                  />
                </label>
              )}
              <label className={LABEL_CLASSES}>
                Display price text
                <input
                  type="text"
                  value={formState.displayPriceText}
                  placeholder="From $250"
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, displayPriceText: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Interlude perk
                <input
                  type="text"
                  value={formState.interludePerk}
                  placeholder="e.g., Welcome rum punch"
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, interludePerk: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">PASS CONTROLS</h3>
            </header>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Visibility</p>
              <div className="grid gap-4 sm:grid-cols-3">
                {PASS_VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onFormInteraction()
                      setFormState((prev) => ({ ...prev, visibility: option.value }))
                    }}
                    className={clsx(
                      "rounded-[24px] border px-4 py-3 text-left text-sm transition",
                      formState.visibility === option.value
                        ? "border-[#02374D] bg-[#02374D] text-white"
                        : "border-[#E8E4D7] bg-[#F5F0E3] text-[#4F514D]"
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <label className={LABEL_CLASSES}>
                Default daily cap
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.defaultDailyCap}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, defaultDailyCap: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Grace period (minutes)
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formState.graceMinutes}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, graceMinutes: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                No-show hold amount
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.noShowHoldAmount}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, noShowHoldAmount: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Cancellation window (days before)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState.cancellationWindowDays}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, cancellationWindowDays: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Cutoff time (local)
                <input
                  type="time"
                  value={formState.cancellationWindowTime}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, cancellationWindowTime: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
          </section>

          <section className="space-y-5">
            <header>
              <h3 className="text-xl font-medium uppercase tracking-[0.08em] text-black">SCHEDULE</h3>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <label className={LABEL_CLASSES}>
                Service opens
                <input
                  type="time"
                  value={formState.serviceOpen}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, serviceOpen: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Service closes
                <input
                  type="time"
                  value={formState.serviceClose}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, serviceClose: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Arrival start
                <input
                  type="time"
                  value={formState.arrivalStart}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, arrivalStart: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
              <label className={LABEL_CLASSES}>
                Arrival window (minutes)
                <input
                  type="number"
                  min="30"
                  step="15"
                  value={formState.arrivalDuration}
                  onChange={(event) => {
                    onFormInteraction()
                    setFormState((prev) => ({ ...prev, arrivalDuration: event.target.value }))
                  }}
                  className={INPUT_CLASSES}
                />
              </label>
            </div>
            <div className="flex items-center justify-between rounded-[24px] border border-[#E8E4D7] bg-[#F5F0E3] px-4 py-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4F514D]">Auto-approve</p>
                <p className="text-xs text-[#6F716D]">Issue passes instantly when availability allows.</p>
              </div>
              <button
                type="button"
                aria-pressed={formState.autoApprove}
                onClick={() => {
                  onFormInteraction()
                  setFormState((prev) => ({ ...prev, autoApprove: !prev.autoApprove }))
                }}
                className={clsx(
                  "h-9 w-16 rounded-full border transition",
                  formState.autoApprove ? "border-[#02374D] bg-[#02374D]" : "border-[#DAD7C7] bg-[#F5F0E3]"
                )}
              >
                <span
                  className={clsx(
                    "inline-block h-7 w-7 transform rounded-full bg-[#FBF7ED] shadow transition",
                    formState.autoApprove ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#E8E4D7] bg-[#F5F0E3] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[#B4231F]">{formError}</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#6F716D] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D] hover:bg-[#F4F1E7]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={isSubmitting}
              className={clsx(
                "rounded-full border border-[#02374D] bg-[#02374D] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition",
                isSubmitting ? "opacity-60" : "hover:bg-[#012636]"
              )}
            >
              {isSubmitting ? (isEditing ? "Saving..." : "Publishing...") : isEditing ? "Update pass" : "Publish pass"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
