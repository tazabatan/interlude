import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { renderEmailPreview, sendEmailTemplate } from '@/emails'
import { buildSamplePayloadForKey } from '@/emails/template-definitions'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const body = (await req.json().catch(() => null)) as { key?: string; template?: string; email?: string; send?: boolean } | null
  const lookupKey = body?.key ?? body?.template
  if (!lookupKey) {
    return NextResponse.json({ error: 'Template key required' }, { status: 400 })
  }

  let sample
  try {
    sample = buildSamplePayloadForKey(lookupKey)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }

  const templateId = sample.templateId
  let payload = sample.payload

  if (body?.email) {
    payload = {
      ...payload,
      recipient: { email: body.email, name: payload.recipient?.name ?? body.email },
    }
  }

  if (body?.send) {
    await sendEmailTemplate(templateId, payload as any)
    return NextResponse.json({ sent: true })
  }

  const preview = await renderEmailPreview(templateId, payload as any)
  return NextResponse.json({ html: preview.html, text: preview.text })
}
