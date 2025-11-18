import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getUserRole } from '@/lib/get-user-role'
import { LEDGER_ENTRY_TYPES, createLedgerEntry } from '@/lib/ledger'

const ENTRY_TYPE_SET = new Set(LEDGER_ENTRY_TYPES)

const displayLabels: Record<string, string> = {
  fee_due: 'Platform fee due',
  venue_credit_no_show: 'Venue credit (no-show)',
  platform_admin_no_show: 'Platform admin (no-show)',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

function formatCurrency(amountCents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

export async function POST(req: NextRequest) {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as {
    venueId?: string
    entryType?: string
    amount?: string | number
    currency?: string
    bookingId?: string | null
    description?: string | null
  } | null

  if (!body?.venueId || !ENTRY_TYPE_SET.has(body.entryType as string)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const amountValue = typeof body.amount === 'string' ? body.amount : body.amount?.toString() ?? ''
  const normalized = amountValue.replace(/[^0-9.-]/g, '')
  const numeric = Number(normalized)
  if (!Number.isFinite(numeric) || numeric === 0) {
    return NextResponse.json({ error: 'Amount must be non-zero' }, { status: 400 })
  }
  const amountCents = Math.round(numeric * 100)

  const entry = await createLedgerEntry({
    venueId: body.venueId,
    entryType: body.entryType as (typeof LEDGER_ENTRY_TYPES)[number],
    amountCents,
    currency: body.currency ?? 'USD',
    bookingId: body.bookingId ?? null,
    description: body.description ?? null,
  })

  return NextResponse.json({ entry })
}

export async function GET(req: NextRequest) {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const search = req.nextUrl.searchParams
  const venueId = search.get('venueId')
  if (!venueId) {
    return NextResponse.json({ error: 'venueId required' }, { status: 400 })
  }

  const includeInvoiced = search.get('includeInvoiced') === 'true'
  const start = search.get('start') ?? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10)
  const end = search.get('end') ?? new Date().toISOString().slice(0, 10)
  const typeQuery = search.get('types')
  const types = typeQuery
    ? typeQuery
        .split(',')
        .map((t) => t.trim())
        .filter((t) => ENTRY_TYPE_SET.has(t as typeof LEDGER_ENTRY_TYPES[number]))
    : LEDGER_ENTRY_TYPES

  const params = new URLSearchParams()
  params.set(
    'select',
    [
    'id',
    'entry_type',
    'amount_cents',
    'currency',
    'booking_id',
    'description',
    'created_at',
    'invoice_id',
    'booking:bookings(id,date,party_size,status,pass:passes(kind,display_price_text,venue:venues(name)))',
    ].join(',')
  )
  params.set('venue_id', `eq.${venueId}`)
  params.append('order', 'created_at.desc')
  params.append('created_at', `gte.${start}T00:00:00Z`)
  params.append('created_at', `lte.${end}T23:59:59Z`)
  if (!includeInvoiced) {
    params.append('invoice_id', 'is.null')
  }
  if (types.length > 0 && types.length !== LEDGER_ENTRY_TYPES.length) {
    params.append('entry_type', `in.(${types.join(',')})`)
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/venue_ledger?${params.toString()}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`,
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    console.error('[ledger] fetch failed', text)
    return NextResponse.json({ error: text }, { status: res.status })
  }
  const entries = (await res.json()) as Array<{
    id: string
    entry_type: string
    amount_cents: number
    currency: string
    booking_id: string | null
    description: string | null
    created_at: string
    invoice_id: string | null
    booking?: {
      id: string
      date: string | null
      party_size: number | null
      pass?: {
        kind: string | null
        display_price_text: string | null
        venue?: { name: string | null } | null
      } | null
    } | null
  }>

  const totalFees = entries
    .filter((entry) => entry.entry_type === 'fee_due')
    .reduce((sum, entry) => sum + entry.amount_cents, 0)

  const totalCredits = entries
    .filter((entry) => entry.entry_type === 'venue_credit_no_show')
    .reduce((sum, entry) => sum + Math.abs(entry.amount_cents), 0)

  const netDue = entries.reduce((sum, entry) => sum + entry.amount_cents, 0)

  const invoiceIds = new Set(entries.filter((entry) => entry.invoice_id).map((entry) => entry.invoice_id as string))
  const unInvoicedCount = entries.filter((entry) => !entry.invoice_id).length

  const enriched = entries.map((entry) => {
    const venueName = entry.booking?.pass?.venue?.name ?? ''
    const productLabel = entry.booking?.pass?.display_price_text ?? entry.booking?.pass?.kind ?? ''
    const bookingLabel = entry.booking_id
      ? `${venueName}${productLabel ? ` · ${productLabel}` : ''}${entry.booking?.party_size ? ` · ${entry.booking.party_size}p` : ''}`
      : null
    return {
      id: entry.id,
      entryType: entry.entry_type,
      entryLabel: displayLabels[entry.entry_type] ?? entry.entry_type,
      amountCents: entry.amount_cents,
      amountLabel: formatCurrency(entry.amount_cents, entry.currency),
      currency: entry.currency,
      bookingId: entry.booking_id,
      bookingLabel,
      description: entry.description,
      createdAt: entry.created_at,
      invoiceId: entry.invoice_id,
    }
  })

  return NextResponse.json({
    entries: enriched,
    summary: {
      totalFeesCents: totalFees,
      totalCreditsCents: totalCredits,
      netDueCents: netDue,
      totalFeesLabel: formatCurrency(totalFees),
      totalCreditsLabel: formatCurrency(totalCredits),
      netDueLabel: formatCurrency(netDue),
      invoiceHint: invoiceIds.size === 0 ? null : invoiceIds.size === 1 ? invoiceIds.values().next().value : 'multiple',
      unInvoicedCount,
      includeInvoiced,
    },
  })
}
