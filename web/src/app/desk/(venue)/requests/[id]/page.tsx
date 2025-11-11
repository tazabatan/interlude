import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDeskBookingById } from '@/lib/desk'
import {
  approveDefaultAction,
  approveCustomAction,
  declineAction,
  forceAuthorizeAction,
} from '../../actions'
import { buildGuestProfile, fetchGuestProfileById } from '@/lib/guest-profile'
import { buildArrivalDisplay } from '@/lib/arrival'

type Params = Promise<{ id: string }>
type SearchParams = Promise<{ from?: string; date?: string }>

const TIMELINE_STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'issued', label: 'Pass issued' },
  { key: 'redeemed', label: 'Redeemed' },
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

const FINAL_STATUS_LABEL: Record<string, string> = {
  cancelled: 'Booking cancelled',
  declined: 'Request declined',
  no_show: 'Marked as no-show',
  pending_verification: 'Awaiting verification',
}

const GUEST_PLACEHOLDER_IMAGES = [
  '/guest-photos/guest-1.jpg',
  '/guest-photos/guest-2.jpg',
  '/guest-photos/guest-3.jpg',
  '/guest-photos/guest-4.png',
  '/guest-photos/guest-5.png',
  '/guest-photos/guest-6.png',
  '/guest-photos/guest-7.png',
] as const

