import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchDeskBookingById } from '@/lib/desk'
import { forceAuthorizeAction, markArrivedAction, undoDeclineAction } from '../../actions'

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

function formatArrivalWindow(startIso: string | null, endIso: string | null, tzHint?: string | null) {
  if (!startIso || !endIso) return 'Arrival window to be confirmed'
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Arrival window to be confirmed'
  }
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(start)} – ${formatter.format(end)}${tzHint ? ` ${tzHint}` : ''}`
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
  if (kind === 'MIN_SPEND') return 'Beach Pass — Min Spend'
  if (kind === 'DAY_PASS') return 'Day Pass'
  return 'Pass'
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
  const booking = await fetchDeskBookingById(id)

  if (!booking || booking.status === 'requested') {
    notFound()
  }

  const statusLabelDisplay = formatStatusLabel(booking.status)
  const arrivalWindow = formatArrivalWindow(
    booking.arrival_window_start,
    booking.arrival_window_end,
    booking.pass?.venue?.tz ?? null
  )
  const bookingDate = formatDisplayDate(booking.date)
  const holdAmount = formatCurrency(booking.hold_amount ?? null, booking.hold_currency ?? 'USD')
  const holdStatus = booking.hold_status ? booking.hold_status.replace(/_/g, ' ') : 'not authorized'
  const passLabel = formatPassType(booking.pass?.kind ?? null)
  const venueName = booking.pass?.venue?.name ?? 'Venue TBD'
  const guestLabel = `TBD Name's group of ${booking.party_size}`
  const canMarkArrived = booking.status === 'issued' && Boolean(booking.qr_jti)
  const canForceAuthorize = booking.hold_status !== 'authorized' && booking.status !== 'cancelled'
  const canUndoDecline = booking.status === 'declined'

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
    { label: 'Date', value: bookingDate },
    { label: 'Arrival window', value: arrivalWindow },
    { label: 'Guests', value: `Party of ${booking.party_size}` },
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

          <div className="space-y-4">
            {canMarkArrived && (
              <form action={markArrivedAction} className="flex flex-wrap gap-3">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="qrJti" value={booking.qr_jti ?? ''} />
                <button className="rounded-full bg-[#02374D] px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[#02486A]">
                  Mark guest arrived
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
            <p className="mt-6 text-sm">
              {passLabel} · {guestLabel}
              <br />
              {arrivalWindow}
            </p>
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
