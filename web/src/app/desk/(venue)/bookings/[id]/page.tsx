import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDeskBookingById, type DeskBooking } from '@/lib/desk'
import { getUserRole } from '@/lib/get-user-role'
import { cancelDeskBookingAction, forceAuthorizeAction, markArrivedAction, undoDeclineAction } from '../../actions'
import { buildGuestProfile, fetchGuestProfileById } from '@/lib/guest-profile'
import { buildArrivalDisplay } from '@/lib/arrival'
import { computePartyCountsFromAges, formatPartySummary } from '@/lib/party'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ from?: string; date?: string }>

const TIMELINE_STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'issued', label: 'Issued' },
  { key: 'redeemed', label: 'Arrived' },
] as const

const STATUS_PROGRESS: Record<string, number> = {
  requested: 0,
  approved: 1,
  issued: 2,
  pending_verification: 2,
  redeemed: 3,
  redeemed_late: 3,
  no_show: 3,
  cancelled: 3,
  declined: 3,
}

const FINAL_STATUS_COPY: Record<string, string> = {
  pending_verification: 'Guest did not scan before close — awaiting verification.',
  redeemed: 'Party marked as arrived. Hold released automatically.',
  redeemed_late: 'Marked as attended after verification window.',
  no_show: 'Guest was not seen on property. Hold captured.',
  cancelled: 'Booking was cancelled.',
  declined: 'Request was declined.',
}

const GUEST_PLACEHOLDER_IMAGES: readonly string[] = [
  '/guest-photos/guest-1.jpg',
  '/guest-photos/guest-2.jpg',
  '/guest-photos/guest-3.jpg',
  '/guest-photos/guest-4.png',
  '/guest-photos/guest-5.png',
  '/guest-photos/guest-6.png',
  '/guest-photos/guest-7.png',
]

function pickGuestImage(seed: string) {
  if (GUEST_PLACEHOLDER_IMAGES.length === 0) return ''
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % GUEST_PLACEHOLDER_IMAGES.length
  return GUEST_PLACEHOLDER_IMAGES[index]
}

function formatStatusLabel(status: string) {
  if (status === 'issued') return 'Pass issued'
  return status.replace(/_/g, ' ')
}

function formatDisplayDate(dateIso: string | null) {
  if (!dateIso) return 'Date to be confirmed'
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function formatCurrency(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null) return 'TBD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency ?? 'USD').toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100)
  } catch {
    return `$${(amount / 100).toFixed(0)}`
  }
}

function formatPassType(kind: string | null) {
  if (kind === 'MIN_SPEND') return 'Beach Club Pass — Min Spend'
  if (kind === 'BEACH_PASS') return 'Beach Club Pass'
  if (kind === 'DAY_PASS') return 'Day Pass'
  return 'Pass'
}

