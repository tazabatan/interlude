'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { approveBooking, declineBooking, deskAction, fetchPassById, redeemBooking, undoDeclineBooking } from '@/lib/desk'
import { notifyBookingApproved, notifyBookingDeclined, notifyBookingCancelled } from '@/lib/email/triggers'
import { recordFeeDueEntryForBooking } from '@/lib/ledger'
import { getUserRole } from '@/lib/get-user-role'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

const VISIBILITY_VALUES = new Set(['members', 'guest_only', 'both', 'private'])
const PASS_STATUS_VALUES = new Set(['active', 'paused'])
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const DESK_CANCELLABLE_STATUSES = new Set(['approved', 'issued', 'pending_verification'])
const DESK_ROLES = new Set(['venue_manager', 'venue_staff'])
type RequestContext = {
  from?: string
  date?: string
}

type ParsedTime = {
  raw: string
  totalMinutes: number
}

function dollarsToCents(value: string | null): number | null {
  if (!value) return null
  const normalized = value.replace(/[^0-9.]/g, '')
  if (!normalized) return null
  const amount = Number(normalized)
  if (!Number.isFinite(amount)) throw new Error('Invalid amount')
  return Math.round(amount * 100)
}

function parseTimeInput(value: string | null, label: string): ParsedTime {
  if (!value) throw new Error(`${label} missing`)
  const match = value.match(TIME_PATTERN)
  if (!match) throw new Error(`Invalid ${label}`)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const normalized = `${match[1]}:${match[2]}`
  const total = hours * 60 + minutes
  return { raw: normalized, totalMinutes: total }
}

function minutesBetween(start: ParsedTime, end: ParsedTime) {
  return end.totalMinutes - start.totalMinutes
}

function clampToServiceHours(target: ParsedTime, open: ParsedTime, close: ParsedTime) {
  if (target.totalMinutes < open.totalMinutes) {
    return open
  }
  if (target.totalMinutes > close.totalMinutes) {
    return close
  }
  return target
}

function readRequestContext(formData: FormData): RequestContext {
  const from = formData.get('from')?.toString().trim()
  const date = formData.get('date')?.toString().trim()
  return {
    from: from || undefined,
    date: date || undefined,
  }
}

function shouldReturnInlineResult(formData: FormData) {
  const inlineFlag = formData.get('inline')?.toString()
  return inlineFlag === 'true'
}

