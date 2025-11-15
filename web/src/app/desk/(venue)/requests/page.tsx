import { notFound } from 'next/navigation'
import { fetchDeskBookings, type DeskBooking } from '@/lib/desk'
import { buildGuestProfile, fetchGuestProfilesByIds, type GuestProfile } from '@/lib/guest-profile'
import { RequestsClient, type RequestCardPayload, type PassCategory } from './client'
import { formatArrivalValue } from '@/lib/arrival'
import { getUserRole } from '@/lib/get-user-role'
import { computePartyCountsFromAges, formatPartySummary } from '@/lib/party'

function formatDateLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
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

function resolvePartySummary(booking: DeskBooking) {
  const adults = booking.guest_adult_count
  const children = booking.guest_child_count
  if (adults != null || children != null) {
    return formatPartySummary(adults ?? 0, children ?? 0, booking.party_size)
  }
  if (booking.guest_ages && booking.guest_ages.length > 0) {
    const counts = computePartyCountsFromAges(booking.guest_ages)
    return formatPartySummary(counts.adults, counts.children, booking.party_size)
  }
  return formatPartySummary(null, null, booking.party_size)
}

function mapBookingToPayload(booking: DeskBooking, profileMap: Record<string, GuestProfile>): RequestCardPayload {
  const guestProfile = profileMap[booking.user_id] ?? buildGuestProfile()
  const firstName = guestProfile.firstName || guestProfile.name
  const guestLabel = `${firstName}'s group of ${booking.party_size}`
  const imageSrc = guestProfile.avatarUrl ?? pickGuestImage(booking.id)
  const imageUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
  const partySummary = resolvePartySummary(booking)
  return {
    id: booking.id,
    status: booking.status,
    statusLabel: formatStatusLabel(booking.status),
    dateLabel: formatDateLabel(booking.date),
    partySize: booking.party_size,
    partySummary,
    arrivalWindow: formatArrivalValue(booking.requested_arrival_time, booking.arrival_window_start, booking.arrival_window_end),
    passLabel: formatPassLabel(booking.pass?.kind ?? null),
    priceLabel: formatPassPrice(
      booking.pass?.display_price_text ?? null,
      booking.pass?.min_spend_amount ?? booking.pass?.profile?.prepaidCreditAmountCents ?? null,
      booking.pass?.currency ?? 'USD'
    ),
    category: mapCategory(booking.pass?.kind ?? null),
    guestLabel,
    imageSrc,
    imageUnoptimized,
  }
}

export default async function DeskRequestsPage() {
  const { user } = await getUserRole()
  const venueId = user?.user_metadata?.venue_id as string | undefined
  if (!venueId) {
    notFound()
  }

  const requestedRaw = await fetchDeskBookings('requested', venueId)
  const guestProfiles = await fetchGuestProfilesByIds(requestedRaw.map((booking) => booking.user_id))
  const requested = requestedRaw.map((booking) => mapBookingToPayload(booking, guestProfiles))
  const totalRequests = requested.length
  const heading = `YOU HAVE ${totalRequests} REQUEST${totalRequests === 1 ? '' : 'S'} TO REVIEW`

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-12 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <RequestsClient bookings={requested} heading={heading} />
    </div>
  )
}
