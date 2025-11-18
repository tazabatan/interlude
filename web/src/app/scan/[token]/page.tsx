import Link from 'next/link'
import { decodeScanToken } from '@/lib/scan-link'
import { getUserRole } from '@/lib/get-user-role'
import { serviceRoleFetch, serviceRoleRpc } from '@/lib/supabase/service-role'
import { fetchGuestProfileById } from '@/lib/guest-profile'
import { buildArrivalDisplay } from '@/lib/arrival'

type ScanParams = Promise<{ token: string }>

type ScanBooking = {
  id: string
  venue_id: string
  user_id: string | null
  status: string
  party_size: number
  date: string | null
  qr_jti: string | null
  arrival_window_start: string | null
  arrival_window_end: string | null
  requested_arrival_time: string | null
  pass: {
    kind: string | null
    display_price_text: string | null
    interlude_perk: string | null
  } | null
  venue: {
    name: string | null
  } | null
}

const SCAN_BOOKING_SELECT = [
  'id',
  'venue_id',
  'user_id',
  'status',
  'party_size',
  'date',
  'qr_jti',
  'arrival_window_start',
  'arrival_window_end',
  'requested_arrival_time',
  'pass:passes(kind,display_price_text,interlude_perk)',
  'venue:venues(name)',
].join(',')

