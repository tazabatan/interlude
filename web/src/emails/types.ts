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
