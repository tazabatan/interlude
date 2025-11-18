import {
  sendBookingApprovedEmail,
  sendBookingRequestedEmail,
  sendBookingDeclinedEmail,
  sendBookingCancelledEmail,
  sendDayOfReminderEmail,
  sendHoldStatusEmail,
  sendNoScanNoticeEmail,
  type HoldStatusEmailPayload,
} from '@/emails'
import {
  buildBookingApprovedEmailPayload,
  buildBookingRequestedEmailPayload,
  buildBookingDeclinedEmailPayload,
  buildBookingCancelledEmailPayload,
  buildDayOfReminderEmailPayload,
  buildHoldStatusEmailPayload,
  buildNoScanEmailPayload,
} from './payload-builders'

export async function notifyBookingRequested(bookingId: string) {
  try {
    const payload = await buildBookingRequestedEmailPayload(bookingId)
    if (!payload) return
    await sendBookingRequestedEmail(payload)
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

export async function notifyBookingCancelled(bookingId: string, cancelledBy: string) {
  try {
    const payload = await buildBookingCancelledEmailPayload(bookingId, cancelledBy)
    if (!payload) return
    await sendBookingCancelledEmail(payload)
  } catch (error) {
    console.error('[email] failed to send booking cancelled email', error)
  }
}
