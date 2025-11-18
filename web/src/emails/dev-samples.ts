import type {
  AccountWelcomeEmailPayload,
  BookingApprovedEmailPayload,
  BookingCancelledEmailPayload,
  BookingDeclinedEmailPayload,
  BookingEmailCommon,
  BookingRequestedEmailPayload,
  DayOfReminderEmailPayload,
  HoldStatusEmailPayload,
  NoScanNoticeEmailPayload,
  ConfirmEmailPayload,
  StatementReadyEmailPayload,
  PasswordChangedEmailPayload,
  PasswordResetEmailPayload,
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
  qrCodeValue: 'QR-DEMO-BOOKING-123',
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

export function buildBookingRequestedSample(): BookingRequestedEmailPayload {
  return {
    ...baseBooking,
    confirmationNumber: 'REQ-12345',
  }
}

export function buildBookingDeclinedSample(): BookingDeclinedEmailPayload {
  return {
    ...baseBooking,
    declineReason: 'Venue at capacity for the selected window.',
  }
}

export function buildBookingCancelledSample(): BookingCancelledEmailPayload {
  return {
    ...baseBooking,
    cancelledBy: 'guest',
    actorName: null,
  }
}

export function buildAccountWelcomeSample(): AccountWelcomeEmailPayload {
  return {
    recipient: { email: 'sample+member@interlude.local', name: 'Avery Guest' },
    guestName: 'Avery',
    manageUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/app`,
  }
}

export function buildStatementReadySample(): StatementReadyEmailPayload {
  return {
    recipient: { email: 'manager@interlude.local', name: 'Cap Juluca Desk' },
    venueName: 'Belmond Cap Juluca',
    periodLabel: 'Nov 10 – Nov 16',
    totalDueLabel: '$1,240.00',
    statementUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/desk/statements/preview`,
  }
}

export function buildConfirmEmailSample(): ConfirmEmailPayload {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return {
    recipient: { email: 'sample+member@interlude.local', name: 'Avery Guest' },
    confirmUrl: `${base}/auth/callback?token=confirm-demo`,
    supportUrl: `${base}/support`,
  }
}

export function buildPasswordChangedSample(): PasswordChangedEmailPayload {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return {
    recipient: { email: 'sample+member@interlude.local', name: 'Avery Guest' },
    supportUrl: `${base}/support`,
  }
}

export function buildPasswordResetSample(): PasswordResetEmailPayload {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return {
    recipient: { email: 'sample+member@interlude.local', name: 'Avery Guest' },
    resetUrl: `${base}/auth/callback?type=recovery&token=reset-demo`,
    supportUrl: `${base}/support`,
  }
}
