'use server'

import { serviceRoleFetch } from '@/lib/supabase/service-role'
import type { DashboardData, DashboardFilters, Venue } from './types'

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

// Fetch all venues for the dropdown
export async function fetchVenues(): Promise<Venue[]> {
  try {
    const res = await serviceRoleFetch(
      '/rest/v1/venues?select=id,name&order=name.asc'
    )
    const venues = await res.json()
    return venues
  } catch (error) {
    console.error('Error fetching venues:', error)
    return []
  }
}

// Fetch dashboard data with filters
export async function fetchDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  try {
    const { startDate, endDate } = getDateRange(filters.timePeriod, filters.startDate, filters.endDate)

    // Build base query for bookings
    let bookingsQuery = `date=gte.${startDate}&date=lte.${endDate}`

    if (filters.venueId) {
      bookingsQuery += `&venue_id=eq.${filters.venueId}`
    }

    // Fetch bookings with user metadata and pass info (including profile for presentationKind)
    const bookingsSelect = encodeURIComponent(
      'id,status,hold_amount,hold_currency,date,party_size,user_id,pass_id,created_at,passes(kind,profile)'
    )

    const res = await serviceRoleFetch(
      `/rest/v1/bookings?select=${bookingsSelect}&${bookingsQuery}&order=date.asc`
    )

    const bookings = await res.json()

    // Fetch booking audit records for approved bookings to calculate approval time
    const approvedBookingIds = bookings
      .filter((b: any) => ['approved', 'issued', 'redeemed', 'redeemed_late'].includes(b.status))
      .map((b: any) => b.id)

    let averageApprovalTimeMinutes = 0

    if (approvedBookingIds.length > 0) {
      const auditQuery = encodeURIComponent('booking_id,from_status,to_status,created_at')
      const auditRes = await serviceRoleFetch(
        `/rest/v1/booking_audit?select=${auditQuery}&booking_id=in.(${approvedBookingIds.join(',')})&to_status=eq.approved&order=created_at.asc`
      )
      const auditRecords = await auditRes.json()

      // Calculate approval times for bookings that have audit records
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

    // Fetch user metadata for all unique user_ids to determine member vs guest
    const userIds = [...new Set(bookings.map((b: any) => b.user_id))]
    let userRoleMap = new Map<string, string>()

    if (userIds.length > 0) {
      const usersQuery = encodeURIComponent(`id,raw_user_meta_data`)
      const usersRes = await serviceRoleFetch(
        `/rest/v1/auth_user_profiles?select=${usersQuery}&id=in.(${userIds.join(',')})`
      )
      const users = await usersRes.json()

      // Create a map of user_id to app_role
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
        // Check if filtering by MIN_SPEND (which is the database kind)
        if (filters.passType === 'MIN_SPEND') {
          if (b.passes?.kind !== 'MIN_SPEND') return false
        } else {
          // Otherwise filter by presentationKind (BEACH_PASS, GYM_PASS, etc.)
          // But exclude MIN_SPEND passes even if they have matching presentationKind
          const presentationKind = b.passes?.profile?.presentationKind
          const passKind = b.passes?.kind
          if (presentationKind !== filters.passType || passKind === 'MIN_SPEND') return false
        }
      }

      return true
    })

    // Calculate KPIs
    const kpis = {
      pendingApprovals: filteredBookings.filter((b: any) => b.status === 'requested').length,
      approvedBookings: filteredBookings.filter((b: any) =>
        ['approved', 'issued'].includes(b.status)
      ).length,
      declinesTimeouts: filteredBookings.filter((b: any) => b.status === 'declined').length,
      noShows: filteredBookings.filter((b: any) => b.status === 'no_show').length,
      totalSpend: filteredBookings.reduce((sum: number, b: any) => {
        return sum + (b.hold_amount || 0)
      }, 0) / 100, // Convert cents to dollars
      platformCommission: 0, // Will calculate from ledger
      averageApprovalTimeMinutes
    }

    // Fetch platform commission from venue_ledger
    let ledgerQuery = `created_at=gte.${startDate}T00:00:00&created_at=lte.${endDate}T23:59:59`
    ledgerQuery += `&entry_type=in.(fee_due,platform_admin_no_show)`

    if (filters.venueId) {
      ledgerQuery += `&venue_id=eq.${filters.venueId}`
    }

    const ledgerRes = await serviceRoleFetch(
      `/rest/v1/venue_ledger?select=amount_cents,booking_id&${ledgerQuery}`
    )
    const ledgerEntries = await ledgerRes.json()

    // Filter ledger entries by booking IDs that match our filtered bookings
    const filteredBookingIds = new Set(filteredBookings.map((b: any) => b.id))
    const filteredLedger = ledgerEntries.filter((l: any) =>
      !l.booking_id || filteredBookingIds.has(l.booking_id)
    )

    kpis.platformCommission = filteredLedger.reduce((sum: number, l: any) => {
      return sum + (l.amount_cents || 0)
    }, 0) / 100 // Convert cents to dollars

    // Prepare chart data - group by date
    const bookingsByDate = new Map<string, number>()
    const spendByDate = new Map<string, number>()

    filteredBookings.forEach((b: any) => {
      const date = b.date
      bookingsByDate.set(date, (bookingsByDate.get(date) || 0) + 1)
      spendByDate.set(date, (spendByDate.get(date) || 0) + (b.hold_amount || 0))
    })

    // Generate all dates in range for complete chart
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
    console.error('Error fetching dashboard data:', error)
    // Return empty data structure on error
    return {
      kpis: {
        pendingApprovals: 0,
        approvedBookings: 0,
        declinesTimeouts: 0,
        noShows: 0,
        totalSpend: 0,
        platformCommission: 0,
        averageApprovalTimeMinutes: 0
      },
      bookingsChart: [],
      spendChart: []
    }
  }
}
