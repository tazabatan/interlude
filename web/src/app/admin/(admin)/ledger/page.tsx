import { serviceRoleFetch } from '@/lib/supabase/service-role'
import LedgerClient from './ledger-client'

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
    primary_contact_email?: string | null
  }>
  return data.map((venue) => ({
    id: venue.id,
    name: venue.name ?? 'Unnamed venue',
    email: null,
  }))
}

export default async function LedgerPage() {
  const venues = await fetchVenues()
  return (
    <div className="space-y-6 text-[#02374D]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Finance</p>
        <h1 className="text-3xl font-semibold text-[#02374D]">Ledger</h1>
        <p className="mt-2 text-sm text-[#4F514D]">
          Track every fee, credit, and adjustment. Generate statements directly from ledger entries.
        </p>
      </header>
      <LedgerClient venues={venues} />
    </div>
  )
}
