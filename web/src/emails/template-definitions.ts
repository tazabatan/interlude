import type { TemplateId, TemplatePayload } from '@/emails'
import {
  buildBookingApprovedSample,
  buildDayOfReminderSample,
  buildHoldStatusSample,
  buildNoScanSample,
  buildBookingRequestedSample,
  buildBookingRequestedVenueSample,
  buildBookingDeclinedSample,
  buildBookingCancelledSample,
  buildAccountWelcomeSample,
  buildStatementReadySample,
  buildConfirmEmailSample,
  buildPasswordChangedSample,
  buildPasswordResetSample,
} from '@/emails/dev-samples'

export type EmailTemplateDefinition = {
  key: string
  label: string
  templateId: TemplateId
  buildPayload: () => TemplatePayload<TemplateId>
}

export const EMAIL_TEMPLATE_DEFINITIONS: EmailTemplateDefinition[] = [
  {
    key: 'approval',
    label: 'Booking Approved',
    templateId: 'booking-approved',
    buildPayload: buildBookingApprovedSample,
  },
  {
    key: 'request_received',
    label: 'Booking Requested',
    templateId: 'booking-requested',
    buildPayload: buildBookingRequestedSample,
  },
  {
    key: 'request_received_venue',
    label: 'Booking Requested (Venue)',
    templateId: 'booking-requested-venue',
    buildPayload: buildBookingRequestedVenueSample,
  },
  {
    key: 'day_of_reminder',
    label: 'Day-of Reminder',
    templateId: 'day-of-reminder',
    buildPayload: buildDayOfReminderSample,
  },
  {
    key: 'hold_authorized',
    label: 'Hold Authorized',
    templateId: 'hold-status',
    buildPayload: () => buildHoldStatusSample('authorized'),
  },
  {
    key: 'hold_released',
    label: 'Hold Released',
    templateId: 'hold-status',
    buildPayload: () => buildHoldStatusSample('released'),
  },
  {
    key: 'hold_captured',
    label: 'Hold Captured (No-show)',
    templateId: 'hold-status',
    buildPayload: () => buildHoldStatusSample('captured'),
  },
  {
    key: 'no_scan_notice',
    label: 'No-Scan Notice',
    templateId: 'no-scan',
    buildPayload: buildNoScanSample,
  },
  {
    key: 'booking_declined',
    label: 'Booking Declined',
    templateId: 'booking-declined',
    buildPayload: buildBookingDeclinedSample,
  },
  {
    key: 'booking_cancelled',
    label: 'Booking Cancelled',
    templateId: 'booking-cancelled',
    buildPayload: buildBookingCancelledSample,
  },
  {
    key: 'account_welcome',
    label: 'Account Welcome',
    templateId: 'account-welcome',
    buildPayload: buildAccountWelcomeSample,
  },
  {
    key: 'weekly_statement',
    label: 'Venue Weekly Statement',
    templateId: 'statement-ready',
    buildPayload: buildStatementReadySample,
  },
  {
    key: 'confirm_email',
    label: 'Confirm Email',
    templateId: 'confirm-email',
    buildPayload: buildConfirmEmailSample,
  },
  {
    key: 'password_changed',
    label: 'Password Changed',
    templateId: 'password-changed',
    buildPayload: buildPasswordChangedSample,
  },
  {
    key: 'password_reset',
    label: 'Password Reset',
    templateId: 'password-reset',
    buildPayload: buildPasswordResetSample,
  },
]

export function buildSamplePayloadForKey(key: string) {
  let definition = EMAIL_TEMPLATE_DEFINITIONS.find((entry) => entry.key === key)
  if (!definition) {
    definition = EMAIL_TEMPLATE_DEFINITIONS.find((entry) => entry.templateId === key)
  }
  if (!definition) {
    throw new Error(`Unknown email template key: ${key}`)
  }
  return { templateId: definition.templateId, payload: definition.buildPayload() }
}
