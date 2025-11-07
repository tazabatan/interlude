export type GuestBookingRow = {
  id: string
  date: string
  party_size: number
  status: string
  arrival_window_start: string | null
  arrival_window_end: string | null
  qr_jti: string | null
  hold_status: string
  pass: {
    kind: string | null
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

export function buildGuestBookingView(row: GuestBookingRow): GuestBookingView {
  const derived = computeDerivedFields(row.arrival_window_start, row.arrival_window_end, row.status)
  const hold_banner = holdAuthorizesBanner(row.date, row.venue?.tz ?? null)

  return {
    ...row,
    ...derived,
    hold_banner,
    venue_name: row.venue?.name ?? null,
    pass_kind: row.pass?.kind ?? null,
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
