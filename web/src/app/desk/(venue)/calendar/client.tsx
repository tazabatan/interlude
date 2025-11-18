'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import type { DeskBooking, PassInventory, DeskPass } from '@/lib/desk'
import { pauseDayAction, setDayCapacityAction } from '../actions'

type DayData = {
  date: string
  displayDay: number
  isCurrentMonth: boolean
  isToday: boolean
  capacitySet: boolean
  cap: number
  capacitySource: 'manual' | 'default' | null
  paused: boolean
  requested: number
  issued: number
  redeemed: number
  pendingVerification: number
  cancelled: number
  declined: number
  totalGuests: number
  passIds: string[]
}

function getDaysInMonth(year: number, month: number): DayData[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const today = new Date().toISOString().slice(0, 10)

  const days: DayData[] = []

  // Previous month's days
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const date = new Date(year, month - 1, day).toISOString().slice(0, 10)
    days.push({
      date,
      displayDay: day,
      isCurrentMonth: false,
      isToday: date === today,
      capacitySet: false,
      cap: 0,
      capacitySource: null,
      paused: false,
      requested: 0,
      issued: 0,
      redeemed: 0,
      pendingVerification: 0,
      cancelled: 0,
      declined: 0,
      totalGuests: 0,
      passIds: [],
    })
  }

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day).toISOString().slice(0, 10)
    days.push({
      date,
      displayDay: day,
      isCurrentMonth: true,
      isToday: date === today,
      capacitySet: false,
      cap: 0,
      capacitySource: null,
      paused: false,
      requested: 0,
      issued: 0,
      redeemed: 0,
      pendingVerification: 0,
      cancelled: 0,
      declined: 0,
      totalGuests: 0,
      passIds: [],
    })
  }

  // Next month's days to complete the grid
  const remainingCells = 42 - days.length // 6 rows × 7 days
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day).toISOString().slice(0, 10)
    days.push({
      date,
      displayDay: day,
      isCurrentMonth: false,
      isToday: date === today,
      capacitySet: false,
      cap: 0,
      capacitySource: null,
      paused: false,
      requested: 0,
      issued: 0,
      redeemed: 0,
      pendingVerification: 0,
      cancelled: 0,
      declined: 0,
      totalGuests: 0,
      passIds: [],
    })
  }

  return days
}

