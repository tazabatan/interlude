import { DashboardClient } from './client'
import { fetchDashboardData, fetchVenues } from './actions'
import type { DashboardFilters } from './types'

export default async function DashboardPage() {
  // Fetch initial data for current month
  const initialFilters: DashboardFilters = {
    timePeriod: 'month',
    venueId: null,
    passType: null,
    userType: 'all',
  }

  const [initialData, venues] = await Promise.all([
    fetchDashboardData(initialFilters),
    fetchVenues(),
  ])

  return (
    <div className="mx-auto max-w-[105rem] px-6 py-10">
      <div className="mb-10">
        <h1 className="text-center text-3xl font-medium uppercase tracking-[0.05em] text-black">DASHBOARD</h1>
      </div>

      <DashboardClient initialData={initialData} venues={venues} />
    </div>
  )
}