function formatBookingDateLabel(dateIso: string | null) {
  if (!dateIso) return 'Date to be confirmed'
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Date to be confirmed'
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

async function fetchBookingForScan(bookingId: string): Promise<ScanBooking | null> {
  const params = new URLSearchParams()
  params.set('id', `eq.${bookingId}`)
  params.set('select', SCAN_BOOKING_SELECT)
  params.set('limit', '1')
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  const rows = (await res.json()) as ScanBooking[]
  return rows[0] ?? null
}

function isWithinArrivalWindow(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return true
  const now = Date.now()
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return true
  return now >= start && now <= end
}

function resolveStaffName(user: { email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  return (
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    user.email ??
    'Venue staff'
  )
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    const sanitized = error.message.replace(/^Supabase request failed \(\d+\):\s*/i, '').trim()
    return sanitized || 'Unable to redeem pass.'
  }
  return 'Unable to redeem pass.'
}

export default async function ScanPage({ params }: { params: ScanParams }) {
  const { token } = await params
  let decoded
  try {
    decoded = decodeScanToken(token)
  } catch (error) {
    return <ScanError title="Invalid QR code" message="This scan link is not recognized. Ask the guest to refresh their pass." />
  }

  const { user, role } = await getUserRole()
  if (!user) {
    return (
      <ScanError
        title="Sign in required"
        message="Use your venue desk login once on this device. Future scans will keep you signed in."
        actionLabel="Sign in"
        actionHref={`/auth?next=/scan/${token}`}
      />
    )
  }
  if (!['venue_manager', 'venue_staff'].includes(role)) {
    return <ScanError title="Access denied" message="You need venue staff access to check in guests." />
  }
  const venueId = (user.user_metadata?.venue_id as string | undefined) ?? null
  if (!venueId) {
    return <ScanError title="No venue linked" message="Your account is not assigned to a venue." />
  }

  const booking = await fetchBookingForScan(decoded.bookingId)
  if (!booking || booking.qr_jti !== decoded.qr) {
    return <ScanError title="Invalid QR code" message="This pass link is no longer valid. Ask the guest to refresh their wallet." />
  }
  if (booking.venue_id !== venueId) {
    return <ScanError title="Wrong venue" message="This pass belongs to a different venue." />
  }

  const guestProfile = booking.user_id ? await fetchGuestProfileById(booking.user_id) : null
  const arrivalDisplay = buildArrivalDisplay(
    booking.requested_arrival_time,
    booking.arrival_window_start,
    booking.arrival_window_end
  )
  const inWindow = isWithinArrivalWindow(booking.arrival_window_start, booking.arrival_window_end)

  let autoRedeemMessage: string | null = null
  let autoRedeemError: string | null = null
  let updatedStatus = booking.status

  if (booking.status === 'issued' && inWindow) {
    try {
      await serviceRoleRpc('fn_redeem', {
        _qr_jti: booking.qr_jti,
        _server_name: resolveStaffName(user),
        _table_ref: null,
      })
      updatedStatus = 'redeemed'
      autoRedeemMessage = 'Checked in automatically.'
    } catch (error) {
      autoRedeemError = formatError(error)
    }
  }

  const perk = booking.pass?.interlude_perk ?? booking.pass?.display_price_text ?? null
  const guestName = guestProfile?.name ?? 'Guest'
  const dietaryNotes = guestProfile?.dietaryNotes ?? 'None provided'
  const loungePref = guestProfile?.loungePreferences ?? 'None provided'
  const contactPref = guestProfile?.contactPreference ?? 'No preference'
  const bookingDateLabel = formatBookingDateLabel(booking.date)

  return (
    <div className="min-h-screen bg-[#F4F1E7] px-4 py-10 text-[#02374D] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6 rounded-[32px] bg-white p-6 shadow-[0px_15px_40px_rgba(0,0,0,0.08)]">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#6F716D]">Interlude Check-in</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{booking.venue?.name ?? 'Venue'}</h1>
              <p className="text-sm text-[#4F514D]">{bookingDateLabel}</p>
            </div>
            <StatusBadge status={updatedStatus} />
          </div>
          {autoRedeemMessage && <p className="text-sm text-emerald-600">{autoRedeemMessage}</p>}
          {autoRedeemError && <p className="text-sm text-[#B4231F]">{autoRedeemError}</p>}
        </header>

        <section className="rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Guest details</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Guest" value={guestName} />
            <DetailItem label="Party size" value={`${booking.party_size} guests`} />
            <DetailItem label={arrivalDisplay.label} value={arrivalDisplay.value} />
            <DetailItem label="Contact preference" value={contactPref} />
            <DetailItem label="Dietary notes" value={dietaryNotes} />
            <DetailItem label="Preferences" value={loungePref} />
            {perk ? <DetailItem label="Welcome perk" value={perk} /> : null}
          </div>
        </section>

        {!inWindow && updatedStatus === 'issued' ? (
          <section className="rounded-2xl border border-[#FCD34D] bg-[#FFF9E6] p-4 text-sm text-[#92400E]">
            Arrival window has not started yet. You can scan again once their window opens, or check them in from the Desk.
          </section>
        ) : null}

        <div className="flex justify-between text-sm text-[#4F514D]">
          <Link href="/desk/bookings" className="underline-offset-4 hover:underline">
            Open bookings
          </Link>
          <Link href="/desk" className="underline-offset-4 hover:underline">
            Desk home
          </Link>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">{label}</p>
      <p className="mt-1 text-sm text-[#02374D]">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.replace(/_/g, ' ')
  const colors: Record<string, string> = {
    redeemed: 'bg-emerald-100 text-emerald-700',
    redeemed_late: 'bg-emerald-100 text-emerald-700',
    issued: 'bg-[#D0F3EA] text-[#0D6B56]',
    pending_verification: 'bg-[#FDE68A] text-[#92400E]',
    cancelled: 'bg-[#FCE1E1] text-[#B4231F]',
    declined: 'bg-[#FCE1E1] text-[#B4231F]',
    no_show: 'bg-[#FDE6D5] text-[#9A3412]',
  }
  const classes = colors[status] ?? 'bg-[#E4E1D4] text-[#4F514D]'
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classes}`}>{normalized}</span>
}

function ScanError({
  title,
  message,
  actionLabel,
  actionHref,
}: {
  title: string
  message: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1E7] px-4 py-10 text-center text-[#02374D]">
      <div className="max-w-md space-y-4 rounded-[32px] bg-white p-6 shadow-[0px_15px_40px_rgba(0,0,0,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Interlude Check-in</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-[#4F514D]">{message}</p>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex rounded-full bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A]"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
