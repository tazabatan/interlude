import { randomUUID } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { sendStatementReadyEmail } from '@/emails'
import type { StatementReadyEmailPayload } from '@/emails/types'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import { fetchGuestProfilesByIds } from '@/lib/guest-profile'

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

export type VenueStatementRow = {
  id: string
  periodStart: string
  periodEnd: string
  periodLabel: string
  currency: string
  totalCents: number
  totalLabel: string
  status: string
  createdAt: string
}

export type VenueStatementSummary = {
  feesCents: number
  feesLabel: string
  creditsCents: number
  creditsLabel: string
  adjustmentsCents: number
  adjustmentsLabel: string
  netDueCents: number
  netDueLabel: string
}

export type VenueStatementBookingRow = {
  id: string
  bookingId: string | null
  dateLabel: string
  guestName: string
  typeLabel: string
  statusLabel: string
  feeLabel: string
  creditLabel: string
  description: string | null
}

export type VenueStatementDetail = {
  invoice: VenueStatementRow
  summary: VenueStatementSummary
  entries: VenueStatementBookingRow[]
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
    statementUrl: `${SITE_URL}/desk/statements/${args.invoiceId}`,
  }

  await sendStatementReadyEmail(emailPayload)
}

function formatPeriodRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const sameMonth =
    startDate.getUTCFullYear() === endDate.getUTCFullYear() &&
    startDate.getUTCMonth() === endDate.getUTCMonth()

  const dayFormatter = new Intl.DateTimeFormat('en-US', { day: 'numeric' })
  const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })
  const shortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (sameMonth) {
    const monthYear = monthYearFormatter.format(startDate)
    return `${dayFormatter.format(startDate)}–${dayFormatter.format(endDate)} ${monthYear}`
  }

  return `${shortFormatter.format(startDate)} – ${shortFormatter.format(endDate)}`
}

function formatPassKind(kind?: string | null) {
  if (!kind) return 'Pass'
  if (kind === 'MIN_SPEND') return 'Min-spend pass'
  if (kind === 'DAY_PASS') return 'Day pass'
  if (kind === 'BEACH_PASS') return 'Beach pass'
  return kind.replace(/_/g, ' ').toLowerCase()
}

