import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { renderEmailPreview } from '@/emails'
import { buildSamplePayloadForKey } from '@/emails/template-definitions'
import { getUserRole } from '@/lib/get-user-role'

export async function POST(req: NextRequest) {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { key?: string } | null
  if (!body?.key) {
    return NextResponse.json({ error: 'Template key required' }, { status: 400 })
  }

  let sample
  try {
    sample = buildSamplePayloadForKey(body.key)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }

  const preview = await renderEmailPreview(sample.templateId, sample.payload as any)
  return NextResponse.json({ html: preview.html })
}
