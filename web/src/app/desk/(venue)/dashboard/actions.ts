'use server'

import { getUserRole } from '@/lib/get-user-role'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import type { VenueDashboardData, VenueDashboardFilters } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const filterIds = (ids: unknown[]) =>
  [
    ...new Set(
      ids
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => UUID_RE.test(id))
    ),
  ]

// Helper function to get date range based on time period
function getDateRange(timePeriod: 'day' | 'week' | 'month' | 'custom', customStart?: string, customEnd?: string): { startDate: string; endDate: string } {
  // For custom period, use provided dates
  if (timePeriod === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd }
  }

  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  let startDate: string

  switch (timePeriod) {
    case 'day':
      startDate = endDate // Today
      break
    case 'week':
      const weekAgo = new Date(now)
      weekAgo.setDate(now.getDate() - 7)
      startDate = weekAgo.toISOString().split('T')[0]
      break
    case 'month':
      const monthAgo = new Date(now)
      monthAgo.setMonth(now.getMonth() - 1)
      startDate = monthAgo.toISOString().split('T')[0]
      break
    case 'custom':
      // Fallback if custom dates not provided
      const defaultWeekAgo = new Date(now)
      defaultWeekAgo.setDate(now.getDate() - 7)
      startDate = defaultWeekAgo.toISOString().split('T')[0]
      break
  }

  return { startDate, endDate }
}