function formatBookingStatusLabel(status?: string | null) {
  if (!status) return 'Unknown'
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function fetchVenueStatements(venueId: string): Promise<VenueStatementRow[]> {
  const params = new URLSearchParams()
  params.set('select', 'id,period_start,period_end,total_cents,currency,status,created_at')
  params.set('venue_id', `eq.${venueId}`)
  params.append('order', 'period_start.desc')
  params.append('order', 'created_at.desc')
  const res = await serviceRoleFetch(`/rest/v1/invoices?${params.toString()}`)
  const rows = (await res.json()) as Array<{
    id: string
    period_start: string
    period_end: string
    total_cents: number
    currency: string | null
    status: string
    created_at: string
  }>

  return rows.map((row) => {
    const currency = row.currency ?? 'USD'
    return {
      id: row.id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      periodLabel: formatPeriodRange(row.period_start, row.period_end),
      currency,
      totalCents: row.total_cents,
      totalLabel: formatCurrency(row.total_cents, currency),
      status: row.status,
      createdAt: row.created_at,
    }
  })
}

type LedgerEntryWithBooking = {
  id: string
  entry_type: LedgerEntryType
  amount_cents: number
  currency: string
  booking_id: string | null
  description: string | null
  created_at: string
  booking: {
    id: string
    date: string | null
    status: string | null
    user_id: string | null
    pass: {
      kind: string | null
      display_price_text: string | null
    } | null
  } | null
}

export async function fetchVenueStatementDetail(
  venueId: string,
  invoiceId: string
): Promise<VenueStatementDetail | null> {
  const invoiceParams = new URLSearchParams()
  invoiceParams.set('id', `eq.${invoiceId}`)
  invoiceParams.set('venue_id', `eq.${venueId}`)
  invoiceParams.set('limit', '1')
  invoiceParams.set('select', 'id,period_start,period_end,total_cents,currency,status,created_at')
  const invoiceRes = await serviceRoleFetch(`/rest/v1/invoices?${invoiceParams.toString()}`)
  const invoiceRows = (await invoiceRes.json()) as Array<{
    id: string
    period_start: string
    period_end: string
    total_cents: number
    currency: string | null
    status: string
    created_at: string
  }>
  const invoiceRow = invoiceRows[0]
  if (!invoiceRow) return null

  const invoice: VenueStatementRow = {
    id: invoiceRow.id,
    periodStart: invoiceRow.period_start,
    periodEnd: invoiceRow.period_end,
    periodLabel: formatPeriodRange(invoiceRow.period_start, invoiceRow.period_end),
    currency: invoiceRow.currency ?? 'USD',
    totalCents: invoiceRow.total_cents,
    totalLabel: formatCurrency(invoiceRow.total_cents, invoiceRow.currency ?? 'USD'),
    status: invoiceRow.status,
    createdAt: invoiceRow.created_at,
  }

  const entryParams = new URLSearchParams()
  entryParams.set('invoice_id', `eq.${invoice.id}`)
  entryParams.append(
    'select',
    'id,entry_type,amount_cents,currency,booking_id,description,created_at,booking:bookings(id,date,status,user_id,pass:passes(kind,display_price_text))'
  )
  entryParams.append('order', 'created_at.asc')
  const entriesRes = await serviceRoleFetch(`/rest/v1/venue_ledger?${entryParams.toString()}`)
  const rawEntries = (await entriesRes.json()) as LedgerEntryWithBooking[]

  const userIds = rawEntries
    .map((entry) => entry.booking?.user_id)
    .filter((value): value is string => Boolean(value))
  const profileMap = await fetchGuestProfilesByIds(userIds)

  let feesCents = 0
  let creditsCents = 0
  let adjustmentsCents = 0

  type Bucket = {
    id: string
    bookingId: string | null
    date: string | null
    entryCreatedAt: string
    guestName: string
    typeLabel: string
    statusLabel: string
    feeCents: number
    creditCents: number
    description: string | null
  }

  const entryBuckets = new Map<string, Bucket>()

  for (const entry of rawEntries) {
    switch (entry.entry_type) {
      case 'fee_due':
      case 'platform_admin_no_show':
        feesCents += entry.amount_cents
        break
      case 'venue_credit_no_show':
        creditsCents += Math.abs(entry.amount_cents)
        break
      case 'adjustment':
        adjustmentsCents += entry.amount_cents
        break
      default:
        break
    }

    const key = entry.booking_id ?? entry.id
    let bucket = entryBuckets.get(key)
    if (!bucket) {
      const booking = entry.booking
      const guestId = booking?.user_id ?? null
      const guestName = guestId ? profileMap[guestId]?.name ?? 'Guest' : booking ? 'Guest' : 'Ledger entry'
      bucket = {
        id: entry.id,
        bookingId: booking?.id ?? null,
        date: booking?.date ?? null,
        entryCreatedAt: entry.created_at,
        guestName,
        typeLabel: booking?.pass?.kind ? formatPassKind(booking.pass.kind) : entry.entry_type.replace(/_/g, ' '),
        statusLabel: booking ? formatBookingStatusLabel(booking.status) : 'Adjustment',
        feeCents: 0,
        creditCents: 0,
        description: booking?.pass?.display_price_text ?? entry.description ?? null,
      }
      entryBuckets.set(key, bucket)
    }

    if (entry.entry_type === 'fee_due' || entry.entry_type === 'platform_admin_no_show') {
      bucket.feeCents += entry.amount_cents
    } else if (entry.entry_type === 'venue_credit_no_show') {
      bucket.creditCents += Math.abs(entry.amount_cents)
    } else if (entry.entry_type === 'adjustment') {
      bucket.description = entry.description ?? bucket.description
      if (entry.amount_cents >= 0) {
        bucket.feeCents += entry.amount_cents
      } else {
        bucket.creditCents += Math.abs(entry.amount_cents)
      }
    }
  }

  const summary: VenueStatementSummary = {
    feesCents,
    feesLabel: formatCurrency(feesCents, invoice.currency),
    creditsCents,
    creditsLabel: formatCurrency(creditsCents, invoice.currency),
    adjustmentsCents,
    adjustmentsLabel: formatCurrency(adjustmentsCents, invoice.currency),
    netDueCents: feesCents - creditsCents + adjustmentsCents,
    netDueLabel: formatCurrency(feesCents - creditsCents + adjustmentsCents, invoice.currency),
  }

  const entries: VenueStatementBookingRow[] = Array.from(entryBuckets.values())
    .sort((a, b) => new Date(a.entryCreatedAt).getTime() - new Date(b.entryCreatedAt).getTime())
    .map((bucket) => ({
      id: bucket.id,
      bookingId: bucket.bookingId,
      dateLabel: bucket.date
        ? new Date(bucket.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : new Date(bucket.entryCreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      guestName: bucket.guestName,
      typeLabel: bucket.typeLabel,
      statusLabel: bucket.statusLabel,
      feeLabel: bucket.feeCents ? formatCurrency(bucket.feeCents, invoice.currency) : '—',
      creditLabel: bucket.creditCents ? formatCurrency(bucket.creditCents, invoice.currency) : '—',
      description: bucket.description,
    }))

  return {
    invoice,
    summary,
    entries,
  }
}
