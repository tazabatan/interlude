import { notFound } from 'next/navigation'
import { fetchBookingsByDate, type DeskBooking } from '@/lib/desk'
import { buildGuestProfile, fetchGuestProfilesByIds } from '@/lib/guest-profile'
import { formatArrivalValue } from '@/lib/arrival'
import { computePartyCountsFromAges, formatPartySummary } from '@/lib/party'
import { getUserRole } from '@/lib/get-user-role'
import { DayDetailClient } from './client'
import { formatPassPrice } from '@/lib/passes/helpers'

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
  if (kind === 'MIN_SPEND') return 'Beach Club Pass'
  if (kind === 'DAY_PASS') return 'Day Pass'
  if (kind === 'BEACH_PASS') return 'Beach Club Pass'
  return 'Pass'
}

function pickGuestImage(seed: string) {
  const placeholders: readonly string[] = [
    '/guest-photos/guest-1.jpg',
    '/guest-photos/guest-2.jpg',
    '/guest-photos/guest-3.jpg',
    '/guest-photos/guest-4.png',
    '/guest-photos/guest-5.png',
    '/guest-photos/guest-6.png',
    '/guest-photos/guest-7.png',
  ]
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

function resolvePartySummary(booking: DeskBooking) {
  if (booking.guest_adult_count != null || booking.guest_child_count != null) {
    return formatPartySummary(booking.guest_adult_count ?? 0, booking.guest_child_count ?? 0, booking.party_size)
  }
  if (booking.guest_ages && booking.guest_ages.length > 0) {
    const counts = computePartyCountsFromAges(booking.guest_ages)
    return formatPartySummary(counts.adults, counts.children, booking.party_size)
  }
  return formatPartySummary(null, null, booking.party_size)
}

export default async function DayDetailPage({ params }: DayDetailPageProps) {
  const [{ date }, { user }] = await Promise.all([params, getUserRole()])
  const venueId = user?.user_metadata?.venue_id as string | undefined
  if (!venueId) {
    notFound()
  }

  const bookingsRaw = await fetchBookingsByDate(date, venueId)
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
      booking.pass?.currency ?? 'USD',
      { venueName: booking.pass?.venue?.name ?? null }
    )
    const guestProfile = guestProfiles[booking.user_id] ?? buildGuestProfile()
    const guestLabel = `${guestProfile.firstName || guestProfile.name}'s group of ${booking.party_size}`
    const imageSrc = guestProfile.avatarUrl ?? pickGuestImage(booking.id)
    const imageUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
    const paymentState = mapPaymentState(booking.hold_status)
    const category = mapCategory(booking.pass?.kind ?? null)
    const isRequest = booking.status === 'requested'
    const partySummary = resolvePartySummary(booking)

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
      partySummary,
    }
  })

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-8 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <DayDetailClient date={date} bookings={bookings} />
    </div>
  )
}
