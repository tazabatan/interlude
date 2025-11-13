export type TimePeriod = 'day' | 'week' | 'month'

export type UserType = 'all' | 'member' | 'guest'

export type VenueDashboardFilters = {
  timePeriod: TimePeriod | 'custom'
  passType: string | null // null means "All Pass Types"
  userType: UserType
  startDate?: string
  endDate?: string
}

export type VenueKPIData = {
  pendingApprovals: number
  approvedBookings: number
  declinedRequests: number
  noShows: number
  averageApprovalTimeMinutes: number
  venueRevenue: number // in dollars (after platform commission)
  missedRevenue: number // in dollars (from declined/timed out requests)
  averageBookingValue: number // in dollars
  approvalRate: number // percentage
  totalBookings: number
}

export type ChartDataPoint = {
  date: string
  count: number
  amount?: number
}

export type VenueDashboardData = {
  kpis: VenueKPIData
  bookingsChart: ChartDataPoint[]
  spendChart: ChartDataPoint[]
}
