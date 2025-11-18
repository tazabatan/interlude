import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  notifyBookingApproved,
  notifyDayOfReminder,
  notifyHoldStatus,
  notifyNoScanNotice,
} from '@/lib/email/triggers'

type DispatchRequest =
  | { template: 'booking-approved'; bookingId: string }
  | { template: 'day-of-reminder'; bookingId: string }
  | { template: 'hold-status'; bookingId: string; variant: 'authorized' | 'released' | 'captured'; statusDate?: string }
  | { template: 'no-scan'; bookingId: string; reviewDeadline: string }

function assertAuthorized(req: NextRequest) {
  const secret = process.env.INTERNAL_EMAIL_SECRET
  if (!secret) {
    console.warn('[email] INTERNAL_EMAIL_SECRET is not configured')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!assertAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as DispatchRequest | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  switch (body.template) {
    case 'booking-approved':
      if (!body.bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      await notifyBookingApproved(body.bookingId)
      return NextResponse.json({ ok: true })
    case 'day-of-reminder':
      if (!body.bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      await notifyDayOfReminder(body.bookingId)
      return NextResponse.json({ ok: true })
    case 'hold-status':
      if (!body.bookingId || !body.variant)
        return NextResponse.json({ error: 'bookingId and variant required' }, { status: 400 })
      await notifyHoldStatus(body.bookingId, body.variant, body.statusDate)
      return NextResponse.json({ ok: true })
    case 'no-scan':
      if (!body.bookingId || !body.reviewDeadline) {
        return NextResponse.json({ error: 'bookingId and reviewDeadline required' }, { status: 400 })
      }
      await notifyNoScanNotice(body.bookingId, body.reviewDeadline)
      return NextResponse.json({ ok: true })
    default:
      return NextResponse.json({ error: 'Unsupported template' }, { status: 400 })
  }
}
