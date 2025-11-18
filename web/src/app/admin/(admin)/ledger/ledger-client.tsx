'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminStatementPreview } from '../statements/page'

type VenueOption = {
  id: string
  name: string
  email: string | null
}

type LedgerEntry = {
  id: string
  entryType: string
  entryLabel: string
  amountCents: number
  amountLabel: string
  currency: string
  bookingId: string | null
  bookingLabel: string | null
  description: string | null
  createdAt: string
  invoiceId: string | null
}

type LedgerSummary = {
  totalFeesLabel: string
  totalCreditsLabel: string
  netDueLabel: string
  unInvoicedCount: number
  includeInvoiced: boolean
  invoiceHint: string | null
}

const LEDGER_TYPE_OPTIONS = [
  { value: 'fee_due', label: 'Platform fee due' },
  { value: 'venue_credit_no_show', label: 'Venue credit (no-show)' },
  { value: 'platform_admin_no_show', label: 'Platform admin (no-show)' },
  { value: 'refund', label: 'Refund' },
  { value: 'adjustment', label: 'Adjustment' },
] as const

function getDefaultRange(days = 30) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - days)
  const toIso = (date: Date) => date.toISOString().slice(0, 10)
  return { start: toIso(start), end: toIso(end) }
}

type Props = {
  venues: VenueOption[]
}

