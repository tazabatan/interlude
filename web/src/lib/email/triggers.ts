import {
  sendBookingApprovedEmail,
  sendBookingRequestedEmail,
  sendBookingRequestedVenueEmail,
  sendBookingDeclinedEmail,
  sendBookingCancelledEmail,
  sendDayOfReminderEmail,
  sendHoldStatusEmail,
  sendNoScanNoticeEmail,
  type HoldStatusEmailPayload,
} from '@/emails'
import type { BookingCancelledEmailPayload } from '@/emails/types'
import {
  buildBookingApprovedEmailPayload,
  buildBookingRequestedEmailPayload,
  buildBookingRequestedVenueEmailPayload,
  buildBookingDeclinedEmailPayload,
  buildBookingCancelledEmailPayload,
  buildDayOfReminderEmailPayload,
  buildHoldStatusEmailPayload,
  buildNoScanEmailPayload,
} from './payload-builders'
import { sendBookingRequestWhatsApp } from '@/lib/whatsapp'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

const STAFF_ROLES = 'in.(venue_manager,venue_staff)'

type StaffRecipient = { email: string; name?: string | null }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

async function fetchVenueIdForBooking(bookingId: string): Promise<string | null> {
  const params = new URLSearchParams({
    id: `eq.${bookingId}`,
    select: 'venue_id,pass:passes(venue_id)',
    limit: '1',
  })
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  const rows = (await res.json().catch(() => [])) as Array<{ venue_id?: string | null; pass?: { venue_id?: string | null } }>
  const row = Array.isArray(rows) ? rows[0] : null
  return row?.venue_id ?? row?.pass?.venue_id ?? null
}

async function fetchVenueStaffEmails(venueId: string | null): Promise<StaffRecipient[]> {
  if (!venueId) return []
  const params = new URLSearchParams({
    select: 'email,raw_user_meta_data',
    'raw_user_meta_data->>venue_id': `eq.${venueId}`,
    'raw_user_meta_data->>app_role': STAFF_ROLES,
  })
  const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?${params.toString()}`)
  const rows = (await res.json().catch(() => [])) as Array<{ email?: string | null; raw_user_meta_data?: Record<string, unknown> | null }>
  const recipients: StaffRecipient[] = []
  for (const row of rows ?? []) {
    const meta = (row.raw_user_meta_data ?? {}) as Record<string, unknown>
    const email =
      (meta.email as string | undefined)?.trim() ||
      (row.email as string | undefined)?.trim() ||
      ''
    if (!EMAIL_RE.test(email)) continue
    const name =
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      null
    recipients.push({ email, name })
  }
  const seen = new Set<string>()
  return recipients.filter((recipient) => {
    if (seen.has(recipient.email)) return false
    seen.add(recipient.email)
    return true
  })
}

export async function notifyBookingRequested(bookingId: string) {
  try {
    const payload = await buildBookingRequestedEmailPayload(bookingId)
    if (!payload) return
    await sendBookingRequestedEmail(payload)
    await sendBookingRequestWhatsApp(bookingId)

    const venuePayload = await buildBookingRequestedVenueEmailPayload(bookingId)
    if (venuePayload) {
      const venueId = await fetchVenueIdForBooking(bookingId)
      const recipients = await fetchVenueStaffEmails(venueId)
      await Promise.all(
        recipients.map((recipient) =>
          sendBookingRequestedVenueEmail({
            ...venuePayload,
            recipient,
          })
        )
      )
    }
  } catch (error) {
    console.error('[email] failed to send booking requested email', error)
  }
}

export async function notifyBookingApproved(bookingId: string) {
  try {
    const payload = await buildBookingApprovedEmailPayload(bookingId)
    if (!payload) return
    await sendBookingApprovedEmail(payload)
  } catch (error) {
    console.error('[email] failed to send booking approved email', error)
  }
}

export async function notifyDayOfReminder(bookingId: string) {
  try {
    const payload = await buildDayOfReminderEmailPayload(bookingId)
    if (!payload) return
    await sendDayOfReminderEmail(payload)
  } catch (error) {
    console.error('[email] failed to send day-of reminder email', error)
  }
}

export async function notifyHoldStatus(
  bookingId: string,
  variant: HoldStatusEmailPayload['variant'],
  statusDateIso?: string | null
) {
  try {
    const payload = await buildHoldStatusEmailPayload(bookingId, variant, statusDateIso)
    if (!payload) return
    await sendHoldStatusEmail(payload)
  } catch (error) {
    console.error('[email] failed to send hold status email', error)
  }
}

export async function notifyNoScanNotice(bookingId: string, reviewDeadlineIso: string) {
  try {
    const payload = await buildNoScanEmailPayload(bookingId, reviewDeadlineIso)
    if (!payload) return
    await sendNoScanNoticeEmail(payload)
  } catch (error) {
    console.error('[email] failed to send no-scan notice email', error)
  }
}

export async function notifyBookingDeclined(bookingId: string, reason?: string | null) {
  try {
    const payload = await buildBookingDeclinedEmailPayload(bookingId, reason ?? null)
    if (!payload) return
    await sendBookingDeclinedEmail(payload)
  } catch (error) {
    console.error('[email] failed to send booking declined email', error)
  }
}

export async function notifyBookingCancelled(
  bookingId: string,
  cancelledBy: BookingCancelledEmailPayload['cancelledBy']
) {
  try {
    const payload = await buildBookingCancelledEmailPayload(bookingId, cancelledBy)
    if (!payload) return
    await sendBookingCancelledEmail(payload)
  } catch (error) {
    console.error('[email] failed to send booking cancelled email', error)
  }
}
