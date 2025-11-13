'use client'

import { useState, useEffect, useTransition } from 'react'
import { KPICard, PendingIcon, CheckIcon, XIcon, AlertIcon, DollarIcon, TrendingUpIcon } from './kpi-card'
import { Filters } from './filters'
import { BookingsChart } from './bookings-chart'
import { SpendChart } from './spend-chart'
import { fetchDashboardData } from './actions'
import type { DashboardData, DashboardFilters, Venue } from './types'

type DashboardClientProps = {
  initialData: DashboardData
  venues: Venue[]
}

export function DashboardClient({ initialData, venues }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [filters, setFilters] = useState<DashboardFilters>({
    timePeriod: 'month',
    venueId: null,
    passType: null,
    userType: 'all',
  })
  const [isPending, startTransition] = useTransition()

  // Fetch data when filters change
  useEffect(() => {
    startTransition(async () => {
      const newData = await fetchDashboardData(filters)
      setData(newData)
    })
  }, [filters])

  const handleFiltersChange = (newFilters: DashboardFilters) => {
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

  return (
    <div className="space-y-8">
      {/* Loading indicator */}
      {isPending && (
        <div className="fixed right-8 top-24 z-50 rounded-full bg-[#02374D] px-4 py-2 text-sm font-medium text-white shadow-lg">
          Loading...
        </div>
      )}

      {/* Filters */}
      <Filters filters={filters} venues={venues} onChange={handleFiltersChange} />

      {/* KPIs Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          label="Pending Approvals"
          value={data.kpis.pendingApprovals}
          icon={<PendingIcon />}
        />
        <KPICard
          label="Approved Bookings"
          value={data.kpis.approvedBookings}
          icon={<CheckIcon />}
        />
        <KPICard
          label="Declines / Timeouts"
          value={data.kpis.declinesTimeouts}
          icon={<XIcon />}
        />
        <KPICard
          label="No Shows"
          value={data.kpis.noShows}
          icon={<AlertIcon />}
        />
        <KPICard
          label="Total Spend"
          value={formatCurrency(data.kpis.totalSpend)}
          icon={<DollarIcon />}
        />
        <KPICard
          label="Platform Commission"
          value={formatCurrency(data.kpis.platformCommission)}
          icon={<TrendingUpIcon />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BookingsChart data={data.bookingsChart} chartType="line" />
        <SpendChart data={data.spendChart} chartType="line" />
      </div>

      {/* Summary Stats */}
      <div className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-[#6F716D]">Total Bookings</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {data.kpis.pendingApprovals +
                data.kpis.approvedBookings +
                data.kpis.declinesTimeouts +
                data.kpis.noShows}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6F716D]">Approval Rate</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {(() => {
                const total =
                  data.kpis.approvedBookings +
                  data.kpis.declinesTimeouts +
                  data.kpis.noShows
                return total > 0
                  ? `${Math.round((data.kpis.approvedBookings / total) * 100)}%`
                  : '0%'
              })()}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6F716D]">Avg Approval Time</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {(() => {
                const mins = data.kpis.averageApprovalTimeMinutes
                if (mins === 0) return 'N/A'
                if (mins < 60) return `${Math.round(mins)}m`
                const hours = Math.floor(mins / 60)
                const remainingMins = Math.round(mins % 60)
                return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
              })()}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6F716D]">No-Show Rate</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {(() => {
                const total =
                  data.kpis.approvedBookings +
                  data.kpis.noShows
                return total > 0
                  ? `${Math.round((data.kpis.noShows / total) * 100)}%`
                  : '0%'
              })()}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6F716D]">Avg Booking Value</p>
            <p className="mt-1 text-2xl font-semibold text-[#02374D]">
              {(() => {
                const total =
                  data.kpis.approvedBookings +
                  data.kpis.noShows
                return total > 0
                  ? formatCurrency(data.kpis.totalSpend / total)
                  : formatCurrency(0)
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
