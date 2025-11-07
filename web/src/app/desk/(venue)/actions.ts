'use server'

import { revalidatePath } from 'next/cache'
import {
  approveBooking,
  declineBooking,
  deskAction,
} from '@/lib/desk'

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

export async function autoApproveAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const enabledValue = formData.get('enabled')?.toString()
  if (!passId || enabledValue === undefined) throw new Error('auto approve payload missing')
  const enabled = enabledValue === 'true'
  await deskAction('set_auto_approve', { p_pass_id: passId, p_enabled: enabled })
  revalidatePath('/desk')
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
}

export async function pauseAction(formData: FormData) {
  const passId = formData.get('passId')?.toString()
  const date = formData.get('date')?.toString()
  const pausedValue = formData.get('paused')?.toString()
  if (!passId || !date || pausedValue === undefined) throw new Error('pause payload missing')
  const paused = pausedValue === 'true'
  await deskAction('set_paused', { p_pass_id: passId, p_date: date, p_paused: paused })
  revalidatePath('/desk')
}

export async function forceAuthorizeAction(formData: FormData) {
  const bookingId = formData.get('bookingId')?.toString()
  if (!bookingId) throw new Error('bookingId missing')
  await deskAction('force_authorize_now', { p_booking_id: bookingId })
  revalidatePath('/desk')
}
