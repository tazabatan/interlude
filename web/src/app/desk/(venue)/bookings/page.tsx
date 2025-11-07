import { fetchDeskBookings, fetchDeskBookingsByStatuses, type DeskBooking } from '@/lib/desk'
import { BookingsClient } from './client'

function formatDateLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatArrival(start: string | null, end: string | null, tz: string | null) {
  if (!start || !end) return 'Arrival window TBD'
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Arrival window TBD'
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(startDate)} – ${formatter.format(endDate)} ${tz ?? ''}`.trim()
}

function formatPassLabel(kind: string | null) {
  if (kind === 'MIN_SPEND') return 'Beach Pass'
  if (kind === 'DAY_PASS') return 'Day Pass'
  return 'Pass'
}

function formatPassPrice(displayText: string | null, amountCents: number | null, currency: string | null) {
  if (displayText) return displayText
  if (typeof amountCents === 'number') {
    const isoCurrency = (currency ?? 'USD').toUpperCase()
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: isoCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amountCents / 100)
    } catch (error) {
      console.warn('formatPassPrice fallback', error)
    }
  }
  return 'TBD price'
}

function pickGuestImage(seed: string) {
  const placeholders = [
    '/guest-photos/guest-1.jpg',
    '/guest-photos/guest-2.jpg',
    '/guest-photos/guest-3.jpg',
    '/guest-photos/guest-4.png',
    '/guest-photos/guest-5.png',
    '/guest-photos/guest-6.png',
    '/guest-photos/guest-7.png',
  ] as const
  if (placeholders.length === 0) return ''
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % placeholders.length
  return placeholders[index]
}

function formatStatusLabel(status: string) {
  return status === 'issued' ? 'Pass issued' : status.replace(/_/g, ' ')
}

function mapBooking(booking: DeskBooking, todayIso: string) {
  const tz = booking.pass?.venue?.tz ?? 'UTC'
  const dateLabel = formatDateLabel(booking.date)
  const arrivalWindow = formatArrival(booking.arrival_window_start, booking.arrival_window_end, tz)
  const passLabel = formatPassLabel(booking.pass?.kind ?? null)
  const priceLabel = formatPassPrice(
    booking.pass?.display_price_text ?? null,
    booking.pass?.min_spend_amount ?? null,
    booking.pass?.currency ?? 'USD'
  )
  const isToday = booking.date === todayIso
  const isDeclined = booking.status === 'declined'
  const segment = isDeclined
    ? 'cancelled'
    : isToday
      ? 'today'
      : new Date(booking.date) > new Date(todayIso)
        ? 'upcoming'
        : 'past'

  const ctaLabel = isDeclined ? 'Undo Decline' : isToday ? 'Mark Arrived' : 'View Booking'
  const guestLabel = `TBD Name's group of ${booking.party_size}`
  const imageSrc = pickGuestImage(booking.id)

  return {
    id: booking.id,
    dateLabel,
    arrivalWindow,
    passLabel,
    priceLabel,
    statusLabel: formatStatusLabel(booking.status),
    partySize: booking.party_size,
    isDeclined,
    isToday,
    ctaLabel,
    segment,
    guestLabel,
    imageSrc,
    detailHref: `/desk/requests/${booking.id}`,
  }
}

function mapPending(booking: DeskBooking) {
  return {
    id: booking.id,
    dateLabel: formatDateLabel(booking.date),
    arrivalWindow: formatArrival(booking.arrival_window_start, booking.arrival_window_end, booking.pass?.venue?.tz ?? 'UTC'),
    statusLabel: booking.status.replace(/_/g, ' '),
    partySize: booking.party_size,
  }
}

export type BookingCardPayload = ReturnType<typeof mapBooking>

export default async function DeskBookingsPage() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const [primaryRaw, pendingRaw] = await Promise.all([
    fetchDeskBookingsByStatuses(['approved', 'issued', 'declined']),
    fetchDeskBookings('pending_verification'),
  ])

  const primaryBookings = primaryRaw.map((booking) => mapBooking(booking, todayIso))
  const pending = pendingRaw.map(mapPending)

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-12 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <BookingsClient bookings={primaryBookings} />

      <PendingVerificationSection bookings={pending} />
    </div>
  )
}

function PendingVerificationSection({ bookings }: { bookings: ReturnType<typeof mapPending>[] }) {
  if (bookings.length === 0) return null

  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold uppercase tracking-[0.1em]">Pending verification</h2>
        <p className="text-sm text-[#4F514D]">Late scans and guest claims still flow here for review.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="flex min-h-[18rem] flex-col rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] px-6 py-6 text-center shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]"
          >
            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-[#6F716D]">
              <span>{booking.dateLabel}</span>
            </div>
            <div className="mt-4 text-sm font-semibold text-[#02374D]">{booking.arrivalWindow}</div>
            <div className="mt-auto rounded-[24px] bg-white/70 px-4 py-4 text-sm text-[#4F514D]">
              Status · {booking.statusLabel.toUpperCase()} · Party {booking.partySize}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
