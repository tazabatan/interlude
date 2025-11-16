import type {
  BookingApprovedEmailPayload,
  BookingEmailCommon,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
} from '@/emails/types'

const baseBooking: BookingEmailCommon = {
  recipient: { email: 'sample+member@interlude.local', name: 'Avery Guest' },
  bookingId: 'booking-dev-123',
  guestName: 'Avery',
  venueName: 'Belmond Cap Juluca',
  passName: 'Beach Club Pass',
  partySize: 2,
  arrivalDateDisplay: '16 Nov · Sunday',
  arrivalWindowDisplay: '10:00 – 12:00',
  holdAmountDisplay: '$100 hold',
  manageUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/app/bookings/booking-dev-123`,
  walletUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/app`,
}

export function buildBookingApprovedSample(): BookingApprovedEmailPayload {
  return {
    ...baseBooking,
    holdChargeTimeDisplay: 'Authorizes on 15 Nov at 14:00 AST',
  }
}

export function buildDayOfReminderSample(): DayOfReminderEmailPayload {
  return {
    ...baseBooking,
    venueAddress: 'Maundays Bay, Anguilla',
  }
}

export function buildHoldStatusSample(variant: HoldStatusEmailPayload['variant']): HoldStatusEmailPayload {
  return {
    ...baseBooking,
    variant,
    statusDateDisplay: '15 Nov · 14:00 AST',
    supportUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/support`,
  }
}

export function buildNoScanSample(): NoScanNoticeEmailPayload {
  return {
    ...baseBooking,
    reviewDeadlineDisplay: '17 Nov · 14:00 AST',
    claimUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/support/claims/booking-dev-123`,
  }
}
