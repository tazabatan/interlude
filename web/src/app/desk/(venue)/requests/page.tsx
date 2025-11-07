import { fetchDeskBookings, type DeskBooking } from '@/lib/desk'
import { RequestsClient, type RequestCardPayload, type PassCategory } from './client'

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

function mapCategory(kind: string | null): PassCategory {
  if (kind === 'MIN_SPEND') return 'beach'
  if (kind === 'DAY_PASS') return 'pool'
  return 'beach'
}

function formatStatusLabel(status: string) {
  return status === 'issued' ? 'Pass issued' : status.replace(/_/g, ' ')
}

function mapBookingToPayload(booking: DeskBooking): RequestCardPayload {
  const tz = booking.pass?.venue?.tz ?? 'UTC'
  return {
    id: booking.id,
    status: booking.status,
    statusLabel: formatStatusLabel(booking.status),
    dateLabel: formatDateLabel(booking.date),
    partySize: booking.party_size,
    arrivalWindow: formatArrival(booking.arrival_window_start, booking.arrival_window_end, tz),
    passLabel: formatPassLabel(booking.pass?.kind ?? null),
    priceLabel: formatPassPrice(
      booking.pass?.display_price_text ?? null,
      booking.pass?.min_spend_amount ?? null,
      booking.pass?.currency ?? 'USD'
    ),
    category: mapCategory(booking.pass?.kind ?? null),
  }
}

export default async function DeskRequestsPage() {
  const requestedRaw = await fetchDeskBookings('requested')
  const requested = requestedRaw.map(mapBookingToPayload)
  const totalRequests = requested.length
  const heading = `YOU HAVE ${totalRequests} REQUEST${totalRequests === 1 ? '' : 'S'} TO REVIEW`

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-12 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <RequestsClient bookings={requested} heading={heading} />
    </div>
  )
}