export function CalendarClient({
  bookings,
  inventory,
  passes,
  readOnly,
}: {
  bookings: DeskBooking[]
  inventory: PassInventory[]
  passes: DeskPass[]
  readOnly: boolean
}) {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [pausedDates, setPausedDates] = useState<Set<string>>(() => {
    // Initialize with dates that are already paused from inventory
    return new Set(inventory.filter((inv) => inv.paused).map((inv) => inv.date))
  })
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState({ requested: 0, issued: 0 })

  const daysWithData = useMemo(() => {
    const days = getDaysInMonth(currentYear, currentMonth)

    // Create lookup maps
    const inventoryMap = new Map<string, PassInventory[]>()
    inventory.forEach((inv) => {
      const existing = inventoryMap.get(inv.date) ?? []
      existing.push(inv)
      inventoryMap.set(inv.date, existing)
    })

    const bookingsByDate = new Map<string, DeskBooking[]>()
    bookings.forEach((booking) => {
      const existing = bookingsByDate.get(booking.date) ?? []
      existing.push(booking)
      bookingsByDate.set(booking.date, existing)
    })

    const passesMap = new Map<string, DeskPass>()
    passes.forEach((p) => {
      if (p.id) {
        passesMap.set(p.id, p)
      }
    })
    const fallbackPassIds = new Set<string>()
    passesMap.forEach((_, id) => fallbackPassIds.add(id))
    inventory.forEach((inv) => {
      if (inv.pass_id) fallbackPassIds.add(inv.pass_id)
    })
    bookings.forEach((booking) => {
      if (booking.pass_id) fallbackPassIds.add(booking.pass_id)
    })

    // Enrich days with data
    return days.map((day) => {
      const dayInventory = inventoryMap.get(day.date) ?? []
      const dayBookings = bookingsByDate.get(day.date) ?? []

      const dayPassIds = new Set<string>()
      dayInventory.forEach((inv) => {
        if (inv.pass_id) dayPassIds.add(inv.pass_id)
      })
      dayBookings.forEach((booking) => {
        if (booking.pass_id) dayPassIds.add(booking.pass_id)
      })
      const passIdsForDefaults = dayPassIds.size > 0 ? Array.from(dayPassIds) : Array.from(fallbackPassIds)

      let cap = 0
      let capacitySource: 'manual' | 'default' | null = null
      if (dayInventory.length > 0) {
        cap = dayInventory.reduce((sum, inv) => sum + inv.cap, 0)
        if (cap > 0) capacitySource = 'manual'
      } else {
        const defaultCap = passIdsForDefaults.reduce((sum, passId) => {
          const pass = passesMap.get(passId)
          return sum + (pass?.default_daily_cap ?? 0)
        }, 0)
        if (defaultCap > 0) {
          cap = defaultCap
          capacitySource = 'default'
        }
      }

      const capacitySet = cap > 0
      const paused = pausedDates.has(day.date)
      const requested = dayBookings.filter((b) => b.status === 'requested').length
      const issued = dayBookings.filter((b) => b.status === 'issued').length
      const redeemed = dayBookings.filter((b) => b.status === 'redeemed').length
      const pendingVerification = dayBookings.filter((b) => b.status === 'pending_verification').length
      const cancelled = dayBookings.filter((b) => b.status === 'cancelled').length
      const declined = dayBookings.filter((b) => b.status === 'declined').length

      const totalGuests = dayBookings
        .filter((b) => b.status === 'issued')
        .reduce((sum, b) => sum + b.party_size, 0)

      return {
        ...day,
        capacitySet,
        cap,
        capacitySource,
        paused,
        requested,
        issued,
        redeemed,
        pendingVerification,
        cancelled,
        declined,
        totalGuests,
        passIds: dayPassIds.size > 0 ? Array.from(dayPassIds) : Array.from(fallbackPassIds),
      }
    })
  }, [bookings, inventory, passes, currentYear, currentMonth, pausedDates])

  const monthName = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long' })

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const selectedDayData = selectedDate
    ? daysWithData.find((day) => day.date === selectedDate)
    : null

  const [isUpdatingPause, startPauseTransition] = useTransition()
  const [isUpdatingCapacity, startCapacityTransition] = useTransition()

  const handleTogglePause = (day: DayData) => {
    if (readOnly) return
    const isPaused = pausedDates.has(day.date)

    // If trying to pause (not unpause), check for active bookings
    if (!isPaused) {
      if (day.requested > 0 || day.issued > 0) {
        setWarningMessage({ requested: day.requested, issued: day.issued })
        setShowWarning(true)
        return
      }
    }

    const nextPaused = !isPaused

    setPausedDates((prev) => {
      const newSet = new Set(prev)
      if (nextPaused) {
        newSet.add(day.date)
      } else {
        newSet.delete(day.date)
      }
      return newSet
    })

    if (day.passIds.length === 0) {
      return
    }

    startPauseTransition(async () => {
      await pauseDayAction({
        date: day.date,
        paused: nextPaused,
        passIds: day.passIds,
      })
    })
  }

  const handleSetCapacity = (day: DayData, nextCapRaw: number) => {
    if (readOnly) return
    if (day.passIds.length === 0) return
    const safeValue = Math.max(0, Math.floor(Number.isFinite(nextCapRaw) ? nextCapRaw : 0))
    if (safeValue === (day.cap ?? 0)) return
    startCapacityTransition(async () => {
      // Only set capacity for the first pass to avoid multiplying
      await setDayCapacityAction({
        date: day.date,
        cap: safeValue,
        passIds: [day.passIds[0]], // Use only the first pass
      })
    })
  }

  return (
    <div className="flex min-h-screen flex-col gap-8 lg:flex-row">
      {/* Calendar Grid - Left Side */}
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="w-full rounded-full bg-[#DBD8C9] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#d0ccba] sm:w-auto"
          >
            ← Previous
          </button>
          <h2 className="text-center text-3xl font-medium uppercase tracking-[0.02em] text-black sm:text-left">
            {monthName} {currentYear}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            className="w-full rounded-full bg-[#DBD8C9] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#d0ccba] sm:w-auto"
          >
            Next →
          </button>
        </div>

        <div className="overflow-x-auto pb-4 sm:overflow-visible sm:pb-0">
          <div className="grid min-w-[640px] auto-rows-fr grid-cols-7 gap-3 sm:min-w-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-semibold uppercase tracking-[0.1em] text-[#6F716D]"
              >
                {day}
              </div>
            ))}

            {daysWithData.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                isSelected={selectedDate === day.date}
                onClick={() => setSelectedDate(day.date)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Summary Panel - Right Side (Fixed) */}
      <div className="w-full lg:w-[420px] lg:flex-shrink-0">
        <div className="lg:sticky lg:top-8">
          {selectedDayData ? (
            <DateDetailPanel
              key={`${selectedDayData.date}-${selectedDayData.cap ?? 0}`}
              day={selectedDayData}
              onTogglePause={handleTogglePause}
              isUpdatingPause={isUpdatingPause}
              onSetCapacity={handleSetCapacity}
              isUpdatingCapacity={isUpdatingCapacity}
              readOnly={readOnly}
            />
          ) : (
            <div className="rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-8 text-center shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
              <p className="text-sm text-[#6F716D]">
                Select a date to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <PauseWarningModal
          requested={warningMessage.requested}
          issued={warningMessage.issued}
          onClose={() => setShowWarning(false)}
        />
      )}
    </div>
  )
}

