import { fetchGuestProfileById } from "@/lib/guest-profile"
import { serviceRoleFetch } from "@/lib/supabase/service-role"
import { formatPassLabel } from "@/lib/passes/helpers"

type StaffContact = {
  id: string
  role: string
  phone: string
  name: string
}

type BookingNotificationRow = {
  id: string
  date: string | null
  arrival_window_start: string | null
  arrival_window_end: string | null
  party_size: number | null
  user_id: string
  venue_id: string | null
  pass: {
    kind: string | null
    profile?: Record<string, unknown> | null
    venue: {
      id: string | null
      name: string | null
      tz: string | null
    } | null
  } | null
  venue: {
    id: string | null
    name: string | null
    tz: string | null
  } | null
}

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_TEMPLATE_BOOKING_REQUEST &&
      process.env.WHATSAPP_TEMPLATE_LANG,
  )
}

function getSiteUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000"
  return base.replace(/\/$/, "")
}

function formatArrivalDate(dateIso: string | null) {
  if (!dateIso) return "Date to be confirmed"
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return "Date to be confirmed"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed)
}

function formatArrivalWindow(startIso: string | null, endIso: string | null, tz: string) {
  if (!startIso || !endIso) return "Arrival window to be confirmed"
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Arrival window to be confirmed"
  }
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    })
    return `${formatter.format(start)}–${formatter.format(end)}`
  } catch {
    return "Arrival window to be confirmed"
  }
}

function formatPartySize(size: number | null) {
  if (!size) return "TBD"
  if (size === 1) return "1 guest"
  return `${size} guests`
}

function normalizePhone(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim().replace(/\s+/g, "")
  if (trimmed.length < 8) return null
  return trimmed
}

async function fetchBooking(bookingId: string): Promise<BookingNotificationRow | null> {
  const select = [
    "id",
    "date",
    "arrival_window_start",
    "arrival_window_end",
    "party_size",
    "user_id",
    "venue_id",
    "pass:passes(kind,profile,venue:venues(id,name,tz))",
    "venue:venues(id,name,tz)",
  ].join(",")
  const params = new URLSearchParams({ id: `eq.${bookingId}`, select, limit: "1" })
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to load booking ${bookingId} (${res.status})`)
  }
  const rows = (await res.json()) as BookingNotificationRow[]
  return rows[0] ?? null
}

function pickProfileString(profile: Record<string, unknown> | null | undefined, key: string) {
  if (!profile) return null
  const value = profile[key]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function resolvePassName(pass: BookingNotificationRow["pass"]) {
  if (!pass) return "Pass request"
  const profile = pass.profile ?? {}
  const displayName = pickProfileString(profile, "displayName")
  const internalName = pickProfileString(profile, "internalName")
  if (displayName) return displayName
  if (internalName) return internalName
  return formatPassLabel(pass.kind ?? null)
}

async function fetchOptedInStaff(venueId: string | null): Promise<StaffContact[]> {
  if (!venueId) return []
  const params = new URLSearchParams({
    select: "id,phone,raw_user_meta_data",
    "raw_user_meta_data->>venue_id": `eq.${venueId}`,
    "raw_user_meta_data->>app_role": "in.(venue_manager,venue_staff)",
    "raw_user_meta_data->>whatsapp_opt_in": "eq.true",
  })
  const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to load opted-in staff (${res.status})`)
  }
  const rows = (await res.json()) as Array<{
    id?: string
    phone?: string | null
    raw_user_meta_data?: Record<string, unknown> | null
  }>

  const contacts: StaffContact[] = []
  for (const row of rows ?? []) {
    const meta = (row.raw_user_meta_data ?? {}) as Record<string, unknown>
    const phone = normalizePhone((meta.whatsapp_phone as string | undefined) ?? (row.phone as string | undefined))
    const role = (meta.app_role as string | undefined) ?? ""
    const name = (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? "Team member"
    if (row.id && phone) {
      contacts.push({ id: row.id, phone, role, name })
    }
  }

  // Deduplicate by phone to avoid extra conversation charges
  const seen = new Set<string>()
  return contacts.filter((contact) => {
    if (seen.has(contact.phone)) return false
    seen.add(contact.phone)
    return true
  })
}

async function sendTemplate(to: string, variables: string[]) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName = process.env.WHATSAPP_TEMPLATE_BOOKING_REQUEST
  const language = process.env.WHATSAPP_TEMPLATE_LANG

  if (!token || !phoneNumberId || !templateName || !language) {
    return
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: variables.map((text) => ({ type: "text", text: text ?? "" })),
        },
      ],
    },
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`WhatsApp send failed (${res.status}): ${text}`)
  }
}

export async function sendBookingRequestWhatsApp(bookingId: string) {
  if (!isConfigured()) return
  try {
    const booking = await fetchBooking(bookingId)
    if (!booking) return

    const guest = await fetchGuestProfileById(booking.user_id)
    if (!guest) return

    const venueName = booking.pass?.venue?.name ?? booking.venue?.name ?? "Your venue"
    const venueTz = booking.pass?.venue?.tz ?? booking.venue?.tz ?? "America/Anguilla"
    const passLabel = resolvePassName(booking.pass)
    const arrivalDateDisplay = formatArrivalDate(booking.date)
    const arrivalWindowDisplay = formatArrivalWindow(booking.arrival_window_start, booking.arrival_window_end, venueTz)
    const partyLabel = formatPartySize(booking.party_size)
    const guestLabel = guest.email ? `${guest.name} (${guest.email})` : guest.name
    const siteUrl = getSiteUrl()
    const reviewUrl = `${siteUrl}/desk/bookings/${booking.id}`

    const staff = await fetchOptedInStaff(booking.pass?.venue?.id ?? booking.venue?.id ?? booking.venue_id)
    if (staff.length === 0) return

    const variables = [
      passLabel,
      `${arrivalDateDisplay} (${arrivalWindowDisplay})`,
      partyLabel,
      guestLabel,
      reviewUrl,
    ]

    await Promise.all(
      staff.map(async (contact) => {
        try {
          await sendTemplate(contact.phone, variables)
        } catch (error) {
          console.error(`[whatsapp] failed to notify ${contact.phone}`, error)
        }
      }),
    )
  } catch (error) {
    console.error("[whatsapp] booking request notify failed", error)
  }
}
