import { fetchGuestProfileById } from '@/lib/guest-profile'
import { formatPassLabel } from '@/lib/passes/helpers'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import { formatTimezoneLabel } from '@/lib/timezone'
import type {
  BookingApprovedEmailPayload,
  BookingRequestedEmailPayload,
  BookingDeclinedEmailPayload,
  BookingCancelledEmailPayload,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
} from '@/emails/types'

type BookingEmailRow = {
  id: string
  user_id: string
  qr_jti: string | null
  hotel_code?: string | null
  date: string
  party_size: number
  arrival_window_start: string | null
  arrival_window_end: string | null
  hold_amount: number | null
  hold_currency: string | null
  status: string
  pass: {
    kind: string | null
    profile: Record<string, unknown> | null
    display_price_text: string | null
    min_spend_amount: number | null
    no_show_amount_per_person: number | null
    currency: string | null
    venue: {
      name: string | null
      tz: string | null
      profile?: Record<string, unknown> | null
    } | null
  } | null
  venue: {
    name: string | null
    tz: string | null
    profile?: Record<string, unknown> | null
  } | null
}

const BOOKING_EMAIL_SELECT = [
  'id',
  'user_id',
  'qr_jti',
  'hotel_code',
  'date',
  'party_size',
  'arrival_window_start',
  'arrival_window_end',
  'hold_amount',
  'hold_currency',
  'status',
  'pass:passes(kind,profile,display_price_text,min_spend_amount,no_show_amount_per_person,currency,venue:venues(name,tz,profile))',
  'venue:venues(name,tz,profile)',
].join(',')

type BookingEmailContext = {
  booking: BookingEmailRow
  guestName: string
  guestFirstName: string
  guestEmail: string
  venueName: string
  venueTz: string
  passName: string
  arrivalDateDisplay: string
  arrivalWindowDisplay: string
  holdAmountDisplay: string
  manageUrl: string
  walletUrl: string
  supportUrl: string
  qrCodeValue: string | null
}

function getSiteUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:3000'
  return base.replace(/\/$/, '')
}

function getTimezone(row: BookingEmailRow) {
  return row.pass?.venue?.tz ?? row.venue?.tz ?? 'America/Anguilla'
}

function formatCurrency(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (amountCents == null) return 'TBD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency ?? 'USD').toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountCents / 100)
  } catch {
    return `$${(amountCents / 100).toFixed(0)}`
  }
}

function formatArrivalDate(dateIso: string | null) {
  if (!dateIso) return 'Date to be confirmed'
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(parsed)
}

function formatArrivalWindow(startIso: string | null, endIso: string | null, tz: string) {
  if (!startIso || !endIso) return 'Arrival window to be confirmed'
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Arrival window to be confirmed'
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  })
  const startLabel = formatter.format(start)
  const endLabel = formatter.format(end)
  const tzLabel = formatTimezoneLabel(tz)
  return `${startLabel} – ${endLabel} ${tzLabel}`
}

function formatDateTime(dateIso: string, tz: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) {
    return formatArrivalDate(dateIso)
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  }).format(parsed)
}

function resolvePassName(row: BookingEmailRow) {
  const profile = row.pass?.profile ?? {}
  const displayName = pickProfileString(profile, 'displayName')
  const internalName = pickProfileString(profile, 'internalName')
  if (displayName) return displayName
  if (internalName) return internalName
  return formatPassLabel(row.pass?.kind ?? null)
}

function pickProfileString(profile: Record<string, unknown> | null | undefined, key: string) {
  if (!profile) return null
  const value = profile[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

async function fetchBookingRow(bookingId: string) {
  const params = new URLSearchParams({
    id: `eq.${bookingId}`,
    select: BOOKING_EMAIL_SELECT,
    limit: '1',
  })
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`Failed to load booking ${bookingId} (${res.status})`)
  }
  const rows = (await res.json()) as BookingEmailRow[]
  return rows[0] ?? null
}

