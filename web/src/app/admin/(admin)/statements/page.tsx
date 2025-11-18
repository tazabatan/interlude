import StatementsClient from './statements-client'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import type { StatementPreviewResult } from '@/lib/ledger'

type VenueOption = {
  id: string
  name: string
  email: string | null
}

async function fetchVenues(): Promise<VenueOption[]> {
  const params = new URLSearchParams()
  params.set('select', 'id,name')
  params.set('order', 'name')
  const res = await serviceRoleFetch(`/rest/v1/venues?${params.toString()}`)
  if (!res.ok) {
    return []
  }
  const data = (await res.json()) as Array<{
    id: string
    name: string | null
  }>
  return data.map((venue) => ({
    id: venue.id,
    name: venue.name ?? 'Unnamed venue',
    email: null,
  }))
}

export type AdminStatementPreview = StatementPreviewResult

export default async function StatementsPage() {
  const venues = await fetchVenues()
  if (venues.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-3xl font-semibold text-[#02374D]">Statements</h1>
          <p className="text-sm text-[#4F514D]">Add a venue before generating statements.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-[#02374D]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Finance</p>
        <h1 className="text-3xl font-semibold text-[#02374D]">Statements & Ledger</h1>
        <p className="mt-2 text-sm text-[#4F514D]">
          Record venue credits/fees and send weekly statements with a single click.
        </p>
      </header>
      <div className="rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <StatementsClient venues={venues} />
      </div>
    </div>
  )
}
