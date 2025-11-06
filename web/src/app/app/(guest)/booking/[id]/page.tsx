import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'react-qr-code'
import { fetchMemberBookingById } from '@/lib/bookings/member'
import CancelBookingForm from './cancel-booking-form'

type Params = Promise<{ id: string }>

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

function formatArrivalWindow(startIso: string | null, endIso: string | null) {
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
  return `${formatter.format(start)} – ${formatter.format(end)}`
}

export default async function BookingDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const booking = await fetchMemberBookingById(id)

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
  const showQr = booking.status === 'issued' && Boolean(booking.qr_jti)
  const arrivalWindow = formatArrivalWindow(booking.arrival_window_start, booking.arrival_window_end)
  const bookingDate = formatDisplayDate(booking.date)
  const showCancelAction = !['cancelled', 'declined', 'redeemed', 'redeemed_late', 'no_show'].includes(booking.status)

  const detailRows = [
    { label: 'Destination', value: booking.venue_name ?? 'Venue to be confirmed' },
    { label: 'Pass', value: booking.pass_kind ?? 'Pass' },
    { label: 'Date', value: bookingDate },
    { label: 'Guests', value: `${booking.party_size} ${booking.party_size === 1 ? 'Guest' : 'Guests'}` },
    { label: 'Arrival window', value: arrivalWindow },
    {
      label: 'Payment',
      value: 'Pay at venue. Your hold will release on arrival scan.',
    },
    {
      label: 'Cancellation',
      value: booking.can_cancel
        ? 'Free cancellation until your arrival window begins.'
        : 'Arrival window has started; contact support for changes.',
    },
  ]

  return (
    <div className="space-y-10 pb-16">
      <Link href="/app" className="text-sm text-gray-600 hover:text-gray-800 hover:underline">
        ← Back to wallet
      </Link>

      <div className="grid gap-10 lg:grid-cols-[2fr,1fr]">
        <section className="space-y-8 rounded-3xl bg-white/70 p-8 shadow-sm backdrop-blur">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Booking</p>
            <h1 className="text-3xl font-semibold uppercase tracking-wide">{booking.venue_name ?? 'Venue TBD'}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {booking.status.toUpperCase()}
              </span>
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                {booking.pass_kind ?? 'Pass'}
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
                    <span className={`hidden h-px w-10 sm:block ${step.complete ? 'bg-emerald-200' : 'bg-gray-300'}`} />
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
                <dd className="mt-1 text-sm text-gray-800">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center gap-4">
            {booking.hold_banner && (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{booking.hold_banner}</div>
            )}
            {showCancelAction && (
              <CancelBookingForm bookingId={booking.id} disabled={!booking.can_cancel} />
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-[#10324A] p-6 text-white shadow-lg">
            <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Summary</h2>
            <p className="mt-4 text-lg font-semibold uppercase tracking-wide">
              {booking.venue_name ?? 'Venue TBD'}
            </p>
            <p className="mt-1 text-sm text-white/90">{bookingDate}</p>
            <p className="mt-6 text-sm">
              {booking.pass_kind ?? 'Pass'} · Party {booking.party_size}
              <br />
              {arrivalWindow}
            </p>
          </div>

          {showQr ? (
            <div className="space-y-4 rounded-3xl bg-white p-6 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Show on arrival</p>
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-inner">
                <QRCode value={booking.qr_jti!} size={192} />
              </div>
              <p className="text-sm text-gray-600">We’ll scan this code to redeem your pass.</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white/70 p-6 text-sm text-gray-600 shadow-sm">
              <p>We’ll generate your QR once the venue issues the pass.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
