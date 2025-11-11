import { fetchBookingsByDate } from '@/lib/desk'
import { buildGuestProfile, fetchGuestProfilesByIds } from '@/lib/guest-profile'
import { formatArrivalValue } from '@/lib/arrival'
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
  const guestProfiles = await fetchGuestProfilesByIds(bookingsRaw.map((booking) => booking.user_id))

  const bookings = bookingsRaw.map((booking) => {
    const dateLabel = formatDateLabel(booking.date)
    const arrivalWindow = formatArrivalValue(
      booking.requested_arrival_time,
      booking.arrival_window_start,
      booking.arrival_window_end
    )
    const passLabel = formatPassLabel(booking.pass?.kind ?? null)
    const priceLabel = formatPassPrice(
      booking.pass?.display_price_text ?? null,
      booking.pass?.min_spend_amount ?? null,
      booking.pass?.currency ?? 'USD'
    )
    const guestProfile = guestProfiles[booking.user_id] ?? buildGuestProfile()
    const guestLabel = `${guestProfile.name}'s group of ${booking.party_size}`
    const imageSrc = guestProfile.avatarUrl ?? pickGuestImage(booking.id)
    const imageUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
    const paymentState = mapPaymentState(booking.hold_status)
    const category = mapCategory(booking.pass?.kind ?? null)
    const isRequest = booking.status === 'requested'

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
      imageUnoptimized,
      detailHref: isRequest ? `/desk/requests/${booking.id}` : `/desk/bookings/${booking.id}`,
      status: booking.status,
      category,
      paymentStateKey: paymentState.key,
      paymentStateLabel: paymentState.label,
      qrJti: booking.qr_jti,
    }
  })

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-8 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <DayDetailClient date={date} bookings={bookings} />
    </div>
  )
}
