import type { ReactElement } from 'react'
import { sendTransactionalEmail, type SendEmailParams } from '@/lib/email/client'
import { renderEmail } from '@/lib/email/render'
import type {
  BookingApprovedEmailPayload,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
  BookingRequestedEmailPayload,
  BookingDeclinedEmailPayload,
  BookingCancelledEmailPayload,
  AccountWelcomeEmailPayload,
  ConfirmEmailPayload,
  StatementReadyEmailPayload,
  PasswordChangedEmailPayload,
  PasswordResetEmailPayload,
} from '@/emails/types'
import { BookingApprovedEmail, bookingApprovedSubject } from '@/emails/templates/booking-approved-email'
import { DayOfReminderEmail, dayOfReminderSubject } from '@/emails/templates/day-of-reminder-email'
import { HoldStatusEmail, holdStatusSubject } from '@/emails/templates/hold-status-email'
import { NoScanNoticeEmail, noScanSubject } from '@/emails/templates/no-scan-notice-email'
import { BookingRequestedEmail, bookingRequestedSubject } from '@/emails/templates/booking-requested-email'
import { BookingDeclinedEmail, bookingDeclinedSubject } from '@/emails/templates/booking-declined-email'
import { BookingCancelledEmail, bookingCancelledSubject } from '@/emails/templates/booking-cancelled-email'
import { AccountWelcomeEmail, accountWelcomeSubject } from '@/emails/templates/account-welcome-email'
import { StatementReadyEmail, statementReadySubject } from '@/emails/templates/statement-ready-email'
import { ConfirmEmail, confirmEmailSubject } from '@/emails/templates/confirm-email'
import { PasswordChangedEmail, passwordChangedSubject } from '@/emails/templates/password-changed-email'
import { PasswordResetEmail, passwordResetSubject } from '@/emails/templates/password-reset-email'

 type TemplateEntry<TPayload> = {
  component: (payload: TPayload) => ReactElement
  subject: (payload: TPayload) => string
  tagValue: string
}

const templateMap = {
  'booking-approved': {
    component: BookingApprovedEmail,
    subject: bookingApprovedSubject,
    tagValue: 'booking-approved',
  },
  'day-of-reminder': {
    component: DayOfReminderEmail,
    subject: dayOfReminderSubject,
    tagValue: 'day-of-reminder',
  },
  'hold-status': {
    component: HoldStatusEmail,
    subject: holdStatusSubject,
    tagValue: 'hold-status',
  },
  'no-scan': {
    component: NoScanNoticeEmail,
    subject: noScanSubject,
    tagValue: 'no-scan',
  },
  'booking-requested': {
    component: BookingRequestedEmail,
    subject: bookingRequestedSubject,
    tagValue: 'booking-requested',
  },
  'booking-declined': {
    component: BookingDeclinedEmail,
    subject: bookingDeclinedSubject,
    tagValue: 'booking-declined',
  },
  'booking-cancelled': {
    component: BookingCancelledEmail,
    subject: bookingCancelledSubject,
    tagValue: 'booking-cancelled',
  },
  'account-welcome': {
    component: AccountWelcomeEmail,
    subject: accountWelcomeSubject,
    tagValue: 'account-welcome',
  },
  'statement-ready': {
    component: StatementReadyEmail,
    subject: statementReadySubject,
    tagValue: 'statement-ready',
  },
  'confirm-email': {
    component: ConfirmEmail,
    subject: confirmEmailSubject,
    tagValue: 'confirm-email',
  },
  'password-changed': {
    component: PasswordChangedEmail,
    subject: passwordChangedSubject,
    tagValue: 'password-changed',
  },
  'password-reset': {
    component: PasswordResetEmail,
    subject: passwordResetSubject,
    tagValue: 'password-reset',
  },
}

 type TemplateMap = typeof templateMap
 type TemplateId = keyof TemplateMap
 type TemplatePayload<TTemplate extends TemplateId> = Parameters<TemplateMap[TTemplate]['component']>[0]

 export async function sendBookingApprovedEmail(payload: BookingApprovedEmailPayload) {
  await sendTemplateEmail('booking-approved', payload)
}

export async function sendDayOfReminderEmail(payload: DayOfReminderEmailPayload) {
  await sendTemplateEmail('day-of-reminder', payload)
}

export async function sendHoldStatusEmail(payload: HoldStatusEmailPayload) {
  await sendTemplateEmail('hold-status', payload)
}

export async function sendNoScanNoticeEmail(payload: NoScanNoticeEmailPayload) {
  await sendTemplateEmail('no-scan', payload)
}

export async function sendBookingRequestedEmail(payload: BookingRequestedEmailPayload) {
  await sendTemplateEmail('booking-requested', payload)
}

export async function sendBookingDeclinedEmail(payload: BookingDeclinedEmailPayload) {
  await sendTemplateEmail('booking-declined', payload)
}

export async function sendBookingCancelledEmail(payload: BookingCancelledEmailPayload) {
  await sendTemplateEmail('booking-cancelled', payload)
}

export async function sendAccountWelcomeEmail(payload: AccountWelcomeEmailPayload) {
  await sendTemplateEmail('account-welcome', payload)
}

export async function sendStatementReadyEmail(payload: StatementReadyEmailPayload) {
  await sendTemplateEmail('statement-ready', payload)
}

export async function sendConfirmEmail(payload: ConfirmEmailPayload) {
  await sendTemplateEmail('confirm-email', payload)
}

export async function sendPasswordChangedEmail(payload: PasswordChangedEmailPayload) {
  await sendTemplateEmail('password-changed', payload)
}

export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload) {
  await sendTemplateEmail('password-reset', payload)
}

async function sendTemplateEmail<TTemplate extends TemplateId>(template: TTemplate, payload: TemplatePayload<TTemplate>) {
  const entry = templateMap[template] as TemplateEntry<TemplatePayload<TTemplate>>
  const component = entry.component(payload)
  const payloadRecord = payload as Record<string, unknown>
  const tags = entry.tagValue ? [{ name: 'template', value: entry.tagValue }] : []
  if (typeof payloadRecord.bookingId === 'string') {
    tags.push({ name: 'booking_id', value: payloadRecord.bookingId })
  }
  const recipient =
    (payloadRecord.recipient ?? (payload as Record<string, unknown>).recipient) as SendEmailParams['to']
  await sendTransactionalEmail({
    to: recipient,
    subject: entry.subject(payload),
    react: component,
    tags: tags.length > 0 ? tags : undefined,
  })
}

export async function sendEmailTemplate<TTemplate extends TemplateId>(
  template: TTemplate,
  payload: TemplatePayload<TTemplate>
) {
  await sendTemplateEmail(template, payload)
}

export async function renderEmailPreview<TTemplate extends TemplateId>(
  template: TTemplate,
  payload: TemplatePayload<TTemplate>
) {
  const entry = templateMap[template] as TemplateEntry<TemplatePayload<TTemplate>>
  return renderEmail(entry.component(payload))
}

export type { TemplateId, TemplatePayload }
export type {
  BookingApprovedEmailPayload,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
  BookingRequestedEmailPayload,
  BookingDeclinedEmailPayload,
  BookingCancelledEmailPayload,
  AccountWelcomeEmailPayload,
  ConfirmEmailPayload,
  StatementReadyEmailPayload,
  PasswordChangedEmailPayload,
  PasswordResetEmailPayload,
}
