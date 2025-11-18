import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserRole } from '@/lib/get-user-role'
import { findInvoiceForPeriod, finalizeStatementAndSend, sendExistingInvoiceEmail, sendStatementEmail } from '@/lib/ledger'

export async function POST(req: NextRequest) {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as {
    venueId?: string
    periodStart?: string
    periodEnd?: string
    recipientEmail?: string
    recipientName?: string | null
    notes?: string | null
  } | null

  if (!body?.venueId || !body.periodStart || !body.periodEnd || !body.recipientEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existingInvoice = await findInvoiceForPeriod(body.venueId, body.periodStart, body.periodEnd)
  if (existingInvoice) {
    await sendExistingInvoiceEmail({
      venueId: body.venueId,
      invoiceId: existingInvoice.id,
      periodStart: existingInvoice.period_start,
      periodEnd: existingInvoice.period_end,
      totalCents: existingInvoice.total_cents,
      currency: existingInvoice.currency ?? 'USD',
      recipientEmail: body.recipientEmail,
      recipientName: body.recipientName ?? null,
    })
    return NextResponse.json({
      invoiceId: existingInvoice.id,
      duplicate: true,
      message: 'Statement already existed; resent email.',
    })
  }

  const result = await finalizeStatementAndSend({
    venueId: body.venueId,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    recipientEmail: body.recipientEmail,
    recipientName: body.recipientName ?? null,
      notes: body.notes ?? null,
  })

  await sendStatementEmail({
    invoiceId: result.invoiceId,
    periodStart: result.preview.period.start,
    periodEnd: result.preview.period.end,
    venueName: result.preview.venue.name,
    totalLabel: result.preview.totalLabel,
    recipientEmail: body.recipientEmail,
    recipientName: body.recipientName ?? null,
  })

  return NextResponse.json({ invoiceId: result.invoiceId, preview: result.preview })
}