function formatContactPreferenceLabel(value: string | null) {
  if (!value) return 'No contact preference set'
  if (value === 'whatsapp') return 'Prefers WhatsApp'
  if (value === 'phone') return 'Prefers a phone call'
  return 'Prefers email'
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const search = await searchParams
  const { user } = await getUserRole()
  const venueId = user?.user_metadata?.venue_id as string | undefined
  if (!venueId) {
    notFound()
  }
  const booking = await fetchDeskBookingById(id, venueId)

  if (!booking || booking.status === 'requested') {
    notFound()
  }

  const statusLabelDisplay = formatStatusLabel(booking.status)
  const arrivalDisplay = buildArrivalDisplay(
    booking.requested_arrival_time,
    booking.arrival_window_start,
    booking.arrival_window_end
  )
  const arrivalLabel = arrivalDisplay.label
  const arrivalValue = arrivalDisplay.value
  const bookingDate = formatDisplayDate(booking.date)
  const holdAmount = formatCurrency(booking.hold_amount ?? null, booking.hold_currency ?? 'USD')
  const holdStatus = booking.hold_status ? booking.hold_status.replace(/_/g, ' ') : 'not authorized'
  const passLabel = formatPassType(booking.pass?.kind ?? null)
  const venueName = booking.pass?.venue?.name ?? 'Venue TBD'
  const guestProfile = (await fetchGuestProfileById(booking.user_id)) ?? buildGuestProfile()
  const guestLabel = `${guestProfile.firstName || guestProfile.name}'s group of ${booking.party_size}`
  const guestAvatarSrc = guestProfile.avatarUrl ?? pickGuestImage(booking.id)
  const guestAvatarUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
  const partySummary = resolvePartySummary(booking)
  const canMarkArrived = booking.status === 'issued' && Boolean(booking.qr_jti)
  const canForceAuthorize = booking.hold_status !== 'authorized' && booking.status !== 'cancelled'
  const canUndoDecline = booking.status === 'declined'
  const canDeskCancel = ['approved', 'issued', 'pending_verification'].includes(booking.status)

  const progressIndex = STATUS_PROGRESS[booking.status] ?? 0
  const timeline = TIMELINE_STEPS.map((step, index) => ({
    ...step,
    complete: index <= progressIndex,
    current: index === progressIndex,
  }))

  const backLink =
    search.from === 'calendar' && search.date
      ? { href: `/desk/calendar/${search.date}`, label: '← Back to calendar' }
      : { href: '/desk/bookings', label: '← Back to bookings' }

const detailRows = [
  { label: 'Venue', value: venueName },
  { label: 'Pass', value: passLabel },
  ...(booking.pass?.interlude_perk ? [{ label: 'Interlude perk', value: booking.pass.interlude_perk }] : []),
  { label: 'Date', value: bookingDate },
    { label: arrivalLabel, value: arrivalValue },
    { label: 'Guests', value: partySummary },
    { label: 'Hold amount', value: holdAmount },
    { label: 'Hold status', value: holdStatus },
    {
      label: 'Requested',
      value: booking.created_at ? formatDisplayDate(booking.created_at) : 'TBD',
    },
  ]

  const guestContactRows = [
    { label: 'Email', value: guestProfile.email ?? 'No email on file' },
    { label: 'Mobile', value: guestProfile.phone ?? 'No mobile number on file' },
    { label: 'Contact preference', value: formatContactPreferenceLabel(guestProfile.contactPreference) },
  ]

  const guestNotes = [
    { label: 'Dietary requirements', value: guestProfile.dietaryNotes || 'No dietary notes added' },
    { label: 'Personal preferences', value: guestProfile.loungePreferences || 'No preferences noted' },
  ]

  return (
    <div className="space-y-10 pb-16 text-[#02374D]">
      <Link href={backLink.href} className="text-sm text-[#02374D] hover:underline">
        {backLink.label}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6F716D]">Booking</p>
            <h1 className="text-3xl font-semibold uppercase tracking-wide">{venueName}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#02374D] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {statusLabelDisplay.toUpperCase()}
              </span>
              <span className="rounded-full bg-[#DDECEE] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#02374D]">
                {passLabel}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              {timeline.map((step, index) => (
                <div key={step.key} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-3 w-3 rounded-full ${
                      step.complete ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      step.complete ? 'text-emerald-700' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < timeline.length - 1 && (
                    <span
                      className={`hidden h-px w-10 sm:block ${
                        step.complete ? 'bg-emerald-200' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            {FINAL_STATUS_COPY[booking.status] && (
              <p className="text-sm text-gray-600">{FINAL_STATUS_COPY[booking.status]}</p>
            )}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{row.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">{row.value}</dd>
              </div>
            ))}
          </dl>
          {booking.pass?.interlude_perk && (
            <div className="rounded-[24px] border border-[#E8E4D7] bg-[#FFFCF5] px-5 py-4 text-sm text-[#02374D] shadow-[0px_2px_8px_rgba(0,0,0,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Interlude perk</p>
              <p className="mt-2 text-base text-black">{booking.pass.interlude_perk}</p>
            </div>
          )}

          <div className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 text-[#02374D]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-[#DBD8C9] bg-white shadow-[0px_10px_22px_rgba(0,0,0,0.12)]">
                <Image
                  src={guestAvatarSrc}
                  alt={guestProfile.name}
                  width={160}
                  height={160}
                  unoptimized={guestAvatarUnoptimized}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg font-semibold">{guestProfile.name}</p>
                <p className="text-xs uppercase tracking-[0.25em] text-[#6F716D]">
                  {formatContactPreferenceLabel(guestProfile.contactPreference)}
                </p>
                <p className="text-sm text-[#4F514D]">{partySummary}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              {guestContactRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">{row.label}</dt>
                  <dd className="mt-1 text-sm text-[#02374D]">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {guestNotes.map((note) => (
                <div key={note.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">{note.label}</p>
                  <p className="mt-1 text-sm text-[#02374D]">{note.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {(canMarkArrived || canDeskCancel) && (
              <div className="flex flex-wrap gap-3">
                {canMarkArrived && (
                  <form action={markArrivedAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="qrJti" value={booking.qr_jti ?? ''} />
                    <button className="rounded-full bg-[#02374D] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#02486A]">
                      Mark guest arrived
                    </button>
                  </form>
                )}
                {canDeskCancel && (
                  <form action={cancelDeskBookingAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="rounded-full border border-[#B4231F] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-[#B4231F] transition hover:border-[#F5B8B8] hover:bg-[#FCE1E1]/30">
                      Cancel booking
                    </button>
                  </form>
                )}
              </div>
            )}

            {canUndoDecline && (
              <form action={undoDeclineAction} className="flex flex-wrap gap-3">
                <input type="hidden" name="bookingId" value={booking.id} />
                <button className="rounded-full border border-[#0F172A] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white">
                  Undo decline
                </button>
              </form>
            )}

            {canUndoDecline && (
              <form action={undoDeclineAction} className="flex flex-wrap gap-3">
                <input type="hidden" name="bookingId" value={booking.id} />
                <button className="rounded-full border border-[#0F172A] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white">
                  Undo decline
                </button>
              </form>
            )}

            {canForceAuthorize && (
              <form action={forceAuthorizeAction} className="text-sm text-[#02374D]">
                <input type="hidden" name="bookingId" value={booking.id} />
                <button className="underline hover:text-[#02486A]">Force authorize hold now</button>
              </form>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-[#10324A] p-6 text-white shadow-lg">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Summary</h2>
            <p className="mt-4 text-lg font-semibold uppercase tracking-wide">{venueName}</p>
            <p className="mt-1 text-sm text-white/90">{bookingDate}</p>
            <div className="mt-6 space-y-1 text-sm">
              <p>{passLabel}</p>
              <p>{partySummary}</p>
              <p>{guestLabel}</p>
              <p>{arrivalValue}</p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 text-sm text-[#4F514D] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Hold summary</p>
            <p className="mt-2 text-lg font-semibold text-[#02374D]">{holdAmount}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Status · {holdStatus.toUpperCase()}</p>
            <p className="mt-4 text-sm">
              Holds authorize at 14:00 {booking.pass?.venue?.tz ?? 'America/Anguilla'} the day before arrival. Marking the guest as
              arrived will release the hold automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
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
