'use client'

import clsx from 'clsx'
import type { DashboardFilters, TimePeriod, UserType, Venue } from './types'

type FiltersProps = {
  filters: DashboardFilters
  venues: Venue[]
  onChange: (filters: DashboardFilters) => void
}

export function Filters({ filters, venues, onChange }: FiltersProps) {
  const handleTimePeriodChange = (timePeriod: TimePeriod | 'custom') => {
    if (timePeriod === 'custom') {
      // When switching to custom, keep existing dates or set defaults
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      onChange({
        ...filters,
        timePeriod: 'custom',
        startDate: filters.startDate || weekAgo.toISOString().split('T')[0],
        endDate: filters.endDate || today
      })
    } else {
      onChange({ ...filters, timePeriod, startDate: undefined, endDate: undefined })
    }
  }

  const handleDateChange = (startDate: string, endDate: string) => {
    onChange({ ...filters, startDate, endDate })
  }

  const handleVenueChange = (venueId: string) => {
    onChange({ ...filters, venueId: venueId === 'all' ? null : venueId })
  }

  const handlePassTypeChange = (passType: string) => {
    onChange({ ...filters, passType: passType === 'all' ? null : passType })
  }

  const handleUserTypeChange = (userType: UserType) => {
    onChange({ ...filters, userType })
  }

  return (
    <div className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-4 shadow-[0px_4px_18px_rgba(0,0,0,0.08)] sm:p-6">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D] sm:mb-6">
        Filters
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {/* Time Period */}
        <div className="lg:col-span-2">
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[#4F514D]">
            Time Period
          </label>
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'custom'] as (TimePeriod | 'custom')[]).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => handleTimePeriodChange(period)}
                className={clsx(
                  'flex-1 rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.15em] transition min-w-[48%] sm:min-w-0',
                  filters.timePeriod === period
                    ? 'bg-[#02374D] text-white'
                    : 'bg-[#F4F1E7] text-[#777] hover:bg-[#E8E4D7]'
                )}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {filters.timePeriod === 'custom' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col">
                <label
                  htmlFor="start-date"
                  className="mb-1 block text-xs text-[#6F716D]"
                >
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleDateChange(e.target.value, filters.endDate || '')}
                  className="w-full rounded-full border border-[#E8E4D7] bg-white px-3 py-1.5 text-sm text-black transition hover:border-[#777] focus:border-[#02374D] focus:outline-none focus:ring-2 focus:ring-[#02374D] focus:ring-opacity-20"
                />
              </div>
              <div>
                <label
                  htmlFor="end-date"
                  className="mb-1 block text-xs text-[#6F716D]"
                >
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleDateChange(filters.startDate || '', e.target.value)}
                  className="w-full rounded-full border border-[#E8E4D7] bg-white px-3 py-1.5 text-sm text-black transition hover:border-[#777] focus:border-[#02374D] focus:outline-none focus:ring-2 focus:ring-[#02374D] focus:ring-opacity-20"
                />
              </div>
            </div>
          )}
        </div>

        {/* Venue */}
        <div>
          <label
            htmlFor="venue-select"
            className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[#4F514D]"
          >
            Venue
          </label>
          <select
            id="venue-select"
            value={filters.venueId || 'all'}
            onChange={(e) => handleVenueChange(e.target.value)}
            className="w-full rounded-full border border-[#E8E4D7] bg-white px-4 py-2 text-sm text-black transition hover:border-[#777] focus:border-[#02374D] focus:outline-none focus:ring-2 focus:ring-[#02374D] focus:ring-opacity-20"
          >
            <option value="all">All Venues</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>

        {/* Pass Type */}
        <div>
          <label
            htmlFor="pass-type-select"
            className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[#4F514D]"
          >
            Pass Type
          </label>
          <select
            id="pass-type-select"
            value={filters.passType || 'all'}
            onChange={(e) => handlePassTypeChange(e.target.value)}
            className="w-full rounded-full border border-[#E8E4D7] bg-white px-4 py-2 text-sm text-black transition hover:border-[#777] focus:border-[#02374D] focus:outline-none focus:ring-2 focus:ring-[#02374D] focus:ring-opacity-20"
          >
            <option value="all">All Pass Types</option>
            <option value="BEACH_PASS">Beach Club Pass</option>
            <option value="GYM_PASS">Gym Pass</option>
            <option value="SPA_PASS">Spa Pass</option>
            <option value="POOL_PASS">Pool Pass</option>
            <option value="MIN_SPEND">Min Spend</option>
          </select>
        </div>

        {/* User Type */}
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-[#4F514D]">
            User Type
          </label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'member', 'guest'] as UserType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleUserTypeChange(type)}
                className={clsx(
                  'flex-1 rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.15em] transition min-w-[48%] sm:min-w-0',
                  filters.userType === type
                    ? 'bg-[#02374D] text-white'
                    : 'bg-[#F4F1E7] text-[#777] hover:bg-[#E8E4D7]'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
