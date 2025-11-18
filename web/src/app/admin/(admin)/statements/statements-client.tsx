'use client'

import { useEffect, useMemo, useState } from 'react'
import type { AdminStatementPreview } from './page'

type VenueOption = {
  id: string
  name: string
  email: string | null
}

type Props = {
  venues: VenueOption[]
}

type PreviewState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  data: AdminStatementPreview | null
  message: string | null
}

const entryLabels: Record<string, string> = {
  fee_due: 'Platform fee due',
  venue_credit_no_show: 'Venue credit (no-show)',
  platform_admin_no_show: 'Platform admin (no-show)',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

const LEDGER_ENTRY_OPTIONS = ['fee_due', 'venue_credit_no_show', 'platform_admin_no_show', 'refund', 'adjustment'] as const

function getDefaultRange() {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = (day + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const toIso = (date: Date) => date.toISOString().slice(0, 10)
  return { start: toIso(monday), end: toIso(sunday) }
}

export default function StatementsClient({ venues }: Props) {
  const [selectedVenue, setSelectedVenue] = useState(venues[0]?.id ?? '')
  const [periodStart, setPeriodStart] = useState(getDefaultRange().start)
  const [periodEnd, setPeriodEnd] = useState(getDefaultRange().end)
  const [recipientName, setRecipientName] = useState(venues[0]?.name ?? '')
  const [recipientEmail, setRecipientEmail] = useState(venues[0]?.email ?? '')
  const [previewState, setPreviewState] = useState<PreviewState>({ status: 'idle', data: null, message: null })
  const [sendStatus, setSendStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string | null }>({
    status: 'idle',
    message: null,
  })
  const [ledgerStatus, setLedgerStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string | null }>({
    status: 'idle',
    message: null,
  })

  const currentVenue = useMemo(() => venues.find((venue) => venue.id === selectedVenue) ?? venues[0], [venues, selectedVenue])

  useEffect(() => {
    if (currentVenue) {
      setRecipientName(currentVenue.name)
      setRecipientEmail(currentVenue.email ?? '')
    }
  }, [currentVenue])

  const fetchPreview = async () => {
    setPreviewState({ status: 'loading', data: null, message: null })
    setSendStatus({ status: 'idle', message: null })
    try {
      const res = await fetch('/api/admin/statements/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: selectedVenue,
          periodStart,
          periodEnd,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { preview?: AdminStatementPreview; error?: string }
      if (!res.ok || !json.preview) {
        throw new Error(json.error ?? 'Unable to generate preview')
      }
      setPreviewState({ status: 'ready', data: json.preview, message: null })
    } catch (error) {
      setPreviewState({
        status: 'error',
        data: null,
        message: error instanceof Error ? error.message : 'Unable to generate preview',
      })
    }
  }

  const handleLedgerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setLedgerStatus({ status: 'loading', message: null })
    try {
      const res = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: formData.get('venueId'),
          entryType: formData.get('entryType'),
          amount: formData.get('amount'),
          description: formData.get('description'),
          bookingId: formData.get('bookingId'),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(json.error ?? 'Unable to add ledger entry')
      }
      setLedgerStatus({ status: 'success', message: 'Ledger entry recorded.' })
      event.currentTarget.reset()
    } catch (error) {
      setLedgerStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to add ledger entry',
      })
    }
  }

  const handleSendStatement = async () => {
    if (!previewState.data) return
    if (!recipientEmail) {
      setSendStatus({ status: 'error', message: 'Recipient email is required.' })
      return
    }
    setSendStatus({ status: 'loading', message: null })
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
          notes: previewState.data.entries.length ? `Ledger items: ${previewState.data.entries.length}` : null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { invoiceId?: string; error?: string }
      if (!res.ok || !json.invoiceId) {
        throw new Error(json.error ?? 'Unable to send statement')
      }
      setSendStatus({ status: 'success', message: 'Statement sent to venue contact.' })
      setPreviewState({ status: 'idle', data: null, message: null })
    } catch (error) {
      setSendStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to send statement',
      })
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4 border-b border-[#E8E4D7] pb-6">
        <header>
          <h2 className="text-xl font-semibold uppercase tracking-[0.1em] text-black">Add ledger entry</h2>
          <p className="text-sm text-[#4F514D]">Record manual credits, adjustments, or fees before generating statements.</p>
        </header>
        <form onSubmit={handleLedgerSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Venue
            <select
              name="venueId"
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
              defaultValue={selectedVenue}
            >
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Entry type
            <select
              name="entryType"
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
              defaultValue="fee_due"
            >
              {LEDGER_ENTRY_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {entryLabels[type] ?? type}
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
              placeholder="100.00"
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Booking ID (optional)
            <input
              type="text"
              name="bookingId"
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
              placeholder="booking uuid"
            />
          </label>
          <label className="md:col-span-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Description
            <input
              type="text"
              name="description"
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
              placeholder="e.g. Min spend adjusted for NYE"
            />
          </label>
          <div className="md:col-span-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800"
            >
              Record entry
            </button>
            {ledgerStatus.status !== 'idle' ? (
              <p
                className={`text-sm ${
                  ledgerStatus.status === 'success' ? 'text-[#035C4C]' : 'text-[#B4231F]'
                }`}
              >
                {ledgerStatus.message}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold uppercase tracking-[0.1em] text-black">Generate statement</h2>
          <p className="text-sm text-[#4F514D]">
            Pick a venue and date range to preview outstanding ledger items before sending the weekly statement.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
            Venue
            <select
              value={selectedVenue}
              onChange={(event) => setSelectedVenue(event.target.value)}
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
            >
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>
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
          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchPreview}
              className="w-full rounded-full border border-[#02374D] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
            >
              Preview statement
            </button>
          </div>
        </div>
        {previewState.status === 'error' ? (
          <p className="text-sm text-[#B4231F]">{previewState.message}</p>
        ) : null}
        {previewState.status === 'ready' && previewState.data ? (
          <div className="space-y-4 rounded-2xl border border-[#E8E4D7] bg-[#FAF8F0] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#6F716D]">Total due</p>
                <p className="text-3xl font-semibold text-[#02374D]">{previewState.data.totalLabel}</p>
              </div>
              <div className="text-right text-sm text-[#4F514D]">
                <p>
                  Period: {previewState.data.period.start} → {previewState.data.period.end}
                </p>
                <p>{previewState.data.entries.length} ledger lines</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#E8E4D7] bg-white">
              <table className="min-w-full divide-y divide-[#E8E4D7] text-sm">
                <thead className="bg-[#F4F1E7] text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Booking</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4D7]">
                  {previewState.data.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-[#02374D]">{entry.createdLabel}</td>
                      <td className="px-4 py-3 text-[#4F514D]">{entryLabels[entry.entry_type] ?? entry.entry_type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#4F514D]">
                        {entry.booking_id ? entry.booking_id.slice(0, 8) : '—'}
                      </td>
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
                  placeholder="Cap Juluca Desk"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
                Recipient email
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  required
                  className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-[#31332f]"
                  placeholder="desk@venue.com"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={sendStatus.status === 'loading'}
              onClick={handleSendStatement}
              className="w-full rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {sendStatus.status === 'loading' ? 'Sending…' : 'Send statement email'}
            </button>
            {sendStatus.status !== 'idle' ? (
              <p
                className={`text-sm ${
                  sendStatus.status === 'success' ? 'text-[#035C4C]' : 'text-[#B4231F]'
                }`}
              >
                {sendStatus.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
