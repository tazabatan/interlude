import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  renderEmailPreview,
  sendBookingApprovedEmail,
  sendDayOfReminderEmail,
  sendHoldStatusEmail,
  sendNoScanNoticeEmail,
  type TemplateId,
  type TemplatePayload,
} from '@/emails'
import {
  buildBookingApprovedSample,
  buildDayOfReminderSample,
  buildHoldStatusSample,
  buildNoScanSample,
} from '@/emails/dev-samples'

type PreviewBody =
  | {
      template: 'booking-approved'
      email?: string
      send?: boolean
    }
  | {
      template: 'day-of-reminder'
      email?: string
      send?: boolean
    }
  | {
      template: 'hold-status'
      variant?: 'authorized' | 'released' | 'captured'
      email?: string
      send?: boolean
    }
  | {
      template: 'no-scan'
      email?: string
      send?: boolean
    }

const templateBuilders: Record<TemplateId, () => TemplatePayload<TemplateId>> = {
  'booking-approved': buildBookingApprovedSample,
  'day-of-reminder': buildDayOfReminderSample,
  'hold-status': () => buildHoldStatusSample('authorized'),
  'no-scan': buildNoScanSample,
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as PreviewBody | null
  if (!body || !body.template || !(body.template in templateBuilders)) {
    return NextResponse.json({ error: 'Invalid template request' }, { status: 400 })
  }

  const template = body.template
  let payload = templateBuilders[template]() as TemplatePayload<typeof template>

  if (template === 'hold-status') {
    const variantBody = body as Extract<PreviewBody, { template: 'hold-status' }>
    const variant = variantBody.variant ?? 'authorized'
    payload = buildHoldStatusSample(variant) as TemplatePayload<typeof template>
  }

  if (body.email) {
    payload = {
      ...payload,
      recipient: { email: body.email, name: payload.recipient.name },
    }
  }

  if (body.send) {
    await sendByTemplate(template, payload)
    return NextResponse.json({ sent: true })
  }

  const preview = renderEmailPreview(template, payload)
  return NextResponse.json({ html: preview.html, text: preview.text })
}

async function sendByTemplate<TTemplate extends TemplateId>(template: TTemplate, payload: TemplatePayload<TTemplate>) {
  switch (template) {
    case 'booking-approved':
      await sendBookingApprovedEmail(payload as TemplatePayload<'booking-approved'>)
      break
    case 'day-of-reminder':
      await sendDayOfReminderEmail(payload as TemplatePayload<'day-of-reminder'>)
      break
    case 'hold-status':
      await sendHoldStatusEmail(payload as TemplatePayload<'hold-status'>)
      break
    case 'no-scan':
      await sendNoScanNoticeEmail(payload as TemplatePayload<'no-scan'>)
      break
    default:
      throw new Error('Unsupported template')
  }
}
