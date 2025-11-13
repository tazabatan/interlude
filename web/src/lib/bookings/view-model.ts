import { getPassHeroImageUrl } from '@/lib/desk'
import { formatPassPrice } from '@/lib/passes/helpers'

type PassHeroImage = {
  storagePath?: string | null
  url?: string | null
}

type PassLike = {
  kind?: string | null
  display_price_text?: string | null
  min_spend_amount?: number | null
  currency?: string | null
  profile?: {
    heroImage?: PassHeroImage | null
  } | null
} | null

export type GuestBookingRow = {
  id: string
  pass_id: string
  date: string
  party_size: number
  status: string
  arrival_window_start: string | null
  arrival_window_end: string | null
  requested_arrival_time: string | null
  qr_jti: string | null
  hold_status: string
  pass: {
    kind: string | null
    display_price_text: string | null
    min_spend_amount: number | null
    currency: string | null
    profile: {
      heroImage?: PassHeroImage | null
    } | null
  } | null
  venue: {
    name: string | null
    tz: string | null
  } | null
}

const CANCELLABLE_STATUSES = new Set(['requested', 'approved', 'issued', 'pending_verification'])

type BaseDerivedFields = {
  can_cancel: boolean
  is_upcoming: boolean
  is_past: boolean
  hold_banner: string | null
}

export type GuestBookingView = GuestBookingRow &
  BaseDerivedFields & {
    venue_name: string | null
    pass_kind: string | null
    hero_image_url: string | null
    price_display: string
    pass_display_price_text: string | null
    pass_min_spend_amount: number | null
    pass_currency: string | null
  }

export type VenueBookingRow = {
  id: string
  arrival_window_start: string | null
  arrival_window_end: string | null
  status: string
  party_size: number
}

export type VenueBookingView = VenueBookingRow &
  BaseDerivedFields & {
    start: string | null
    end: string | null
    member_initials: string | null
  }

function safeDate(input: string | null) {
  if (!input) return null
  const value = new Date(input)
  return Number.isNaN(value.getTime()) ? null : value
}

function computeDerivedFields(startIso: string | null, endIso: string | null, status: string) {
  const now = new Date()
  const start = safeDate(startIso)
  const end = safeDate(endIso)

  const canCancel = CANCELLABLE_STATUSES.has(status)
  const isUpcoming = start ? now < start : true
  const isPast = end ? now > end : false

  return { can_cancel: canCancel, is_upcoming: isUpcoming, is_past: isPast }
}

function holdAuthorizesBanner(date: string | null, venueTz: string | null) {
  if (!date) return null
  const tz = venueTz ?? 'America/Anguilla'
  return `Hold authorizes at 14:00 ${tz} the day before your booking`
}

function resolvePriceDisplay(kind: string | null, displayText: string | null, amount: number | null, currency: string | null) {
  if (kind === 'MIN_SPEND') {
    return formatPassPrice(null, amount ?? null, currency ?? null, { prefix: 'Min spend ' })
  }
  if (displayText) return displayText
  return formatPassPrice(null, amount ?? null, currency ?? null)
}

export function buildGuestBookingView(row: GuestBookingRow, passOverride?: PassLike): GuestBookingView {
  const derived = computeDerivedFields(row.arrival_window_start, row.arrival_window_end, row.status)
  const hold_banner = holdAuthorizesBanner(row.date, row.venue?.tz ?? null)
  const hero_source = passOverride ?? row.pass ?? null
  const hero_image_url = getPassHeroImageUrl(hero_source ?? undefined)
  const pass_kind = passOverride?.kind ?? row.pass?.kind ?? null
  const price_source = passOverride ?? row.pass ?? null
  const price_display = resolvePriceDisplay(
    pass_kind,
    price_source?.display_price_text ?? null,
    price_source?.min_spend_amount ?? null,
    price_source?.currency ?? null,
  )
  const pass_display_price_text = price_source?.display_price_text ?? null
  const pass_min_spend_amount = price_source?.min_spend_amount ?? null
  const pass_currency = price_source?.currency ?? null

  return {
    ...row,
    ...derived,
    hold_banner,
    venue_name: row.venue?.name ?? null,
    pass_kind,
    hero_image_url,
    price_display,
    pass_display_price_text,
    pass_min_spend_amount,
    pass_currency,
  }
}

export function buildVenueBookingView(row: VenueBookingRow): VenueBookingView {
  const derived = computeDerivedFields(row.arrival_window_start, row.arrival_window_end, row.status)
  return {
    ...row,
    ...derived,
    hold_banner: null,
    start: row.arrival_window_start,
    end: row.arrival_window_end,
    member_initials: null,
  }
}