function formatStatusLabel(status: string) {
  return status === 'issued' ? 'Pass issued' : status.replace(/_/g, ' ')
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

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatPassType(kind: string | null) {
  if (kind === 'MIN_SPEND') return 'Min-spend pass'
  if (kind === 'DAY_PASS') return 'Day pass'
  return 'Pass'
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

function formatContactPreferenceLabel(value: string | null) {
  if (!value) return 'No contact preference set'
  if (value === 'whatsapp') return 'Prefers WhatsApp'
  if (value === 'phone') return 'Prefers a phone call'
  return 'Prefers email'
}

export default async function DeskRequestDetailPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const search = await searchParams
  const booking = await fetchDeskBookingById(id)

  if (!booking) {
    notFound()
  }

  const progressIndex = STATUS_PROGRESS[booking.status] ?? 0
  const timeline = TIMELINE_STEPS.map((step, index) => ({
    ...step,
    complete: index <= progressIndex,
    current: index === progressIndex,
  }))

  const finalStatus = FINAL_STATUS_LABEL[booking.status] ?? null
  const arrivalDisplay = buildArrivalDisplay(
    booking.requested_arrival_time,
    booking.arrival_window_start,
    booking.arrival_window_end
  )
  const arrivalValue = arrivalDisplay.value
  const bookingDate = formatDisplayDate(booking.date)
  const holdAmount = formatCurrency(booking.hold_amount ?? null, booking.hold_currency ?? 'USD')
  const holdStatus = booking.hold_status ? booking.hold_status.replace(/_/g, ' ') : 'not authorized'
  const guestProfile = (await fetchGuestProfileById(booking.user_id)) ?? buildGuestProfile()
  const guestLabel = `${guestProfile.name}'s group of ${booking.party_size}`
  const guestAvatarSrc = guestProfile.avatarUrl ?? pickGuestImage(booking.id)
  const guestAvatarUnoptimized = Boolean(guestProfile.avatarUrl) && guestProfile.avatarIsLocal
  const guestContactRows = [
    { label: 'Email', value: guestProfile.email ?? 'No email on file' },
    { label: 'Mobile', value: guestProfile.phone ?? 'No mobile number on file' },
    { label: 'Contact preference', value: formatContactPreferenceLabel(guestProfile.contactPreference) },
  ]
  const guestNotes = [
    { label: 'Dietary requirements', value: guestProfile.dietaryNotes || 'No dietary notes added' },
    { label: 'Personal preferences', value: guestProfile.loungePreferences || 'No preferences noted' },
  ]
  const passLabelBase = formatPassType(booking.pass?.kind ?? null)
  const passBadgeLabel = booking.pass?.kind === 'MIN_SPEND' ? 'Beach Pass' : passLabelBase
  const passDetailLabel = booking.pass?.kind === 'MIN_SPEND' ? 'Beach Pass — Min Spend' : passLabelBase
  const statusLabelDisplay = formatStatusLabel(booking.status)
  const passVenue = booking.pass?.venue?.name ?? 'Venue TBD'
  const defaultStartValue = toDateTimeLocal(booking.arrival_window_start)
  const defaultEndValue = toDateTimeLocal(booking.arrival_window_end)

  const backLink =
    search.from === 'calendar' && search.date
      ? { href: `/desk/calendar/${search.date}`, label: '← Back to calendar' }
      : { href: '/desk/requests', label: '← Back to requests' }

  const detailRows = [
    { label: 'Venue', value: passVenue },
    { label: 'Pass', value: passDetailLabel },
    { label: 'Date', value: bookingDate },
    { label: 'Guests', value: `Party of ${booking.party_size}` },
    { label: arrivalDisplay.label, value: arrivalValue },
    { label: 'Hold amount', value: holdAmount },
    { label: 'Hold status', value: holdStatus },
    {
      label: 'Requested',
      value: booking.created_at ? formatDisplayDate(booking.created_at) : 'TBD',
    },
  ]

  return (
    <div className="space-y-10 pb-16 text-[#02374D]">
      <Link href={backLink.href} className="text-sm text-[#02374D] hover:underline">
        {backLink.label}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-8 rounded-3xl bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6F716D]">Request</p>
            <h1 className="text-3xl font-semibold uppercase tracking-wide">{passVenue}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {statusLabelDisplay.toUpperCase()}
              </span>
              <span className="rounded-full bg-[#02374D] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {passBadgeLabel}
              </span>
            </div>
          </div>

          <div className="space-y-4">
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
            {finalStatus && <p className="text-sm text-gray-600">{finalStatus}</p>}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {detailRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{row.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">{row.value}</dd>
              </div>
            ))}
          </dl>

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
                <p className="text-sm text-[#4F514D]">Party of {booking.party_size}</p>
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

          <div className="space-y-6">
            <form action={approveDefaultAction} className="flex flex-wrap gap-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="rounded-full bg-[#02374D] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#02486A]">
                Approve with default window
              </button>
            </form>

            <form
              action={approveCustomAction}
              className="space-y-3 rounded-3xl border border-[#E8E4D7] bg-white/70 p-4 text-xs uppercase tracking-[0.25em] text-[#6F716D]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#02374D]">Custom arrival window</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span>Start</span>
                  <input
                    name="windowStart"
                    type="datetime-local"
                    defaultValue={defaultStartValue}
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-gray-700"
                  />
                </label>
                <label className="space-y-1">
                  <span>End</span>
                  <input
                    name="windowEnd"
                    type="datetime-local"
                    defaultValue={defaultEndValue}
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-gray-700"
                  />
                </label>
              </div>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="w-full rounded-full border border-[#02374D] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#02374D] transition hover:bg-[#02374D] hover:text-white">
                Approve with custom window
              </button>
            </form>

            <form
              action={declineAction}
              className="space-y-3 rounded-3xl border border-[#F5B8B8] bg-white/70 p-4 text-xs uppercase tracking-[0.25em] text-[#B4231F]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B4231F]">Decline request</p>
              <input type="hidden" name="bookingId" value={booking.id} />
              <label className="space-y-1 text-[#6F716D]">
                <span>Reason (optional)</span>
                <input
                  name="reason"
                  placeholder="e.g., capacity reached"
                  className="w-full rounded border border-[#F5B8B8] px-3 py-2 text-sm text-[#B4231F]"
                />
              </label>
              <button className="w-full rounded-full border border-[#B4231F] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#B4231F] transition hover:bg-[#FCE1E1]">
                Decline
              </button>
            </form>

            <form action={forceAuthorizeAction} className="text-sm text-[#02374D]">
              <input type="hidden" name="bookingId" value={booking.id} />
              <button className="underline hover:text-[#02486A]">Force authorize hold now</button>
            </form>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-[#10324A] p-6 text-white shadow-lg">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Summary</h2>
            <p className="mt-4 text-lg font-semibold uppercase tracking-wide">{passVenue}</p>
            <p className="mt-1 text-sm text-white/90">{bookingDate}</p>
            <p className="mt-6 text-sm">
              {passDetailLabel} · {guestLabel}
              <br />
              {arrivalValue}
            </p>
          </div>

          <div className="rounded-3xl bg-white/80 p-6 text-sm text-[#4F514D] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Hold summary</p>
            <p className="mt-2 text-lg font-semibold text-[#02374D]">{holdAmount}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Status · {holdStatus.toUpperCase()}</p>
            <p className="mt-4 text-sm">
              Holds authorize at 14:00 {booking.pass?.venue?.tz ?? 'America/Anguilla'} the day before arrival. Approvals will trigger
              scheduling automatically.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
