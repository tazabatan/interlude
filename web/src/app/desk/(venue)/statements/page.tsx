import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'
import { fetchVenueStatements } from '@/lib/ledger'

export default async function VenueStatementsPage() {
  const { user, role } = await getUserRole()
  if (!user || !['venue_manager', 'venue_staff'].includes(role)) {
    notFound()
  }
  const venueId = (user.user_metadata?.venue_id as string | undefined) ?? null
  if (!venueId) {
    notFound()
  }

  const statements = await fetchVenueStatements(venueId)

  return (
    <div className="space-y-8 text-[#02374D]">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Statements</p>
        <h1 className="text-3xl font-semibold">Weekly statements</h1>
        <p className="text-sm text-[#4F514D]">Review what’s been billed and open the statement details to see bookings.</p>
      </header>

      <section className="rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#02374D]">Statement history</h2>
          <p className="text-sm text-[#4F514D]">{statements.length} total</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E8E4D7] text-sm">
            <thead className="bg-[#F4F1E7] text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
              <tr>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Net amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4D7]">
              {statements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-[#4F514D]">
                    No statements yet. Once you have bookings, weekly statements will appear here.
                  </td>
                </tr>
              ) : (
                statements.map((statement) => (
                  <tr key={statement.id}>
                    <td className="px-4 py-3 font-medium text-[#02374D]">{statement.periodLabel}</td>
                    <td className="px-4 py-3 text-[#02374D]">{statement.totalLabel}</td>
                    <td className="px-4 py-3 capitalize text-[#4F514D]">{statement.status.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/desk/statements/${statement.id}`}
                        className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
                      >
                        View
                      </Link>
                    </td>
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
