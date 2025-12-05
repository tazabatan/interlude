import { notFound } from 'next/navigation'
import { fetchDeskBookings, type DeskBooking } from '@/lib/desk'
import { buildGuestProfile, fetchGuestProfilesByIds, type GuestProfile } from '@/lib/guest-profile'
import { RequestsClient, type RequestCardPayload, type PassCategory } from './client'
import { formatArrivalValue } from '@/lib/arrival'
import { getUserRole } from '@/lib/get-user-role'
import { computePartyCountsFromAges, formatPartySummary } from '@/lib/party'
import { formatPassPrice } from '@/lib/passes/helpers'
import { isPastArrivalCutoff } from '@/lib/time'

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

function mapCategory(kind: string | null): PassCategory {
  if (kind === 'MIN_SPEND') return 'beach'
  if (kind === 'DAY_PASS') return 'pool'
  return 'beach'
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
  const imageSrc = guestProfile.avatarUrl ?? '/icons/user-circle.svg'
  const imageUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
  const partySummary = resolvePartySummary(booking)
  const venueTz = booking.pass?.venue?.tz ?? booking.venue?.tz ?? 'America/Anguilla'
  const isExpired = isPastArrivalCutoff(booking.date, booking.arrival_window_start, venueTz, 60)
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
      booking.pass?.currency ?? 'USD',
      { venueName: booking.pass?.venue?.name ?? null }
    ),
    category: mapCategory(booking.pass?.kind ?? null),
    guestLabel,
    imageSrc,
    imageUnoptimized,
    isExpired,
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
  const activeCount = requested.filter((booking) => !booking.isExpired).length
  const heading = `YOU HAVE ${activeCount} REQUEST${activeCount === 1 ? '' : 'S'} TO REVIEW`

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-12 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <RequestsClient bookings={requested} heading={heading} />
    </div>
  )
}
