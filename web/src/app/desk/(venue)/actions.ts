'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { approveBooking, declineBooking, deskAction, fetchPassById, redeemBooking, undoDeclineBooking } from '@/lib/desk'
import { getUserRole } from '@/lib/get-user-role'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

const VISIBILITY_VALUES = new Set(['members', 'guest_only', 'both', 'private'])
const PASS_STATUS_VALUES = new Set(['active', 'paused'])
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
const DESK_CANCELLABLE_STATUSES = new Set(['approved', 'issued', 'pending_verification'])

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

export async function approveDefaultAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  await approveBooking({ bookingId, windowStart: null, windowEnd: null, issueNow: true })
  revalidatePath('/desk')
}

export async function approveCustomAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const windowStartRaw = formData.get('windowStart')?.toString().trim()
  const windowEndRaw = formData.get('windowEnd')?.toString().trim()
  const windowStart = windowStartRaw ? new Date(windowStartRaw).toISOString() : null
  const windowEnd = windowEndRaw ? new Date(windowEndRaw).toISOString() : null
  await approveBooking({ bookingId, windowStart, windowEnd, issueNow: true })
  revalidatePath('/desk')
}

export async function declineAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  const reason = formData.get('reason')?.toString().trim() || null
  await declineBooking({ bookingId, reason })
  revalidatePath('/desk')
}

export async function markArrivedAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  const qrJti = formData.get('qrJti')?.toString()
  if (!bookingId || !qrJti) throw new Error('bookingId and qrJti are required')
  const { user } = await getUserRole()
  const serverName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Desk staff'
  await redeemBooking({ qrJti, serverName, tableRef: null })
  revalidatePath('/desk')
}

export async function cancelDeskBookingAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')

  const { user } = await getUserRole()
  const actorId = user?.id ?? null
  const actorName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    'Desk staff'

  const booking = await fetchBookingState(bookingId)
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

  revalidatePath('/desk')
  revalidatePath(`/desk/bookings/${bookingId}`)
}

export async function autoApproveAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const enabledValue = formData.get('enabled')?.toString()
  if (!passId || enabledValue === undefined) throw new Error('auto approve payload missing')
  const enabled = enabledValue === 'true'
  await deskAction('set_auto_approve', { p_pass_id: passId, p_enabled: enabled })
  revalidatePath('/desk')
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function dailyCapAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const capValue = formData.get('cap')?.toString()
  const date = formData.get('date')?.toString()
  if (!passId || !capValue || !date) throw new Error('daily cap payload missing')
  const cap = Number(capValue)
  if (!Number.isFinite(cap) || cap < 0) throw new Error('cap must be a non-negative number')
  await deskAction('set_daily_cap', { p_pass_id: passId, p_date: date, p_cap: cap })
  revalidatePath('/desk')
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function setDefaultCapAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const capValue = formData.get('defaultCap')?.toString()
  if (!passId || capValue === undefined) throw new Error('passId and defaultCap required')
  const cap = Number(capValue)
  if (!Number.isFinite(cap) || cap < 0) throw new Error('cap must be a non-negative number')
  const safeCap = Math.floor(cap)
  await deskAction('set_default_cap', { p_pass_id: passId, pass_id: passId, cap: safeCap })
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function pauseAction(formData: FormData) {
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
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassServiceHoursAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const openRaw = formData.get('open')?.toString()
  const closeRaw = formData.get('close')?.toString()
  if (!passId) throw new Error('passId missing')
  const open = parseTimeInput(openRaw, 'open time')
  const close = parseTimeInput(closeRaw, 'close time')
  if (minutesBetween(open, close) <= 0) throw new Error('Close time must be after open time')
  await deskAction('update_pass_service_hours', {
    p_pass_id: passId,
    pass_id: passId,
    open: open.raw,
    close: close.raw,
  })
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassArrivalWindowAction(formData: FormData) {
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
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function updatePassPricingAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const kind = formData.get('kind')?.toString()
  if (!passId || !kind) throw new Error('passId and kind required')

  const payload: Record<string, unknown> = { p_pass_id: passId, pass_id: passId }
  if (kind === 'MIN_SPEND') {
    const minSpend = dollarsToCents(formData.get('minSpend')?.toString())
    const hold = dollarsToCents(formData.get('hold')?.toString())
    if (minSpend === null || hold === null) throw new Error('Amounts required')
    payload.min_spend_amount = minSpend
    payload.no_show_amount_per_person = hold
  } else {
    const displayText = formData.get('displayText')?.toString()?.trim() ?? ''
    const hold = dollarsToCents(formData.get('hold')?.toString())
    if (hold === null) throw new Error('Hold amount required')
    payload.display_price_text = displayText
    payload.no_show_amount_per_person = hold
  }

  await deskAction('update_pass_pricing', payload)
  revalidatePath('/desk/passes')
  revalidatePath(`/desk/passes/${passId}`)
}

export async function pauseDayAction(params: { date: string; paused: boolean; passIds: string[] }) {
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
  await undoDeclineBooking({ bookingId })
  revalidatePath('/desk')
  revalidatePath('/desk/requests')
  revalidatePath('/desk/calendar')
}

export async function setDayCapacityAction(params: { date: string; cap: number; passIds: string[] }) {
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
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  await deskAction('force_authorize_now', { p_booking_id: bookingId })
  revalidatePath('/desk')
}

async function fetchBookingState(bookingId: string) {
  const params = new URLSearchParams({
    id: `eq.${bookingId}`,
    select: 'id,status,hold_status',
    limit: '1',
  })
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  const rows = (await res.json()) as Array<{ id: string; status: string; hold_status: string | null }>
  return rows[0] ?? null
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
