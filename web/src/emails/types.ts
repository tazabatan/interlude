import type { EmailRecipient } from '@/lib/email/client'

export type BookingEmailCommon = {
  recipient: EmailRecipient
  bookingId: string
  guestName?: string | null
  venueName: string
  passName: string
  partySize: number
  arrivalDateDisplay: string
  arrivalWindowDisplay: string
  holdAmountDisplay: string
  manageUrl: string
  walletUrl: string
  qrCodeValue?: string | null
}

export type BookingApprovedEmailPayload = BookingEmailCommon & {
  holdChargeTimeDisplay: string
}

export type DayOfReminderEmailPayload = BookingEmailCommon & {
  venueAddress?: string | null
}

export type HoldStatusEmailPayload = BookingEmailCommon & {
  variant: 'authorized' | 'released' | 'captured'
  statusDateDisplay: string
  supportUrl: string
}

export type NoScanNoticeEmailPayload = BookingEmailCommon & {
  reviewDeadlineDisplay: string
  claimUrl: string
}

export type BookingRequestedEmailPayload = BookingEmailCommon & {
  confirmationNumber: string
}

export type BookingRequestedVenueEmailPayload = {
  recipient: EmailRecipient
  venueName: string
  guestName: string
  guestEmail?: string | null
  passName: string
  partySize: number
  arrivalDateDisplay: string
  arrivalWindowDisplay: string
  reviewUrl: string
}

export type BookingDeclinedEmailPayload = BookingEmailCommon & {
  declineReason: string | null
}

export type BookingCancelledEmailPayload = BookingEmailCommon & {
  cancelledBy: 'guest' | 'venue' | 'interlude' | 'system'
  actorName: string | null
}

export type AccountWelcomeEmailPayload = {
  recipient: EmailRecipient
  guestName?: string | null
  manageUrl: string
}

export type StatementReadyEmailPayload = {
  recipient: EmailRecipient
  venueName: string
  periodLabel: string
  totalDueLabel: string
  statementUrl: string
}

export type ConfirmEmailPayload = {
  recipient: EmailRecipient
  confirmUrl: string
  supportUrl: string
}

export type PasswordChangedEmailPayload = {
  recipient: EmailRecipient
  supportUrl: string
}

export type PasswordResetEmailPayload = {
  recipient: EmailRecipient
  resetUrl: string
  supportUrl: string
}
