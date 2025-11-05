import { revalidatePath } from 'next/cache'
import {
  approveBooking,
  declineBooking,
  deskAction,
  fetchDeskBookings,
  type DeskBooking,
} from '@/lib/desk'

function uniquePasses(bookings: DeskBooking[]) {
  const map = new Map<string, NonNullable<DeskBooking['pass']>>()
  for (const booking of bookings) {
    if (booking.pass && !map.has(booking.pass_id)) {
      map.set(booking.pass_id, booking.pass)
    }
  }
  return map
}

function formatPassLabel(passId: string, pass: DeskBooking['pass']) {
  if (!pass) return passId
  return pass.venue?.name ?? pass.kind ?? passId
}

function formatDate(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

async function approveDefaultAction(formData: FormData) {
  'use server'
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  await approveBooking({ bookingId, windowStart: null, windowEnd: null, issueNow: true })
  revalidatePath('/desk')
}

async function approveCustomAction(formData: FormData) {
  'use server'
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const windowStartRaw = formData.get('windowStart')?.toString().trim()
  const windowEndRaw = formData.get('windowEnd')?.toString().trim()
  const windowStart = windowStartRaw ? new Date(windowStartRaw).toISOString() : null
  const windowEnd = windowEndRaw ? new Date(windowEndRaw).toISOString() : null
  await approveBooking({ bookingId, windowStart, windowEnd, issueNow: true })
  revalidatePath('/desk')
}

async function declineAction(formData: FormData) {
  'use server'
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const reason = formData.get('reason')?.toString().trim() || null
  await declineBooking({ bookingId, reason })
  revalidatePath('/desk')
}

async function autoApproveAction(formData: FormData) {
  'use server'
  const passId = formData.get('passId')?.toString()
  const enabledValue = formData.get('enabled')?.toString()
  if (!passId || enabledValue === undefined) throw new Error('auto approve payload missing')
  const enabled = enabledValue === 'true'
  await deskAction('set_auto_approve', { p_pass_id: passId, p_enabled: enabled })
  revalidatePath('/desk')
}

async function dailyCapAction(formData: FormData) {
  'use server'
  const passId = formData.get('passId')?.toString()
  const capValue = formData.get('cap')?.toString()
  const date = formData.get('date')?.toString()
  if (!passId || !capValue || !date) throw new Error('daily cap payload missing')
  const cap = Number(capValue)
  if (!Number.isFinite(cap) || cap < 0) throw new Error('cap must be a non-negative number')
  await deskAction('set_daily_cap', { p_pass_id: passId, p_date: date, p_cap: cap })
  revalidatePath('/desk')
}

async function pauseAction(formData: FormData) {
  'use server'
  const passId = formData.get('passId')?.toString()
  const date = formData.get('date')?.toString()
  const pausedValue = formData.get('paused')?.toString()
  if (!passId || !date || pausedValue === undefined) throw new Error('pause payload missing')
  const paused = pausedValue === 'true'
  await deskAction('set_paused', { p_pass_id: passId, p_date: date, p_paused: paused })
  revalidatePath('/desk')
}

async function forceAuthorizeAction(formData: FormData) {
  'use server'
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  await deskAction('force_authorize_now', { p_booking_id: bookingId })
  revalidatePath('/desk')
}

export default async function DeskPage() {
  const [requested, pending] = await Promise.all([
    fetchDeskBookings('requested'),
    fetchDeskBookings('pending_verification'),
  ])

  const bookings = [...requested, ...pending]
  const passMap = uniquePasses(bookings)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Decision Desk</h1>
          <p className="text-sm text-gray-600">
            Thin controls to exercise the hold engine. Uses service-role RPCs; restrict access in production.
          </p>
        </header>

        <div className="rounded border">
          <div className="border-b bg-gray-50 px-4 py-2 text-sm font-semibold">Requests</div>
          <div className="divide-y">
            {requested.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">No requested bookings.</div>
            ) : (
              requested.map((booking) => (
                <div key={booking.id} className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{formatPassLabel(booking.pass_id, booking.pass)}</div>
                    <div>
                      <span className="text-gray-500">Booking:</span> {booking.id}
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span> {formatDate(booking.date)} · party {booking.party_size}
                    </div>
                    <div>
                      <span className="text-gray-500">Default window:</span>{' '}
                      {booking.pass?.default_arrival_start_local ?? '12:00'} (
                      {booking.pass?.default_arrival_window_minutes ?? 60} min){' '}
                      {booking.pass?.venue?.tz ?? 'UTC'}
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <form action={approveDefaultAction} className="inline">
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button className="rounded bg-black px-3 py-1.5 text-white">
                        Approve (default window)
                      </button>
                    </form>

                    <form action={approveCustomAction} className="flex flex-col gap-2 md:flex-row md:items-end">
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <label className="flex flex-col text-xs uppercase text-gray-500">
                        Start
                        <input
                          name="windowStart"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(booking.arrival_window_start)}
                          className="rounded border px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="flex flex-col text-xs uppercase text-gray-500">
                        End
                        <input
                          name="windowEnd"
                          type="datetime-local"
                          defaultValue={toDateTimeLocal(booking.arrival_window_end)}
                          className="rounded border px-2 py-1 text-sm"
                        />
                      </label>
                      <button className="rounded border border-gray-300 px-3 py-1.5 text-sm">
                        Approve (custom window)
                      </button>
                    </form>

                    <form action={declineAction} className="flex flex-col gap-2 md:flex-row md:items-end">
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <label className="flex-1 text-xs uppercase text-gray-500">
                        Reason (optional)
                        <input
                          name="reason"
                          placeholder="No availability"
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        />
                      </label>
                      <button className="rounded border border-gray-300 px-3 py-1.5 text-sm text-red-600">
                        Decline
                      </button>
                    </form>

                    <form action={forceAuthorizeAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button className="text-xs text-blue-600 underline">Force authorize hold now</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Pending Verification</h2>
          <p className="text-sm text-gray-600">
            For now, view-only. Extend with mark attended / late scan actions as flows mature.
          </p>
        </header>
        <div className="rounded border">
          <div className="border-b bg-gray-50 px-4 py-2 text-sm font-semibold">24h Pending</div>
          <div className="divide-y">
            {pending.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">Nothing pending verification.</div>
            ) : (
              pending.map((booking) => (
                <div key={booking.id} className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{formatPassLabel(booking.pass_id, booking.pass)}</div>
                    <div>
                      <span className="text-gray-500">Booking:</span> {booking.id}
                    </div>
                    <div>
                      <span className="text-gray-500">Window:</span>{' '}
                      {formatDateTime(booking.arrival_window_start)} → {formatDateTime(booking.arrival_window_end)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    TODO: Late scan, mark attended, claims. Use this block to exercise those RPCs later.
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Controls</h2>
          <p className="text-sm text-gray-600">
            Directly invoke the desk_controls Edge Function. Handy for smoke tests while UI is thin.
          </p>
        </header>

        {passMap.size === 0 ? (
          <p className="text-sm text-gray-500">No passes in scope yet.</p>
        ) : (
          Array.from(passMap.entries()).map(([passId, pass]) => (
            <div key={passId} className="rounded border p-4 text-sm">
              <div className="mb-3 font-medium">{formatPassLabel(passId, pass)}</div>
              <div className="mb-3 text-xs text-gray-500">
                Default arrival: {pass.default_arrival_start_local ?? '12:00'} ·{' '}
                {pass.default_arrival_window_minutes ?? 60} min · TZ {pass.venue?.tz ?? 'UTC'}
              </div>

              <div className="flex flex-wrap gap-3">
                <form action={autoApproveAction}>
                  <input type="hidden" name="passId" value={passId} />
                  <input type="hidden" name="enabled" value="true" />
                  <button className="rounded border border-gray-300 px-3 py-1.5">Auto-approve ON</button>
                </form>
                <form action={autoApproveAction}>
                  <input type="hidden" name="passId" value={passId} />
                  <input type="hidden" name="enabled" value="false" />
                  <button className="rounded border border-gray-300 px-3 py-1.5">Auto-approve OFF</button>
                </form>

                <form action={dailyCapAction} className="flex items-center gap-2">
                  <input type="hidden" name="passId" value={passId} />
                  <input type="hidden" name="date" value={today} />
                  <label className="text-xs uppercase text-gray-500">
                    Daily cap
                    <input
                      name="cap"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="20"
                      className="ml-2 w-20 rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <button className="rounded border border-gray-300 px-3 py-1.5">Save</button>
                </form>

                <form action={pauseAction}>
                  <input type="hidden" name="passId" value={passId} />
                  <input type="hidden" name="date" value={today} />
                  <input type="hidden" name="paused" value="true" />
                  <button className="rounded border border-gray-300 px-3 py-1.5">Pause today</button>
                </form>
                <form action={pauseAction}>
                  <input type="hidden" name="passId" value={passId} />
                  <input type="hidden" name="date" value={today} />
                  <input type="hidden" name="paused" value="false" />
                  <button className="rounded border border-gray-300 px-3 py-1.5">Resume today</button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
