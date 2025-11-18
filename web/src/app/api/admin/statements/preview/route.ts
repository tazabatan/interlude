import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserRole } from '@/lib/get-user-role'
import { generateStatementPreview } from '@/lib/ledger'

export async function POST(req: NextRequest) {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as {
    venueId?: string
    periodStart?: string
    periodEnd?: string
  } | null

  if (!body?.venueId || !body.periodStart || !body.periodEnd) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const preview = await generateStatementPreview({
    venueId: body.venueId,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
  })

  return NextResponse.json({ preview })
}
