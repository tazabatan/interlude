import { notFound } from 'next/navigation'
import { fetchDeskBookings, fetchDeskBookingsByStatuses, type DeskBooking } from '@/lib/desk'
import { buildGuestProfile, fetchGuestProfilesByIds, type GuestProfile } from '@/lib/guest-profile'
import { getUserRole } from '@/lib/get-user-role'
import { BookingsClient } from './client'
import { formatArrivalValue } from '@/lib/arrival'
import { computePartyCountsFromAges, formatPartySummary } from '@/lib/party'
import { formatPassPrice } from '@/lib/passes/helpers'

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

function mapBooking(booking: DeskBooking, profileMap: Record<string, GuestProfile>, todayIso: string) {
  const dateLabel = formatDateLabel(booking.date)
  const arrivalWindow = formatArrivalValue(
    booking.requested_arrival_time,
    booking.arrival_window_start,
    booking.arrival_window_end
  )
  const passLabel = formatPassLabel(booking.pass?.kind ?? null)
  const fallbackPrice = booking.pass?.min_spend_amount ?? booking.pass?.profile?.prepaidCreditAmountCents ?? null
  const priceLabel = formatPassPrice(
    booking.pass?.display_price_text ?? null,
    fallbackPrice,
    booking.pass?.currency ?? 'USD',
    { venueName: booking.pass?.venue?.name ?? null }
  )
  const isToday = booking.date === todayIso
  const isDeclined = booking.status === 'declined'
  const isCancelled = booking.status === 'cancelled'
  const isNoShow = booking.status === 'no_show'
  const segment = isDeclined || isCancelled
    ? 'cancelled'
    : isNoShow
      ? 'no_show'
      : isToday
        ? 'today'
        : new Date(booking.date) > new Date(todayIso)
        ? 'upcoming'
        : 'past'

  const canMarkArrived = isToday && booking.status === 'issued'
  const ctaLabel = isDeclined ? 'Undo Decline' : canMarkArrived ? 'Mark Arrived' : null
  const guestProfile = profileMap[booking.user_id] ?? buildGuestProfile()
  const contactName = `${booking.guest_first_name ?? ''} ${booking.guest_last_name ?? ''}`.trim()
  const resolvedName = contactName || guestProfile.name
  const resolvedFirst = contactName.split(' ')[0] || guestProfile.firstName || resolvedName
  const guestLabel = `${resolvedFirst}'s group of ${booking.party_size}`
  const imageSrc = guestProfile.avatarUrl ?? '/icons/user-circle.svg'
  const imageUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
  const paymentState = mapPaymentState(booking.hold_status)
  const category = mapCategory(booking.pass?.kind ?? null)
  const partySummary = resolvePartySummary(booking)
  const interludePerk = booking.pass?.interlude_perk ?? null

  return {
    id: booking.id,
    dateLabel,
    arrivalWindow,
    passLabel,
    priceLabel,
    statusLabel: formatStatusLabel(booking.status),
    partySize: booking.party_size,
    partySummary,
    isDeclined,
    isCancelled,
    isToday,
    ctaLabel,
    segment,
    interludePerk,
    guestLabel,
    imageSrc,
    imageUnoptimized,
    detailHref: `/desk/bookings/${booking.id}`,
    status: booking.status,
    category,
    paymentStateKey: paymentState.key,
    paymentStateLabel: paymentState.label,
    qrJti: booking.qr_jti,
    guestDetails: {
      name: resolvedName,
      email: booking.guest_email ?? guestProfile.email,
      phone: booking.guest_phone ?? guestProfile.phone,
      contactPreference: guestProfile.contactPreference,
      dietaryNotes: guestProfile.dietaryNotes,
      loungePreferences: guestProfile.loungePreferences,
      partySize: booking.party_size,
      partySummary,
      interludePerk,
      arrival: arrivalWindow,
      avatarUrl: imageSrc,
      avatarUnoptimized: imageUnoptimized,
    },
  }
}

function mapPending(booking: DeskBooking) {
  const partySummary = resolvePartySummary(booking)
  return {
    id: booking.id,
    dateLabel: formatDateLabel(booking.date),
    arrivalWindow: formatArrivalValue(null, booking.arrival_window_start, booking.arrival_window_end),
    statusLabel: booking.status.replace(/_/g, ' '),
    partySize: booking.party_size,
    partySummary,
  }
}

export type BookingCardPayload = ReturnType<typeof mapBooking>

export default async function DeskBookingsPage() {
  const { user } = await getUserRole()
  const venueId = user?.user_metadata?.venue_id as string | undefined
  if (!venueId) {
    notFound()
  }

  const todayIso = new Date().toISOString().slice(0, 10)
  const [primaryRaw, pendingRaw] = await Promise.all([
    fetchDeskBookingsByStatuses(
      ['approved', 'issued', 'redeemed', 'redeemed_late', 'declined', 'cancelled', 'no_show'],
      venueId
    ),
    fetchDeskBookings('pending_verification', venueId),
  ])

  const guestProfiles = await fetchGuestProfilesByIds(primaryRaw.map((booking) => booking.user_id))
  const primaryBookings = primaryRaw.map((booking) => mapBooking(booking, guestProfiles, todayIso))
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
              Status · {booking.statusLabel.toUpperCase()} · {booking.partySummary ?? `Party ${booking.partySize}`}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
