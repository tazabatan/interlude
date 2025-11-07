import { fetchBookingsByDate } from '@/lib/desk'
import { DayDetailClient } from './client'

type DayDetailPageProps = {
  params: Promise<{ date: string }>
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
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

function mapCategory(kind: string | null) {
  if (kind === 'MIN_SPEND') return 'beach'
  if (kind === 'DAY_PASS') return 'pool'
  return 'beach'
}

function mapPaymentState(holdStatus: string | null) {
  if (holdStatus === 'authorized') return { key: 'active', label: 'Hold active' }
  if (holdStatus === 'captured') return { key: 'charged', label: 'No-show charged' }
  if (holdStatus === 'canceled') return { key: 'released', label: 'Hold released' }
  return { key: 'unknown', label: 'Payment pending' }
}

export default async function DayDetailPage({ params }: DayDetailPageProps) {
  const { date } = await params
  const bookingsRaw = await fetchBookingsByDate(date)

  const bookings = bookingsRaw.map((booking) => {
    const tz = booking.pass?.venue?.tz ?? 'UTC'
    const dateLabel = formatDateLabel(booking.date)
    const arrivalWindow = formatArrival(booking.arrival_window_start, booking.arrival_window_end, tz)
    const passLabel = formatPassLabel(booking.pass?.kind ?? null)
    const priceLabel = formatPassPrice(
      booking.pass?.display_price_text ?? null,
      booking.pass?.min_spend_amount ?? null,
      booking.pass?.currency ?? 'USD'
    )
    const guestLabel = `TBD Name's group of ${booking.party_size}`
    const imageSrc = pickGuestImage(booking.id)
    const paymentState = mapPaymentState(booking.hold_status)
    const category = mapCategory(booking.pass?.kind ?? null)

    return {
      id: booking.id,
      dateLabel,
      arrivalWindow,
      passLabel,
      priceLabel,
      statusLabel: formatStatusLabel(booking.status),
      partySize: booking.party_size,
      guestLabel,
      imageSrc,
      detailHref: `/desk/requests/${booking.id}`,
      status: booking.status,
      category,
      paymentStateKey: paymentState.key,
      paymentStateLabel: paymentState.label,
    }
  })

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-8 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <DayDetailClient date={date} bookings={bookings} />
    </div>
  )
}