// Fetch dashboard data for the venue
export async function fetchVenueDashboardData(filters: VenueDashboardFilters): Promise<VenueDashboardData> {
  try {
    // IMPORTANT: Get venue_id from the authenticated user
    const { user } = await getUserRole()
    const venueId = (user?.user_metadata?.venue_id as string | undefined) ?? null

    if (!venueId) {
      throw new Error('Venue ID not found for user')
    }

    const { startDate, endDate } = getDateRange(filters.timePeriod, filters.startDate, filters.endDate)

    // Build query for bookings - ALWAYS filter by venue_id
    let bookingsQuery = `date=gte.${startDate}&date=lte.${endDate}&venue_id=eq.${venueId}`

    // Fetch bookings with user metadata and pass info
    const bookingsSelect = encodeURIComponent(
      'id,status,hold_amount,hold_currency,date,party_size,user_id,pass_id,created_at,passes(kind,profile)'
    )

    const res = await serviceRoleFetch(
      `/rest/v1/bookings?select=${bookingsSelect}&${bookingsQuery}&order=date.asc`
    )

    const bookings = await res.json()

    // Fetch booking audit records for approval time calculation
    const approvedBookingIds = filterIds(
      bookings
        .filter((b: any) => ['approved', 'issued', 'redeemed', 'redeemed_late'].includes(b.status))
        .map((b: any) => b.id)
    )

    let averageApprovalTimeMinutes = 0

    if (approvedBookingIds.length > 0) {
      const auditQuery = encodeURIComponent('booking_id,from_status,to_status,created_at')
      const auditRes = await serviceRoleFetch(
        `/rest/v1/booking_audit?select=${auditQuery}&booking_id=in.(${approvedBookingIds.join(',')})&to_status=eq.approved&order=created_at.asc`
      )
      const auditRecords = await auditRes.json()

      const approvalTimes: number[] = []
      auditRecords.forEach((audit: any) => {
        const booking = bookings.find((b: any) => b.id === audit.booking_id)
        if (booking?.created_at && audit.created_at) {
          const requestTime = new Date(booking.created_at).getTime()
          const approvalTime = new Date(audit.created_at).getTime()
          const diffMinutes = (approvalTime - requestTime) / (1000 * 60)
          if (diffMinutes >= 0) {
            approvalTimes.push(diffMinutes)
          }
        }
      })

      if (approvalTimes.length > 0) {
        averageApprovalTimeMinutes = approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length
      }
    }

    // Fetch user metadata for guest/member filtering
    const userIds = filterIds(bookings.map((b: any) => b.user_id))
    let userRoleMap = new Map<string, string>()

    if (userIds.length > 0) {
      const usersQuery = encodeURIComponent(`id,raw_user_meta_data`)
      const usersRes = await serviceRoleFetch(
        `/rest/v1/auth_user_profiles?select=${usersQuery}&id=in.(${userIds.join(',')})`
      )
      const users = await usersRes.json()

      userRoleMap = new Map(
        users.map((u: any) => [
          u.id,
          u.raw_user_meta_data?.app_role || 'guest'
        ])
      )
    }

    // Filter bookings by user type and pass type
    let filteredBookings = bookings.filter((b: any) => {
      // Filter by user type
      if (filters.userType !== 'all') {
        const userRole = userRoleMap.get(b.user_id) || 'guest'
        if (filters.userType === 'member' && userRole !== 'member') return false
        if (filters.userType === 'guest' && userRole !== 'guest') return false
      }

      // Filter by pass type
      if (filters.passType) {
        if (filters.passType === 'MIN_SPEND') {
          if (b.passes?.kind !== 'MIN_SPEND') return false
        } else {
          const presentationKind = b.passes?.profile?.presentationKind
          const passKind = b.passes?.kind
          if (presentationKind !== filters.passType || passKind === 'MIN_SPEND') return false
        }
      }

      return true
    })

    // Calculate total spend and revenue
    const totalSpend = filteredBookings.reduce((sum: number, b: any) => {
      return sum + (b.hold_amount || 0)
    }, 0) / 100 // Convert to dollars

    // Calculate venue revenue (90% of spend - platform keeps 10%)
    const venueRevenue = totalSpend * 0.9

    // Calculate missed revenue from declined requests
    const declinedBookings = filteredBookings.filter((b: any) => b.status === 'declined')
    const missedRevenue = declinedBookings.reduce((sum: number, b: any) => {
      return sum + (b.hold_amount || 0)
    }, 0) / 100 * 0.9 // Venue would have gotten 90%

    // Calculate KPIs
    const pendingApprovals = filteredBookings.filter((b: any) => b.status === 'requested').length
    const approvedBookings = filteredBookings.filter((b: any) =>
      ['approved', 'issued'].includes(b.status)
    ).length
    const declinedRequests = filteredBookings.filter((b: any) => b.status === 'declined').length
    const noShows = filteredBookings.filter((b: any) => b.status === 'no_show').length
    const totalBookings = filteredBookings.length

    // Calculate approval rate
    const totalProcessed = approvedBookings + declinedRequests
    const approvalRate = totalProcessed > 0 ? (approvedBookings / totalProcessed) * 100 : 0

    // Calculate average booking value
    const revenueGeneratingBookings = filteredBookings.filter((b: any) =>
      ['approved', 'issued', 'redeemed', 'redeemed_late', 'no_show'].includes(b.status)
    )
    const averageBookingValue = revenueGeneratingBookings.length > 0
      ? totalSpend / revenueGeneratingBookings.length
      : 0

    const kpis = {
      pendingApprovals,
      approvedBookings,
      declinedRequests,
      noShows,
      averageApprovalTimeMinutes,
      venueRevenue,
      missedRevenue,
      averageBookingValue,
      approvalRate,
      totalBookings
    }

    // Prepare chart data
    const bookingsByDate = new Map<string, number>()
    const spendByDate = new Map<string, number>()

    filteredBookings.forEach((b: any) => {
      const date = b.date
      bookingsByDate.set(date, (bookingsByDate.get(date) || 0) + 1)
      spendByDate.set(date, (spendByDate.get(date) || 0) + (b.hold_amount || 0))
    })

    // Generate all dates in range
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }

    const bookingsChart = dates.map(date => ({
      date,
      count: bookingsByDate.get(date) || 0
    }))

    const spendChart = dates.map(date => ({
      date,
      amount: (spendByDate.get(date) || 0) / 100 // Convert to dollars
    }))

    return {
      kpis,
      bookingsChart,
      spendChart
    }
  } catch (error) {
    console.error('Error fetching venue dashboard data:', error)
    // Return empty data structure on error
    return {
      kpis: {
        pendingApprovals: 0,
        approvedBookings: 0,
        declinedRequests: 0,
        noShows: 0,
        averageApprovalTimeMinutes: 0,
        venueRevenue: 0,
        missedRevenue: 0,
        averageBookingValue: 0,
        approvalRate: 0,
        totalBookings: 0
      },
      bookingsChart: [],
      spendChart: []
    }
  }
}