function PauseWarningModal({
  requested,
  issued,
  onClose,
}: {
  requested: number
  issued: number
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-8 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-semibold uppercase tracking-[0.08em] text-[#02374D]">
            Active Bookings Present
          </h3>
        </div>

        <div className="mb-6 space-y-4 text-center">
          <p className="text-sm leading-relaxed text-[#4F514D]">
            This date currently has{' '}
            {requested > 0 && (
              <span className="font-semibold text-[#856404]">
                {requested} pending {requested === 1 ? 'request' : 'requests'}
              </span>
            )}
            {requested > 0 && issued > 0 && ' and '}
            {issued > 0 && (
              <span className="font-semibold text-[#02374D]">
                {issued} confirmed {issued === 1 ? 'booking' : 'bookings'}
              </span>
            )}
            .
          </p>
          <p className="text-sm leading-relaxed text-[#4F514D]">
            We recommend reviewing and addressing all requests before pausing. Your guests are
            looking forward to their experience with you.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#02374D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#02486A]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

function DayCell({
  day,
  isSelected,
  onClick,
}: {
  day: DayData
  isSelected: boolean
  onClick: () => void
}) {
  const hasActivity = day.requested + day.issued + day.redeemed + day.pendingVerification > 0
  const isAtCapacity = day.capacitySet && day.issued >= day.cap
  const hasRequests = day.requested > 0
  const hasBookings = day.issued + day.redeemed + day.pendingVerification > 0

  let priorityState: 'request' | 'booking' | 'pause' | null = null
  if (hasRequests) priorityState = 'request'
  else if (hasBookings) priorityState = 'booking'
  else if (day.paused) priorityState = 'pause'

  const colorClasses = (() => {
    if (isSelected) {
      return 'border-2 border-[#0F766E] bg-[#BAE6E3] ring-2 ring-[#0F766E]'
    }
    if (priorityState === 'request') {
      return 'border border-transparent bg-[#FEF3C7] hover:border-transparent hover:bg-[#FDE68A]'
    }
    if (priorityState === 'booking') {
      return 'border border-transparent bg-[#BAE6E3] hover:border-transparent hover:bg-[#A4DCD5]'
    }
    if (priorityState === 'pause') {
      return 'border border-[#F5B8B8] bg-[#FCE1E1] hover:border-[#F29C9C] hover:bg-[#FCD4D4]'
    }
    if (day.isToday) {
      return 'border border-[#02374D] bg-white hover:bg-[#F4F1E7]'
    }
    return 'border border-[#E8E4D7] bg-[#F9F6ED] hover:border-[#DBD8C9] hover:bg-white'
  })()

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full rounded-[24px] border p-3 text-left transition shadow-none sm:shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2
        ${colorClasses}
        ${!day.isCurrentMonth && 'opacity-30'}
      `}
      style={{ aspectRatio: '1' }}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span
            className={`text-lg font-semibold ${
              day.isToday ? 'text-[#02374D]' : 'text-[#31332f]'
            }`}
          >
            {day.displayDay}
          </span>
        </div>

        {day.isCurrentMonth && hasActivity && (
          <div className="space-y-1">
            {day.capacitySet && day.cap > 0 && (
              <div
                className={`text-[0.7rem] font-bold ${isAtCapacity ? 'text-[#B4231F]' : 'text-[#02374D]'}`}
              >
                {day.issued}/{day.cap}
                {day.capacitySource === 'default' && (
                  <span className="ml-1 text-[0.55rem] font-semibold uppercase text-[#6F716D]">default</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-0.5">
              {day.pendingVerification > 0 && (
                <div className="h-1.5 w-1.5 rounded-full bg-[#FFC107]"></div>
              )}
              {day.issued > 0 && (
                <div className="h-1.5 w-1.5 rounded-full bg-[#0D9488]"></div>
              )}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

function DateDetailPanel({
  day,
  onTogglePause,
  isUpdatingPause,
  onSetCapacity,
  isUpdatingCapacity,
  readOnly,
}: {
  day: DayData
  onTogglePause: (day: DayData) => void
  isUpdatingPause: boolean
  onSetCapacity: (day: DayData, cap: number) => void
  isUpdatingCapacity: boolean
  readOnly: boolean
}) {
  const [localCapacity, setLocalCapacity] = useState(() => day.cap ?? 0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    },
    []
  )

  const dateLabel = new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const isPaused = day.paused
  const pauseDisabled = readOnly || isUpdatingPause || day.passIds.length === 0
  const capacityDisabled = readOnly || isUpdatingCapacity || day.passIds.length === 0 || isPaused
  const displayCapacity = isPaused ? 0 : localCapacity
  const hasCap = !isPaused && displayCapacity > 0
  const usingDefault = day.capacitySource === 'default' && !isPaused
  const effectiveCap = hasCap ? displayCapacity : 0
  const remaining = hasCap ? Math.max(0, effectiveCap - day.issued) : 0
  const panelTone = readOnly
    ? 'border-[#D5D0C0] border-dashed bg-[#EEEADF]'
    : 'border-[#E8E4D7] bg-[#F9F6ED]'
  const toggleColor = readOnly
    ? isPaused
      ? 'bg-[#D9C8C5]'
      : 'bg-[#D5D2C4]'
    : isPaused
      ? 'bg-[#B4231F]'
      : 'bg-[#DBD8C9]'
  const capacityInputTone = readOnly
    ? 'border-[#D3D0C3] bg-[#EFECE2] text-[#6F716D]'
    : isPaused
      ? 'border-[#B4231F] bg-[#FCE1E1] text-[#B4231F]'
      : 'border-[#DBD8C9] bg-white text-[#02374D]'
  const summaryCardTone = readOnly ? 'bg-[#F1EEE2]' : 'bg-white/70'

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (capacityDisabled) return
    const rawValue = e.target.value
    // Allow empty string for easier editing
    if (rawValue === '') {
      setLocalCapacity(0)
      return
    }
    const numValue = parseInt(rawValue, 10)
    if (!Number.isNaN(numValue) && numValue >= 0) {
      setLocalCapacity(numValue)
      // Debounce the API call
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (!capacityDisabled) {
          onSetCapacity(day, numValue)
        }
      }, 500)
    }
  }

  return (
    <div
      className={`rounded-[32px] border p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)] ${panelTone}`}
    >
      <div className="mb-6">
        <h3 className="text-xl font-semibold uppercase tracking-[0.08em] text-[#02374D]">
          {dateLabel}
        </h3>
        {readOnly && (
          <p className="mt-2 text-xs text-[#6F716D]">
            Desk staff can view day details. Ask a venue manager to update caps or pause inventory.
          </p>
        )}
      </div>

      {/* Pause Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-[#02374D]">Pause passes</span>
        <button
          type="button"
          onClick={() => onTogglePause(day)}
          disabled={pauseDisabled}
          className={`relative h-7 w-12 rounded-full transition-colors ${toggleColor} ${
            pauseDisabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full ${
              readOnly ? 'bg-[#FDFBF3]' : 'bg-white'
            } shadow-md transition-transform ${
              day.paused ? 'left-[22px]' : 'left-0.5'
            }`}
          ></span>
        </button>
      </div>

      {/* Capacity Editor */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-[#02374D]">Set capacity</span>
        <input
          type="number"
          min="0"
          value={displayCapacity}
          onChange={handleCapacityChange}
          disabled={capacityDisabled}
          className={`w-20 rounded-full px-4 py-1.5 text-center text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#02374D] ${capacityInputTone} ${
            capacityDisabled ? 'cursor-not-allowed opacity-60' : ''
          }`}
        />
      </div>

      <div className="space-y-6">
        {/* Capacity Snapshot */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6F716D]">
            Capacity Snapshot
          </h4>
          <div className={`rounded-2xl p-4 ${summaryCardTone}`}>
            {hasCap ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#02374D]">{day.issued}</span>
                  <span className="text-xl text-[#6F716D]">/ {effectiveCap}</span>
                </div>
                <div className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                  {usingDefault ? 'Default cap' : 'Manual cap'}
                </div>
                {remaining > 0 && (
                  <div className="text-sm text-[#4F514D]">
                    {remaining} {remaining === 1 ? 'spot' : 'spots'} remaining
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-[#6F716D]">No cap set</div>
            )}
          </div>
        </section>

        {/* Demand & Status Mix */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6F716D]">
            Demand & Status
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <StatusChip label="Requested" count={day.requested} color="requested" />
            <StatusChip label="Issued" count={day.issued} color="issued" />
            <StatusChip label="Redeemed" count={day.redeemed} color="redeemed" />
            <StatusChip label="Pending" count={day.pendingVerification} color="pending" />
            <StatusChip label="Cancelled" count={day.cancelled} color="cancelled" />
            <StatusChip label="Declined" count={day.declined} color="declined" />
          </div>
        </section>

        {/* Party Size Totals */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6F716D]">
            Guest Count
          </h4>
          <div className={`rounded-2xl p-4 ${summaryCardTone}`}>
            <div className="text-xl font-semibold uppercase tracking-[0.08em] text-[#02374D]">
              {day.totalGuests} {day.totalGuests === 1 ? 'guest' : 'guests'} expected
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pt-2">
          <Link
            href={`/desk/calendar/${day.date}`}
            className="block w-full rounded-full bg-[#02374D] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#02486A]"
          >
            Open day
          </Link>
        </section>
      </div>
    </div>
  )
}

function StatusChip({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: 'requested' | 'issued' | 'redeemed' | 'pending' | 'cancelled' | 'declined'
}) {
  const colorClasses = {
    requested: 'bg-[#FEF3C7] text-[#92400E]',
    issued: 'bg-[#D0F3EA] text-[#0A5847]',
    redeemed: 'bg-[#DCFCE7] text-[#166534]',
    pending: 'bg-[#EDE9FE] text-[#5B21B6]',
    cancelled: 'bg-[#DBD8C9] text-[#4A4C48]',
    declined: 'bg-[#FCE1E1] text-[#B4231F]',
  }

  return (
    <div className={`rounded-xl ${colorClasses[color]} px-3 py-2 text-center`}>
      <div className="text-lg font-bold">{count}</div>
      <div className="text-[0.65rem] font-medium uppercase tracking-[0.05em]">{label}</div>
    </div>
  )
}
