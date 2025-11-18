import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sendEmailTemplate } from '@/emails'
import { buildSamplePayloadForKey } from '@/emails/template-definitions'
import { getUserRole } from '@/lib/get-user-role'

export async function POST(req: NextRequest) {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { key?: string; email?: string } | null
  if (!body?.key || !body.email) {
    return NextResponse.json({ error: 'Template key and email required' }, { status: 400 })
  }

  let sample
  try {
    sample = buildSamplePayloadForKey(body.key)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }

  const payload = {
    ...sample.payload,
    recipient: { email: body.email, name: sample.payload.recipient?.name ?? body.email },
  }

  await sendEmailTemplate(sample.templateId, payload as any)
  return NextResponse.json({ sent: true })
}
