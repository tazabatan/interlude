import type { ReactElement } from 'react'
import { sendTransactionalEmail } from '@/lib/email/client'
import { renderEmail } from '@/lib/email/render'
import type {
  BookingApprovedEmailPayload,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
} from '@/emails/types'
import { BookingApprovedEmail, bookingApprovedSubject } from '@/emails/templates/booking-approved-email'
import { DayOfReminderEmail, dayOfReminderSubject } from '@/emails/templates/day-of-reminder-email'
import { HoldStatusEmail, holdStatusSubject } from '@/emails/templates/hold-status-email'
import { NoScanNoticeEmail, noScanSubject } from '@/emails/templates/no-scan-notice-email'

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

async function sendTemplateEmail<TTemplate extends TemplateId>(template: TTemplate, payload: TemplatePayload<TTemplate>) {
  const entry = templateMap[template] as TemplateEntry<TemplatePayload<TTemplate>>
  const component = entry.component(payload)
  await sendTransactionalEmail({
    to: payload.recipient,
    subject: entry.subject(payload),
    react: component,
    tags: [
      { name: 'template', value: entry.tagValue },
      { name: 'booking_id', value: payload.bookingId },
    ],
  })
}

export function renderEmailPreview<TTemplate extends TemplateId>(template: TTemplate, payload: TemplatePayload<TTemplate>) {
  const entry = templateMap[template] as TemplateEntry<TemplatePayload<TTemplate>>
  return renderEmail(entry.component(payload))
}

export type { TemplateId, TemplatePayload }
export type {
  BookingApprovedEmailPayload,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
}