function buildRequestDetailUrl(bookingId: string, params?: RequestContext & { error?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set('from', params.from)
  if (params?.date) searchParams.set('date', params.date)
  if (params?.error) searchParams.set('error', params.error)
  const query = searchParams.toString()
  return query ? `/desk/requests/${bookingId}?${query}` : `/desk/requests/${bookingId}`
}

function redirectToRequestDetail(bookingId: string, params?: RequestContext & { error?: string }) {
  redirect(buildRequestDetailUrl(bookingId, params))
}

function formatRequestError(error: unknown) {
  if (error instanceof Error) {
    const jsonStart = error.message.indexOf('{')
    if (jsonStart !== -1) {
      const jsonSlice = error.message.slice(jsonStart)
      try {
        const parsed = JSON.parse(jsonSlice) as { message?: string } | undefined
        if (parsed?.message && parsed.message.trim()) {
          return parsed.message
        }
      } catch {
        // ignore JSON parse errors and fall through
      }
    }
    const sanitized = error.message.replace(/^Supabase request failed \(\d+\):\s*/i, '').trim()
    if (sanitized) {
      return sanitized
    }
  }
  return 'Unable to approve this request right now. Please review capacity or try again.'
}

async function requireDeskAccess() {
  const { role, user } = await getUserRole()
  if (!user) {
    throw new Error('Not authenticated')
  }
  if (!DESK_ROLES.has(role)) {
    throw new Error('Desk access required')
  }
  const venueId = (user.user_metadata?.venue_id as string | undefined) ?? null
  if (!venueId) {
    throw new Error('No venue context')
  }
  return { role, user, venueId }
}

async function requireVenueManager() {
  const context = await requireDeskAccess()
  if (context.role !== 'venue_manager') {
    throw new Error('Only venue managers can update pass controls')
  }
  return context
}

export async function generateScannerTokenAction() {
  const { venueId } = await requireVenueManager()
  const token = randomUUID().replace(/-/g, '')
  await serviceRoleFetch(`/rest/v1/venues?id=eq.${venueId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      scan_device_token: token,
      scan_device_token_generated_at: new Date().toISOString(),
    }),
  })
  revalidatePath('/desk/scanner')
}

export async function approveDefaultAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const { venueId } = await requireDeskAccess()
  await ensureBookingAccess(bookingId, venueId)
  const context = readRequestContext(formData)
  const inlineResult = shouldReturnInlineResult(formData)
  try {
    await approveBooking({ bookingId, windowStart: null, windowEnd: null, issueNow: true })
    await notifyBookingApproved(bookingId)
  } catch (error) {
    const errorMessage = formatRequestError(error)
    if (inlineResult) {
      throw new Error(errorMessage)
    }
    redirectToRequestDetail(bookingId, { ...context, error: errorMessage })
  }
  revalidatePath('/desk')
  revalidatePath('/desk/requests')
  if (context.from === 'calendar') {
    if (context.date) {
      revalidatePath(`/desk/calendar/${context.date}`)
    }
    revalidatePath('/desk/calendar')
  }
}

export async function approveCustomAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const { venueId } = await requireDeskAccess()
  const windowStartRaw = formData.get('windowStart')?.toString().trim()
  const windowEndRaw = formData.get('windowEnd')?.toString().trim()
  const windowStart = windowStartRaw ? new Date(windowStartRaw).toISOString() : null
  const windowEnd = windowEndRaw ? new Date(windowEndRaw).toISOString() : null
  await ensureBookingAccess(bookingId, venueId)
  const inlineResult = shouldReturnInlineResult(formData)
  const context = readRequestContext(formData)
  try {
    await approveBooking({ bookingId, windowStart, windowEnd, issueNow: true })
    await notifyBookingApproved(bookingId)
  } catch (error) {
    const errorMessage = formatRequestError(error)
    if (inlineResult) {
      throw new Error(errorMessage)
    }
    redirectToRequestDetail(bookingId, { ...context, error: errorMessage })
  }
  revalidatePath('/desk')
  revalidatePath('/desk/requests')
  if (context.from === 'calendar') {
    if (context.date) {
      revalidatePath(`/desk/calendar/${context.date}`)
    }
    revalidatePath('/desk/calendar')
  }
}

export async function declineAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const { venueId } = await requireDeskAccess()
  await ensureBookingAccess(bookingId, venueId)
  const reason = formData.get('reason')?.toString().trim() || null
  await declineBooking({ bookingId, reason })
  await notifyBookingDeclined(bookingId, reason)
  revalidatePath('/desk')
}

export async function markArrivedAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  const qrJti = formData.get('qrJti')?.toString()
  if (!bookingId || !qrJti) throw new Error('bookingId and qrJti are required')
  const { user, venueId } = await requireDeskAccess()
  await ensureBookingAccess(bookingId, venueId)
  const serverName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Desk staff'
  await redeemBooking({ qrJti, serverName, tableRef: null })
  recordFeeDueEntryForBooking(bookingId).catch((error) => {
    console.error('[ledger] failed to record fee entry', error)
  })
  revalidatePath('/desk')
}

export async function markNoShowAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const { venueId } = await requireDeskAccess()
  const booking = await fetchBookingState(bookingId, venueId)
  if (!booking) throw new Error('Booking not found')
  if (!['issued', 'pending_verification'].includes(booking.status)) {
    throw new Error('Only issued bookings can be marked as a no-show')
  }
  const todayIso = new Date().toISOString().slice(0, 10)
  if (booking.date !== todayIso) {
    throw new Error('No-shows can only be reported on the arrival date')
  }

  if (booking.hold_status === 'authorized') {
    await serviceRoleFetch('/functions/v1/hold_capture', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    })
  } else {
    await markNoShowWithoutHold(bookingId, booking.status)
  }
  revalidatePath('/desk')
  revalidatePath(`/desk/bookings/${bookingId}`)
}

export async function cancelDeskBookingAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')

  const { user, venueId } = await requireDeskAccess()
  const actorId = user?.id ?? null
  const actorName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Desk staff'

  const booking = await fetchBookingState(bookingId, venueId)
  if (!booking) throw new Error('Booking not found')

  if (booking.status === 'cancelled') {
    revalidatePath('/desk')
    revalidatePath(`/desk/bookings/${bookingId}`)
    return
  }

  if (!DESK_CANCELLABLE_STATUSES.has(booking.status)) {
    throw new Error('Only approved or issued bookings can be cancelled')
  }

  await cancelBookingRecord({
    bookingId,
    status: booking.status,
    holdStatus: booking.hold_status,
    actorId,
    actorName,
  })
  await notifyBookingCancelled(bookingId, 'venue')

  revalidatePath('/desk')
  revalidatePath(`/desk/bookings/${bookingId}`)
}

export async function autoApproveAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  const enabledValue = formData.get('enabled')?.toString()
  if (!passId || enabledValue === undefined) throw new Error('auto approve payload missing')
  const enabled = enabledValue === 'true'
  await deskAction('set_auto_approve', { p_pass_id: passId, p_enabled: enabled })
  revalidatePath('/desk')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function dailyCapAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  const capValue = formData.get('cap')?.toString()
  const date = formData.get('date')?.toString()
  if (!passId || !capValue || !date) throw new Error('daily cap payload missing')
  const cap = Number(capValue)
  if (!Number.isFinite(cap) || cap < 0) throw new Error('cap must be a non-negative number')
  await deskAction('set_daily_cap', { p_pass_id: passId, p_date: date, p_cap: cap })
  revalidatePath('/desk')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function setDefaultCapAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  const capValue = formData.get('defaultCap')?.toString()
  if (!passId || capValue === undefined) throw new Error('passId and defaultCap required')
  const cap = Number(capValue)
  if (!Number.isFinite(cap) || cap < 0) throw new Error('cap must be a non-negative number')
  const safeCap = Math.floor(cap)
  await deskAction('set_default_cap', { p_pass_id: passId, pass_id: passId, cap: safeCap })
  revalidatePath(`/desk/passes/${passId}`)
}

export async function pauseAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  const date = formData.get('date')?.toString()
  const pausedValue = formData.get('paused')?.toString()
  if (!passId || !date || pausedValue === undefined) throw new Error('pause payload missing')
  const paused = pausedValue === 'true'
  await deskAction('set_paused', { p_pass_id: passId, p_date: date, p_paused: paused })
  revalidatePath('/desk')
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassStatusVisibilityAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  if (!passId) throw new Error('passId missing')
  const status = formData.get('status')?.toString() ?? undefined
  const visibility = formData.get('visibility')?.toString() ?? undefined
  const payload: Record<string, unknown> = { p_pass_id: passId, pass_id: passId }
  if (status) {
    if (!PASS_STATUS_VALUES.has(status)) throw new Error('Invalid status')
    payload.status = status
  }
  if (visibility) {
    if (!VISIBILITY_VALUES.has(visibility)) throw new Error('Invalid visibility')
    payload.visibility = visibility
  }
  if (!status && !visibility) throw new Error('No updates requested')
  await deskAction('update_pass_status_visibility', payload)
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassServiceHoursAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  const openRaw = formData.get('open')?.toString()
  const closeRaw = formData.get('close')?.toString()
  if (!passId) throw new Error('passId missing')
  const open = parseTimeInput(openRaw ?? null, 'open time')
  const close = parseTimeInput(closeRaw ?? null, 'close time')
  if (minutesBetween(open, close) <= 0) throw new Error('Close time must be after open time')
  await deskAction('update_pass_service_hours', {
    p_pass_id: passId,
    pass_id: passId,
    open: open.raw,
    close: close.raw,
  })
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassArrivalWindowAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  if (!passId) throw new Error('passId missing')
  const preset = formData.get('preset')?.toString()
  const graceValue = formData.get('graceMinutes')?.toString()
  let grace = Number(graceValue ?? '30')
  if (!Number.isFinite(grace) || grace < 0) grace = 30

  const pass = await fetchPassById(passId)
  if (!pass) throw new Error('Pass not found')

  const serviceOpen = parseTimeInput(pass.service_hours_open_local ?? '09:00', 'service open')
  const serviceClose = parseTimeInput(pass.service_hours_close_local ?? '18:00', 'service close')

  let startValue: string | null = null
  let endValue: string | null = null

  if (preset && preset !== 'custom') {
    const presetTargets: Record<string, [string, string]> = {
      'all-day': [serviceOpen.raw, serviceClose.raw],
      morning: [serviceOpen.raw, '11:00'],
      lunch: ['12:00', '14:00'],
      afternoon: ['14:00', '16:00'],
    }
    const target = presetTargets[preset]
    if (!target) throw new Error('Unknown preset')
    const presetStart = parseTimeInput(target[0], 'preset start')
    const presetEnd = parseTimeInput(target[1], 'preset end')
    const clampedStart = clampToServiceHours(presetStart, serviceOpen, serviceClose)
    const clampedEnd = clampToServiceHours(presetEnd, serviceOpen, serviceClose)
    startValue = clampedStart.raw
    endValue = clampedEnd.raw
  } else {
    startValue = formData.get('start')?.toString() ?? null
    endValue = formData.get('end')?.toString() ?? null
  }

  if (!startValue || !endValue) throw new Error('Start and end times are required')
  const start = parseTimeInput(startValue, 'start time')
  const end = parseTimeInput(endValue, 'end time')

  if (start.totalMinutes < serviceOpen.totalMinutes || end.totalMinutes > serviceClose.totalMinutes) {
    throw new Error('Custom window must be within service hours')
  }

  const windowMinutes = minutesBetween(start, end)
  if (windowMinutes <= 0) throw new Error('End time must be after start time')

  await deskAction('update_pass_arrival_window', {
    p_pass_id: passId,
    pass_id: passId,
    start_local: start.raw,
    minutes: windowMinutes,
    grace_minutes: Math.round(grace),
  })
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassPricingAction(formData: FormData) {
  await requireVenueManager()
  const passId = formData.get('passId')?.toString()
  const kind = formData.get('kind')?.toString()
  if (!passId || !kind) throw new Error('passId and kind required')

  const payload: Record<string, unknown> = { p_pass_id: passId, pass_id: passId }
  if (kind === 'MIN_SPEND') {
    const minSpend = dollarsToCents(formData.get('minSpend')?.toString() ?? null)
    const hold = dollarsToCents(formData.get('hold')?.toString() ?? null)
    if (minSpend === null || hold === null) throw new Error('Amounts required')
    payload.min_spend_amount = minSpend
    payload.no_show_amount_per_person = hold
  } else {
    const displayText = formData.get('displayText')?.toString()?.trim() ?? ''
    const hold = dollarsToCents(formData.get('hold')?.toString() ?? null)
    if (hold === null) throw new Error('Hold amount required')
    payload.display_price_text = displayText
    payload.no_show_amount_per_person = hold
  }
  const perk = formData.get('perk')?.toString()?.trim() ?? ''
  payload.interlude_perk = perk || null

  await deskAction('update_pass_pricing', payload)
  revalidatePath(`/desk/passes/${passId}`)
}

export async function pauseDayAction(params: { date: string; paused: boolean; passIds: string[] }) {
  await requireVenueManager()
  const { date, paused, passIds } = params
  if (!date) throw new Error('date missing')
  if (!Array.isArray(passIds) || passIds.length === 0) return
  const uniquePassIds = Array.from(new Set(passIds.filter(Boolean)))
  await Promise.all(
    uniquePassIds.map((passId) => deskAction('set_paused', { p_pass_id: passId, p_date: date, p_paused: paused }))
  )
  revalidatePath('/desk/calendar')
}

export async function undoDeclineAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const { venueId } = await requireDeskAccess()
  await ensureBookingAccess(bookingId, venueId)
  await undoDeclineBooking({ bookingId })
  revalidatePath('/desk')
  revalidatePath('/desk/requests')
  revalidatePath('/desk/calendar')
}

export async function setDayCapacityAction(params: { date: string; cap: number; passIds: string[] }) {
  await requireVenueManager()
  const { date, cap, passIds } = params
  if (!date) throw new Error('date missing')
  if (!Number.isFinite(cap) || cap < 0) throw new Error('cap must be a non-negative number')
  if (!Array.isArray(passIds) || passIds.length === 0) return
  const safeCap = Math.floor(cap)
  const uniquePassIds = Array.from(new Set(passIds.filter(Boolean)))
  await Promise.all(
    uniquePassIds.map((passId) => deskAction('set_daily_cap', { p_pass_id: passId, p_date: date, p_cap: safeCap }))
  )
  revalidatePath('/desk/calendar')
}

export async function forceAuthorizeAction(formData: FormData) {
  const { venueId } = await requireDeskAccess()
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  await ensureBookingAccess(bookingId, venueId)
  await serviceRoleFetch('/rest/v1/rpc/fn_force_authorize_now', {
    method: 'POST',
    body: JSON.stringify({ p_booking_id: bookingId }),
  })
  revalidatePath('/desk')
  revalidatePath(`/desk/bookings/${bookingId}`)
}

async function markNoShowWithoutHold(bookingId: string, currentStatus: string) {
  let latestStatus = currentStatus
  if (currentStatus === 'issued') {
    await updateBookingStatusWithAudit(bookingId, 'issued', 'pending_verification', { reason: 'manual_no_show' })
    latestStatus = 'pending_verification'
  }
  if (latestStatus !== 'pending_verification') {
    throw new Error('Invalid transition')
  }
  await updateBookingStatusWithAudit(bookingId, 'pending_verification', 'no_show', { reason: 'manual_no_show' })
}

async function updateBookingStatusWithAudit(
  bookingId: string,
  fromStatus: string,
  toStatus: string,
  meta: Record<string, unknown>
) {
  const params = new URLSearchParams({
    id: `eq.${bookingId}`,
    status: `eq.${fromStatus}`,
  })
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status: toStatus }),
  })
  const updated = (await res.json()) as unknown
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error('booking_state_conflict')
  }
  await serviceRoleFetch('/rest/v1/booking_audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: randomUUID(),
      booking_id: bookingId,
      from_status: fromStatus,
      to_status: toStatus,
      actor: null,
      meta,
    }),
  })
}

async function fetchBookingState(bookingId: string, venueId: string) {
  const params = new URLSearchParams({
    id: `eq.${bookingId}`,
    select: 'id,status,hold_status,venue_id,date',
    limit: '1',
  })
  params.set('venue_id', `eq.${venueId}`)
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  const rows = (await res.json()) as Array<{ id: string; status: string; hold_status: string | null; venue_id: string; date: string | null }>
  const booking = rows[0]
  if (!booking) return null
  if (booking.venue_id !== venueId) return null
  return booking
}

async function cancelBookingRecord(params: {
  bookingId: string
  status: string
  holdStatus: string | null
  actorId: string | null
  actorName: string
}) {
  const { bookingId, status, holdStatus, actorId, actorName } = params
  const searchParams = new URLSearchParams({
    id: `eq.${bookingId}`,
    status: `eq.${status}`,
  })
  const updateRes = await serviceRoleFetch(`/rest/v1/bookings?${searchParams.toString()}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })
  const updated = (await updateRes.json()) as unknown
  if (!Array.isArray(updated) || updated.length === 0) {
    throw new Error('booking_state_conflict')
  }

  await serviceRoleFetch('/rest/v1/booking_audit', {
    method: 'POST',
    body: JSON.stringify({
      id: randomUUID(),
      booking_id: bookingId,
      from_status: status,
      to_status: 'cancelled',
      actor: actorId,
      meta: { reason: 'desk_cancel', actor_name: actorName },
    }),
  })

  if (holdStatus === 'authorized') {
    await serviceRoleFetch('/rest/v1/due_jobs', {
      method: 'POST',
      body: JSON.stringify({
        id: randomUUID(),
        job_type: 'hold_cancel',
        booking_id: bookingId,
        run_at: new Date().toISOString(),
        status: 'queued',
        attempts: 0,
      }),
    })
  }
}

async function ensureBookingAccess(bookingId: string, venueId: string) {
  const params = new URLSearchParams({
    id: `eq.${bookingId}`,
    venue_id: `eq.${venueId}`,
    select: 'id',
    limit: '1',
  })
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  const rows = (await res.json()) as Array<{ id: string }>
  if (rows.length === 0) {
    throw new Error('Booking not found or forbidden')
  }
}
