import { randomUUID } from 'node:crypto'
import { sendStatementReadyEmail } from '@/emails'
import type { StatementReadyEmailPayload } from '@/emails/types'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export const LEDGER_ENTRY_TYPES = [
  'fee_due',
  'venue_credit_no_show',
  'platform_admin_no_show',
  'refund',
  'adjustment',
] as const

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number]

export type LedgerEntryRecord = {
  id: string
  venue_id: string
  entry_type: LedgerEntryType
  amount_cents: number
  currency: string
  booking_id: string | null
  description: string | null
  created_at: string
  invoice_id: string | null
}

export type StatementPreviewResult = {
  venue: { id: string; name: string }
  period: { start: string; end: string }
  currency: string
  entries: Array<
    LedgerEntryRecord & {
      amountLabel: string
      createdLabel: string
    }
  >
  totalCents: number
  totalLabel: string
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function formatCurrency(amountCents: number, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  })
  return formatter.format(amountCents / 100)
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

async function fetchJson<T>(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`Supabase request failed (${res.status}): ${text}`)
  }
  return (res.json() as Promise<T>)
}

async function ensureOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`Supabase request failed (${res.status}): ${text}`)
  }
}

export async function createLedgerEntry(input: {
  venueId: string
  entryType: LedgerEntryType
  amountCents: number
  currency?: string
  bookingId?: string | null
  description?: string | null
}) {
  const payload = {
    venue_id: input.venueId,
    entry_type: input.entryType,
    amount_cents: input.amountCents,
    currency: input.currency ?? 'USD',
    booking_id: input.bookingId ?? null,
    description: input.description ?? null,
  }

  const res = await serviceRoleFetch('/rest/v1/venue_ledger', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { Prefer: 'return=representation' },
  })
  const data = await fetchJson<LedgerEntryRecord[]>(res)
  return data[0]
}

type BookingLedgerSnapshot = {
  id: string
  venue_id: string
  party_size: number | null
  hold_amount: number | null
  hold_currency: string | null
  pass: {
    min_spend_amount: number | null
    currency: string | null
  } | null
}

async function fetchBookingLedgerSnapshot(bookingId: string): Promise<BookingLedgerSnapshot | null> {
  const params = new URLSearchParams()
  params.set('id', `eq.${bookingId}`)
  params.set('select', 'id,venue_id,party_size,hold_amount,hold_currency,pass:passes(min_spend_amount,currency)')
  params.set('limit', '1')
  const res = await serviceRoleFetch(`/rest/v1/bookings?${params.toString()}`)
  if (!res.ok) {
    return null
  }
  const rows = (await res.json()) as BookingLedgerSnapshot[]
  return rows[0] ?? null
}

export async function recordFeeDueEntryForBooking(bookingId: string) {
  try {
    const snapshot = await fetchBookingLedgerSnapshot(bookingId)
    if (!snapshot) return
    const partySize = snapshot.party_size ?? 1
    const perPersonMin = snapshot.pass?.min_spend_amount ?? null
    const holdAmount = snapshot.hold_amount ?? null
    const baseAmount = perPersonMin && perPersonMin > 0 ? perPersonMin * partySize : holdAmount ?? 0
    const amountCents = Math.round(baseAmount * 0.1)
    if (amountCents <= 0) return
    await createLedgerEntry({
      venueId: snapshot.venue_id,
      entryType: 'fee_due',
      amountCents,
      currency: snapshot.pass?.currency ?? snapshot.hold_currency ?? 'USD',
      bookingId,
      description: '10% platform fee on redeemed booking',
    })
  } catch (error) {
    console.error('[ledger] failed to record fee ledger entry', error)
  }
}

async function fetchVenueMeta(venueId: string) {
  const params = new URLSearchParams()
  params.set('id', `eq.${venueId}`)
  params.set('select', 'id,name')
  params.set('limit', '1')
  const res = await serviceRoleFetch(`/rest/v1/venues?${params.toString()}`)
  const data = await fetchJson<Array<{ id: string; name: string | null }>>(res)
  const record = data[0]
  if (!record) {
    throw new Error('Venue not found')
  }
  return record
}

export async function fetchLedgerEntries(args: {
  venueId: string
  periodStart: string
  periodEnd: string
}) {
  const params = new URLSearchParams()
  params.append('select', 'id,venue_id,entry_type,amount_cents,currency,booking_id,description,created_at,invoice_id')
  params.append('venue_id', `eq.${args.venueId}`)
  params.append('invoice_id', 'is.null')
  params.append('order', 'created_at.asc')
  params.append('created_at', `gte.${args.periodStart}T00:00:00Z`)
  params.append('created_at', `lt.${args.periodEnd}T23:59:59Z`)
  const res = await serviceRoleFetch(`/rest/v1/venue_ledger?${params.toString()}`)
  return fetchJson<LedgerEntryRecord[]>(res)
}

function normaliseDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date range')
  }
  return date.toISOString().slice(0, 10)
}

export async function generateStatementPreview(args: {
  venueId: string
  periodStart: string
  periodEnd: string
}) {
  const periodStart = normaliseDate(args.periodStart)
  const periodEnd = normaliseDate(args.periodEnd)
  if (new Date(periodEnd) < new Date(periodStart)) {
    throw new Error('Period end must be after start')
  }
  const [venue, rawEntries] = await Promise.all([
    fetchVenueMeta(args.venueId),
    fetchLedgerEntries({ venueId: args.venueId, periodStart, periodEnd }),
  ])

  const entriesWithLabels = rawEntries.map((entry) => ({
    ...entry,
    amountLabel: formatCurrency(entry.amount_cents, entry.currency),
    createdLabel: formatDateLabel(entry.created_at),
  }))

  const totalCents = entriesWithLabels.reduce((sum, entry) => sum + entry.amount_cents, 0)

  return {
    venue: { id: venue.id, name: venue.name ?? 'Venue' },
    period: { start: periodStart, end: periodEnd },
    currency: entriesWithLabels[0]?.currency ?? 'USD',
    entries: entriesWithLabels,
    totalCents,
    totalLabel: formatCurrency(totalCents, entriesWithLabels[0]?.currency ?? 'USD'),
  } satisfies StatementPreviewResult
}

export async function finalizeStatementAndSend(args: {
  venueId: string
  periodStart: string
  periodEnd: string
  recipientEmail: string
  recipientName?: string | null
  notes?: string | null
}) {
  const preview = await generateStatementPreview({
    venueId: args.venueId,
    periodStart: args.periodStart,
    periodEnd: args.periodEnd,
  })

  if (preview.entries.length === 0) {
    throw new Error('No ledger entries available for this period.')
  }

  const invoicePayload = {
    id: randomUUID(),
    venue_id: args.venueId,
    period_start: preview.period.start,
    period_end: preview.period.end,
    currency: preview.currency,
    total_cents: preview.totalCents,
    status: 'sent',
  }

  const invoiceRes = await serviceRoleFetch('/rest/v1/invoices', {
    method: 'POST',
    body: JSON.stringify(invoicePayload),
    headers: { Prefer: 'return=representation' },
  })
  const invoiceData = await fetchJson<Array<{ id: string }>>(invoiceRes)
  const invoice = invoiceData[0]
  if (!invoice) {
    throw new Error('Failed to create invoice')
  }

  const lineItemsPayload = preview.entries.map((entry) => ({
    id: randomUUID(),
    invoice_id: invoice.id,
    ledger_id: entry.id,
    description: entry.description ?? entry.entry_type,
    amount_cents: entry.amount_cents,
  }))

  if (lineItemsPayload.length > 0) {
    await serviceRoleFetch('/rest/v1/invoice_line_items', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(lineItemsPayload),
    }).then(ensureOk)

    const ledgerUpdateBody = {
      invoice_id: invoice.id,
    }
    const idList = preview.entries.map((entry) => entry.id).join(',')
    await serviceRoleFetch(`/rest/v1/venue_ledger?id=in.(${idList})`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(ledgerUpdateBody),
    }).then(ensureOk)
  }

  return { invoiceId: invoice.id, preview }
}

function formatPeriodLabel(start: string, end: string) {
  const startLabel = formatDateLabel(`${start}T00:00:00Z`)
  const endLabel = formatDateLabel(`${end}T00:00:00Z`)
  if (startLabel === endLabel) return startLabel
  return `${startLabel} – ${endLabel}`
}
export async function sendStatementEmail(args: {
  invoiceId: string
  preview: StatementPreviewResult
  recipientEmail: string
  recipientName?: string | null
}) {
  const periodLabel = formatPeriodLabel(args.preview.period.start, args.preview.period.end)
  const emailPayload: StatementReadyEmailPayload = {
    recipient: {
      email: args.recipientEmail,
      name: args.recipientName ?? args.preview.venue.name,
    },
    venueName: args.preview.venue.name,
    periodLabel,
    totalDueLabel: args.preview.totalLabel,
    statementUrl: `${SITE_URL}/desk`,
  }

  await sendStatementReadyEmail(emailPayload)
}