async function buildBookingContext(bookingId: string): Promise<BookingEmailContext | null> {
  const booking = await fetchBookingRow(bookingId)
  if (!booking) return null
  const guestProfile = await fetchGuestProfileById(booking.user_id)
  if (!guestProfile?.email) return null

  const siteUrl = getSiteUrl()
  const venueName = booking.pass?.venue?.name ?? booking.venue?.name ?? 'Your venue'
  const venueTz = getTimezone(booking)
  const passName = resolvePassName(booking)
  const arrivalWindowDisplay = formatArrivalWindow(booking.arrival_window_start, booking.arrival_window_end, venueTz)
  const arrivalDateDisplay = formatArrivalDate(booking.date)
  const holdAmountDisplay = formatCurrency(
    booking.hold_amount ?? booking.pass?.no_show_amount_per_person ?? null,
    booking.hold_currency ?? booking.pass?.currency ?? 'USD'
  )

  return {
    booking,
    guestName: guestProfile.name,
    guestFirstName: guestProfile.firstName,
    guestEmail: guestProfile.email,
    venueName,
    venueTz,
    passName,
    arrivalDateDisplay,
    arrivalWindowDisplay,
    holdAmountDisplay,
    manageUrl: new URL(`/app/bookings/${booking.id}`, siteUrl).toString(),
    walletUrl: new URL('/app', siteUrl).toString(),
    supportUrl: new URL('/support', siteUrl).toString(),
    qrCodeValue: booking.qr_jti ?? null,
  }
}

export async function buildBookingApprovedEmailPayload(
  bookingId: string
): Promise<BookingApprovedEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null

  const holdChargeTimeDisplay = `Authorizes at 14:00 ${formatTimezoneLabel(context.venueTz)} the day before your visit`

  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue ?? null,
    holdChargeTimeDisplay,
  }
}

export async function buildDayOfReminderEmailPayload(
  bookingId: string
): Promise<DayOfReminderEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null
  const venueAddress =
    pickProfileString(context.booking.venue?.profile, 'address') ??
    pickProfileString(context.booking.pass?.venue?.profile, 'address')

  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue ?? null,
    venueAddress: venueAddress ?? null,
  }
}

export async function buildHoldStatusEmailPayload(
  bookingId: string,
  variant: HoldStatusEmailPayload['variant'],
  statusDateIso?: string | null
): Promise<HoldStatusEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null
  const statusDate = statusDateIso ?? new Date().toISOString()

  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue ?? null,
    variant,
    statusDateDisplay: formatDateTime(statusDate, context.venueTz),
    supportUrl: context.supportUrl,
  }
}

export async function buildNoScanEmailPayload(
  bookingId: string,
  reviewDeadlineIso: string
): Promise<NoScanNoticeEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null
  const siteUrl = getSiteUrl()

  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue ?? null,
    reviewDeadlineDisplay: formatDateTime(reviewDeadlineIso, context.venueTz),
    claimUrl: new URL(`/support/claims/${context.booking.id}`, siteUrl).toString(),
  }
}

export async function buildBookingRequestedEmailPayload(
  bookingId: string
): Promise<BookingRequestedEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null

  const confirmationNumber =
    context.booking.hotel_code ??
    context.booking.id.slice(0, 8).toUpperCase()

  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue,
    confirmationNumber,
  }
}

export async function buildBookingDeclinedEmailPayload(
  bookingId: string,
  reason: string | null
): Promise<BookingDeclinedEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null
  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue,
    declineReason: reason,
  }
}

export async function buildBookingCancelledEmailPayload(
  bookingId: string,
  cancelledBy: BookingCancelledEmailPayload['cancelledBy']
): Promise<BookingCancelledEmailPayload | null> {
  const context = await buildBookingContext(bookingId)
  if (!context) return null
  return {
    recipient: { email: context.guestEmail, name: context.guestName },
    bookingId: context.booking.id,
    guestName: context.guestFirstName,
    venueName: context.venueName,
    passName: context.passName,
    partySize: context.booking.party_size,
    arrivalDateDisplay: context.arrivalDateDisplay,
    arrivalWindowDisplay: context.arrivalWindowDisplay,
    holdAmountDisplay: context.holdAmountDisplay,
    manageUrl: context.manageUrl,
    walletUrl: context.walletUrl,
    qrCodeValue: context.qrCodeValue,
    cancelledBy,
    actorName: null,
  }
}
