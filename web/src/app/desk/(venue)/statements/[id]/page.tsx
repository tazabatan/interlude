import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'
import { fetchVenueStatementDetail } from '@/lib/ledger'

type Params = Promise<{ id: string }>

export default async function StatementDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const { user, role } = await getUserRole()
  if (!user || !['venue_manager', 'venue_staff'].includes(role)) {
    notFound()
  }
  const venueId = (user.user_metadata?.venue_id as string | undefined) ?? null
  if (!venueId) {
    notFound()
  }

  const detail = await fetchVenueStatementDetail(venueId, id)
  if (!detail) {
    notFound()
  }

  return (
    <div className="space-y-8 text-[#02374D]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/desk/statements" className="text-sm text-[#4F514D] underline-offset-4 hover:underline">
            ← Back to statements
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">Statement for {detail.invoice.periodLabel}</h1>
          <p className="text-sm text-[#4F514D]">Review the bookings that make up this statement.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] opacity-60"
            disabled
          >
            Download PDF
          </button>
          <button
            type="button"
            className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] opacity-60"
            disabled
          >
            Export CSV
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Summary</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Fees on redeemed bookings" value={detail.summary.feesLabel} />
          <SummaryCard label="No-show credits" value={detail.summary.creditsLabel} />
          <SummaryCard label="Adjustments" value={detail.summary.adjustmentsLabel} />
          <SummaryCard label="Net due" value={detail.summary.netDueLabel} highlight />
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm" id="bookings">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Bookings on this statement</h2>
            <p className="text-sm text-[#4F514D]">Use this table when a venue GM asks for the detail.</p>
          </div>
          <div className="text-right text-sm text-[#4F514D]">
            <p>{detail.entries.length} entries</p>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">
              {detail.invoice.periodLabel.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E8E4D7] text-sm">
            <thead className="bg-[#F4F1E7] text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Guest</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Fee to Interlude</th>
                <th className="px-4 py-3 text-right">No-show credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4D7]">
              {detail.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-[#4F514D]">
                    No bookings were included on this statement.
                  </td>
                </tr>
              ) : (
                detail.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-[#02374D]">{entry.dateLabel}</td>
                    <td className="px-4 py-3 text-[#02374D]">
                      {entry.guestName}
                      {entry.description ? (
                        <span className="block text-xs text-[#6F716D]">{entry.description}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-[#4F514D]">{entry.typeLabel}</td>
                    <td className="px-4 py-3 text-[#4F514D]">{entry.statusLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#02374D]">{entry.feeLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#02374D]">{entry.creditLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${highlight ? 'border-black bg-black text-white' : 'border-[#E8E4D7] bg-[#F9F6ED]'}`}>
      <p className={`text-xs uppercase tracking-[0.2em] ${highlight ? 'text-white/70' : 'text-[#6F716D]'}`}>{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  )
}
