'use client'

import { useState, useEffect, useTransition } from 'react'
import { KPICard, PendingIcon, CheckIcon, XIcon, AlertIcon, DollarIcon, TrendingUpIcon, ClockIcon } from './kpi-card'
import { Filters } from './filters'
import { BookingsChart } from './bookings-chart'
import { SpendChart } from './spend-chart'
import { fetchVenueDashboardData } from './actions'
import type { VenueDashboardData, VenueDashboardFilters } from './types'

type VenueDashboardClientProps = {
  initialData: VenueDashboardData
}

export function VenueDashboardClient({ initialData }: VenueDashboardClientProps) {
  const [data, setData] = useState<VenueDashboardData>(initialData)
  const [filters, setFilters] = useState<VenueDashboardFilters>({
    timePeriod: 'month',
    passType: null,
    userType: 'all',
  })
  const [isPending, startTransition] = useTransition()

  // Fetch data when filters change
  useEffect(() => {
    startTransition(async () => {
      const newData = await fetchVenueDashboardData(filters)
      setData(newData)
    })
  }, [filters])

  const handleFiltersChange = (newFilters: VenueDashboardFilters) => {
    setFilters(newFilters)
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format approval time
  const formatApprovalTime = (mins: number) => {
    if (mins === 0) return 'N/A'
    if (mins < 60) return `${Math.round(mins)}m`
    const hours = Math.floor(mins / 60)
    const remainingMins = Math.round(mins % 60)
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  }

  return (
    <div className="space-y-8">
      {/* Loading indicator */}
      {isPending && (
        <div className="fixed right-8 top-24 z-50 rounded-full bg-[#02374D] px-4 py-2 text-sm font-medium text-white shadow-lg">
          Loading...
        </div>
      )}

      {/* Filters */}
      <Filters filters={filters} onChange={handleFiltersChange} />

      {/* Primary KPIs - Actionable */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Action Required
        </h2>
        <div className="grid gap-6 lg:grid-cols-1">
          <KPICard
            label="Pending Approvals"
            value={data.kpis.pendingApprovals}
            icon={<PendingIcon />}
            cta={
              data.kpis.pendingApprovals > 0
                ? {
                    label: 'View Requests',
                    href: '/desk/requests',
                  }
                : undefined
            }
          />
        </div>
      </div>

      {/* Performance KPIs */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Performance Metrics
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Approved Bookings"
            value={data.kpis.approvedBookings}
            icon={<CheckIcon />}
          />
          <KPICard
            label="Declined Requests"
            value={data.kpis.declinedRequests}
            icon={<XIcon />}
          />
          <KPICard
            label="No Shows"
            value={data.kpis.noShows}
            icon={<AlertIcon />}
          />
          <KPICard
            label="Avg Approval Time"
            value={formatApprovalTime(data.kpis.averageApprovalTimeMinutes)}
            icon={<ClockIcon />}
            target="<5m"
          />
        </div>
      </div>

      {/* Financial KPIs */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Revenue
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            label="Venue Revenue"
            value={formatCurrency(data.kpis.venueRevenue)}
            icon={<DollarIcon />}
          />
          <KPICard
            label="Missed Request Revenue"
            value={formatCurrency(data.kpis.missedRevenue)}
            icon={<AlertIcon />}
          />
          <KPICard
            label="Avg Booking Value"
            value={formatCurrency(data.kpis.averageBookingValue)}
            icon={<TrendingUpIcon />}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-[#6F716D]">Total Bookings</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {data.kpis.totalBookings}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6F716D]">Approval Rate</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {Math.round(data.kpis.approvalRate)}%
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BookingsChart data={data.bookingsChart} chartType="line" />
        <SpendChart data={data.spendChart} chartType="line" />
      </div>
    </div>
  )
}