export default function LedgerClient({ venues }: Props) {
  const [selectedVenue, setSelectedVenue] = useState(venues[0]?.id ?? '')
  const [periodStart, setPeriodStart] = useState(getDefaultRange().start)
  const [periodEnd, setPeriodEnd] = useState(getDefaultRange().end)
  const [includeInvoiced, setIncludeInvoiced] = useState(false)
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>(
    LEDGER_TYPE_OPTIONS.reduce(
      (acc, option) => {
        acc[option.value] = true
        return acc
      },
      {} as Record<string, boolean>
    )
  )
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adjustmentStatus, setAdjustmentStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string | null }>({
    status: 'idle',
    message: null,
  })
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false)
  const [statementPreview, setStatementPreview] = useState<{
    open: boolean
    data: AdminStatementPreview | null
    status: 'idle' | 'loading' | 'error'
    message: string | null
  }>({ open: false, data: null, status: 'idle', message: null })
  const [sendState, setSendState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string | null }>({
    status: 'idle',
    message: null,
  })
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')

  const currentVenue = useMemo(() => venues.find((venue) => venue.id === selectedVenue) ?? venues[0], [venues, selectedVenue])

  useEffect(() => {
    if (currentVenue) {
      setRecipientName(currentVenue.name)
      setRecipientEmail(currentVenue.email ?? '')
    }
  }, [currentVenue])

  const activeTypes = useMemo(
    () => LEDGER_TYPE_OPTIONS.filter((option) => typeFilters[option.value]).map((option) => option.value),
    [typeFilters]
  )
  const activeTypesKey = useMemo(() => activeTypes.join(','), [activeTypes])

  const fetchLedger = useCallback(async () => {
    if (!selectedVenue) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('venueId', selectedVenue)
      params.set('start', periodStart)
      params.set('end', periodEnd)
      params.set('includeInvoiced', String(includeInvoiced))
      if (activeTypes.length && activeTypes.length !== LEDGER_TYPE_OPTIONS.length) {
        params.set('types', activeTypesKey)
      }
      const res = await fetch(`/api/admin/ledger?${params.toString()}`)
      const json = (await res.json().catch(() => ({}))) as { entries?: LedgerEntry[]; summary?: LedgerSummary; error?: string }
      if (!res.ok || !json.entries || !json.summary) {
        throw new Error(json.error ?? 'Unable to load ledger')
      }
      setEntries(json.entries)
      setSummary(json.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ledger')
    } finally {
      setLoading(false)
    }
  }, [selectedVenue, periodStart, periodEnd, includeInvoiced, activeTypes, activeTypesKey])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const handleAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setAdjustmentStatus({ status: 'loading', message: null })
    try {
      const res = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: selectedVenue,
          entryType: formData.get('entryType'),
          amount: formData.get('amount'),
          description: formData.get('description'),
          bookingId: formData.get('bookingId') || null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? 'Unable to add adjustment')
      }
      setAdjustmentStatus({ status: 'success', message: 'Adjustment added.' })
      event.currentTarget.reset()
      setShowAdjustmentForm(false)
      fetchLedger()
    } catch (err) {
      setAdjustmentStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unable to add adjustment',
      })
    }
  }

  const openStatementPreview = async () => {
    if (!selectedVenue || (summary && summary.includeInvoiced)) return
    setStatementPreview({ open: true, data: null, status: 'loading', message: null })
    setSendState({ status: 'idle', message: null })
    try {
      const res = await fetch('/api/admin/statements/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: selectedVenue, periodStart, periodEnd }),
      })
      const json = (await res.json().catch(() => ({}))) as { preview?: AdminStatementPreview; error?: string }
      if (!res.ok || !json.preview) {
        throw new Error(json.error ?? 'Unable to build preview')
      }
      setStatementPreview({ open: true, data: json.preview, status: 'idle', message: null })
      if (!recipientName && currentVenue) {
        setRecipientName(currentVenue.name)
      }
      if (!recipientEmail && currentVenue?.email) {
        setRecipientEmail(currentVenue.email)
      }
    } catch (err) {
      setStatementPreview({
        open: true,
        data: null,
        status: 'error',
        message: err instanceof Error ? err.message : 'Unable to build preview',
      })
    }
  }

  const sendStatement = async () => {
    if (!statementPreview.data || !recipientEmail) {
      setSendState({ status: 'error', message: 'Recipient email is required.' })
      return
    }
    setSendState({ status: 'loading', message: null })
    try {
      const res = await fetch('/api/admin/statements/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: selectedVenue,
          periodStart,
          periodEnd,
          recipientEmail,
          recipientName,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { invoiceId?: string; error?: string }
      if (!res.ok || !json.invoiceId) {
        throw new Error(json.error ?? 'Unable to send statement')
      }
      setSendState({ status: 'success', message: 'Statement sent.' })
      setStatementPreview({ open: false, data: null, status: 'idle', message: null })
      fetchLedger()
    } catch (err) {
      setSendState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unable to send statement',
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full rounded-3xl border border-[#E8E4D7] bg-white p-4 shadow-sm lg:w-64">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Venues</h3>
        <div className="mt-4 space-y-2">
          {venues.map((venue) => (
            <button
              key={venue.id}
              type="button"
              onClick={() => setSelectedVenue(venue.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                venue.id === selectedVenue
                  ? 'border-[#02374D] bg-[#02374D] text-white'
                  : 'border-[#E8E4D7] text-[#02374D] hover:border-[#02374D]'
              }`}
            >
              {venue.name}
            </button>
          ))}
        </div>
      </aside>
      <section className="flex-1 space-y-6 rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Period start
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Period end
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            <input
              type="checkbox"
              checked={includeInvoiced}
              onChange={(event) => setIncludeInvoiced(event.target.checked)}
            />
            Show invoiced entries
          </label>
          <div className="flex flex-wrap gap-3 text-sm text-[#4F514D]">
            {LEDGER_TYPE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={typeFilters[option.value]}
                  onChange={(event) =>
                    setTypeFilters((prev) => ({
                      ...prev,
                      [option.value]: event.target.checked,
                    }))
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {summary ? (
          <div className="grid gap-4 rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">Fees due</p>
              <p className="text-2xl font-semibold text-[#02374D]">{summary.totalFeesLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">No-show credits</p>
              <p className="text-2xl font-semibold text-[#02374D]">{summary.totalCreditsLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">Net due</p>
              <p className="text-2xl font-semibold text-[#02374D]">{summary.netDueLabel}</p>
              {summary.invoiceHint ? (
                <p className="text-xs text-[#4F514D]">
                  {summary.invoiceHint === 'multiple' ? 'Included across multiple invoices.' : `Included in invoice ${summary.invoiceHint}`}
                </p>
              ) : (
                <p className="text-xs text-[#4F514D]">Uninvoiced entries: {summary.unInvoicedCount}</p>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowAdjustmentForm((prev) => !prev)}
            className="rounded-full border border-[#02374D] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
          >
            {showAdjustmentForm ? 'Close adjustment' : 'Add adjustment'}
          </button>
          <button
            type="button"
            onClick={openStatementPreview}
            disabled={summary ? summary.unInvoicedCount === 0 || summary.includeInvoiced : true}
            className="rounded-full bg-black px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            Create statement
          </button>
        </div>

        {showAdjustmentForm ? (
          <form onSubmit={handleAdjustment} className="space-y-4 rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                Type
                <select
                  name="entryType"
                  className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                  defaultValue="adjustment"
                >
                  {LEDGER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                Amount (USD)
                <input
                  required
                  type="number"
                  step="0.01"
                  name="amount"
                  className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                  placeholder="100.00"
                />
              </label>
            </div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
              Booking ID (optional)
              <input
                type="text"
                name="bookingId"
                className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                placeholder="booking uuid"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
              Description
              <input
                type="text"
                name="description"
                required
                className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                placeholder="Waived fee due to outage"
              />
            </label>
            <div className="flex flex-col gap-1">
              <button
                type="submit"
                className="rounded-full bg-black px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800"
              >
                Save adjustment
              </button>
              {adjustmentStatus.status !== 'idle' ? (
                <p
                  className={`text-xs ${
                    adjustmentStatus.status === 'success' ? 'text-[#035C4C]' : 'text-[#B4231F]'
                  }`}
                >
                  {adjustmentStatus.message}
                </p>
              ) : null}
            </div>
          </form>
        ) : null}

        {loading ? (
          <p className="text-sm text-[#4F514D]">Loading ledger…</p>
        ) : error ? (
          <p className="text-sm text-[#B4231F]">{error}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E8E4D7]">
            <table className="min-w-full divide-y divide-[#E8E4D7] text-sm">
              <thead className="bg-[#F4F1E7] text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Booking</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4D7]">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-[#02374D]">
                      {new Date(entry.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-[#4F514D]">{entry.entryLabel}</td>
                    <td className="px-4 py-3 text-[#4F514D]">
                      {entry.bookingLabel ?? '—'}
                      {entry.bookingId ? (
                        <span className="ml-2 font-mono text-xs text-[#8B8E87]">{entry.bookingId.slice(0, 8)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[#4F514D]">{entry.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#02374D]">{entry.amountLabel}</td>
                    <td className="px-4 py-3 text-[#4F514D]">
                      {entry.invoiceId ? entry.invoiceId.slice(0, 8).toUpperCase() : '—'}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#4F514D]">
                      No ledger entries found for this filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {statementPreview.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#02374D]">Statement preview</h3>
              <button type="button" onClick={() => setStatementPreview({ open: false, data: null, status: 'idle', message: null })}>
                ✕
              </button>
            </div>
            {statementPreview.status === 'loading' ? (
              <p className="mt-4 text-sm text-[#4F514D]">Building preview…</p>
            ) : statementPreview.status === 'error' ? (
              <p className="mt-4 text-sm text-[#B4231F]">{statementPreview.message}</p>
            ) : statementPreview.data ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">Total due</p>
                  <p className="text-2xl font-semibold text-[#02374D]">{statementPreview.data.totalLabel}</p>
                  <p className="text-sm text-[#4F514D]">
                    Period {statementPreview.data.period.start} → {statementPreview.data.period.end}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E8E4D7] bg-white">
                  <table className="min-w-full divide-y divide-[#E8E4D7] text-sm">
                    <thead className="bg-[#F4F1E7] text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E4D7]">
                      {statementPreview.data.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-3 text-[#02374D]">{entry.createdLabel}</td>
                          <td className="px-4 py-3 text-[#4F514D]">{entry.entry_type}</td>
                          <td className="px-4 py-3 text-[#4F514D]">{entry.description ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#02374D]">{entry.amountLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                    Recipient name
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(event) => setRecipientName(event.target.value)}
                      className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                    Recipient email
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(event) => setRecipientEmail(event.target.value)}
                      className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={sendStatement}
                    disabled={sendState.status === 'loading'}
                    className="rounded-full bg-black px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 disabled:opacity-60"
                  >
                    {sendState.status === 'loading' ? 'Sending…' : 'Send statement'}
                  </button>
                  {sendState.status !== 'idle' ? (
                    <p
                      className={`text-xs ${
                        sendState.status === 'success' ? 'text-[#035C4C]' : 'text-[#B4231F]'
                      }`}
                    >
                      {sendState.message}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
