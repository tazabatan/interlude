export type TimePeriod = 'day' | 'week' | 'month'

export type UserType = 'all' | 'member' | 'guest'

export type DashboardFilters = {
  timePeriod: TimePeriod | 'custom'
  venueId: string | null // null means "All Venues"
  passType: string | null // null means "All Pass Types", otherwise 'BEACH_PASS', 'GYM_PASS', 'SPA_PASS', 'POOL_PASS', 'MIN_SPEND'
  userType: UserType
  startDate?: string
  endDate?: string
}

export type KPIData = {
  pendingApprovals: number
  approvedBookings: number
  declinesTimeouts: number
  noShows: number
  totalSpend: number // in dollars
  platformCommission: number // in dollars
  averageApprovalTimeMinutes: number // in minutes
}

export type ChartDataPoint = {
  date: string
  count: number
  amount?: number
}

export type DashboardData = {
  kpis: KPIData
  bookingsChart: ChartDataPoint[]
  spendChart: ChartDataPoint[]
}

export type Venue = {
  id: string
  name: string
}
