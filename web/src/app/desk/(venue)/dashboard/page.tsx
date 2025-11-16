import { VenueDashboardClient } from './client'
import { fetchVenueDashboardData } from './actions'
import type { VenueDashboardFilters } from './types'

export const dynamic = 'force-dynamic'

export default async function VenueDashboardPage() {
  // Fetch initial data for current month
  const initialFilters: VenueDashboardFilters = {
    timePeriod: 'month',
    passType: null,
    userType: 'all',
  }

  const initialData = await fetchVenueDashboardData(initialFilters)

  return (
    <div className="mx-auto max-w-[105rem] px-6 py-10">
      <div className="mb-10">
        <h1 className="text-center text-3xl font-medium uppercase tracking-[0.05em] text-black">DASHBOARD</h1>
      </div>

      <VenueDashboardClient initialData={initialData} />
    </div>
  )
}
