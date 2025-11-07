'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { DeskBooking, PassInventory } from '@/lib/desk'

type DayData = {
  date: string
  displayDay: number
  isCurrentMonth: boolean
  isToday: boolean
  capacitySet: boolean
  cap: number
  paused: boolean
  requested: number
  issued: number
  redeemed: number
  pendingVerification: number
  cancelled: number
  declined: number
  totalGuests: number
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
      paused: false,
      requested: 0,
      issued: 0,
      redeemed: 0,
      pendingVerification: 0,
      cancelled: 0,
      declined: 0,
      totalGuests: 0,
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
      paused: false,
      requested: 0,
      issued: 0,
      redeemed: 0,
      pendingVerification: 0,
      cancelled: 0,
      declined: 0,
      totalGuests: 0,
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
      paused: false,
      requested: 0,
      issued: 0,
      redeemed: 0,
      pendingVerification: 0,
      cancelled: 0,
      declined: 0,
      totalGuests: 0,
    })
  }

  return days
}

export function CalendarClient({
  bookings,
  inventory,
}: {
  bookings: DeskBooking[]
  inventory: PassInventory[]
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

    // Enrich days with data
    return days.map((day) => {
      const dayInventory = inventoryMap.get(day.date) ?? []
      const dayBookings = bookingsByDate.get(day.date) ?? []

      const capacitySet = dayInventory.length > 0
      const cap = dayInventory.reduce((sum, inv) => sum + inv.cap, 0)
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
        paused,
        requested,
        issued,
        redeemed,
        pendingVerification,
        cancelled,
        declined,
        totalGuests,
      }
    })
  }, [bookings, inventory, currentYear, currentMonth, pausedDates])

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

  const handleTogglePause = (date: string) => {
    const isPaused = pausedDates.has(date)

    // If trying to pause (not unpause), check for active bookings
    if (!isPaused) {
      const dayData = daysWithData.find((day) => day.date === date)
      if (dayData && (dayData.requested > 0 || dayData.issued > 0)) {
        setWarningMessage({ requested: dayData.requested, issued: dayData.issued })
        setShowWarning(true)
        return
      }
    }

    setPausedDates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(date)) {
        newSet.delete(date)
      } else {
        newSet.add(date)
      }
      return newSet
    })
    // TODO: Wire up API call to update pause status in database
    // await updatePassInventoryPause(date, !pausedDates.has(date))
  }

  return (
    <div className="flex min-h-screen gap-8">
      {/* Calendar Grid - Left Side */}
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-full bg-[#DBD8C9] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#d0ccba]"
          >
            ← Previous
          </button>
          <h2 className="text-2xl font-semibold uppercase tracking-[0.08em]">
            {monthName} {currentYear}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-full bg-[#DBD8C9] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#d0ccba]"
          >
            Next →
          </button>
        </div>

        <div className="grid auto-rows-fr grid-cols-7 gap-3">
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

      {/* Summary Panel - Right Side (Fixed) */}
      <div className="w-[420px] flex-shrink-0">
        <div className="sticky top-8">
          {selectedDayData ? (
            <DateDetailPanel day={selectedDayData} onTogglePause={handleTogglePause} />
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full rounded-[24px] border p-3 text-left transition shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2
        ${
          isSelected
            ? 'border-[#02374D] bg-[#D0F3EA] ring-2 ring-[#02374D]'
            : day.isToday
              ? 'border-[#02374D] border-2 bg-white hover:bg-[#F4F1E7]'
              : 'border-[#E8E4D7] bg-[#F9F6ED] hover:border-[#DBD8C9] hover:bg-white'
        }
        ${!day.isCurrentMonth && 'opacity-30'}
        ${day.paused && !isSelected && 'bg-[#FCE1E1] border-[#F5B8B8]'}
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

function DateDetailPanel({ day, onTogglePause }: { day: DayData; onTogglePause: (date: string) => void }) {
  const dateLabel = new Date(day.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const remaining = day.capacitySet ? Math.max(0, day.cap - day.issued) : 0

  return (
    <div className="rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
      <div className="mb-6">
        <h3 className="text-xl font-semibold uppercase tracking-[0.08em] text-[#02374D]">
          {dateLabel}
        </h3>
      </div>

      {/* Pause Toggle */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-medium text-[#02374D]">Pause passes</span>
        <button
          type="button"
          onClick={() => onTogglePause(day.date)}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            day.paused ? 'bg-[#B4231F]' : 'bg-[#DBD8C9]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
              day.paused ? 'left-[22px]' : 'left-0.5'
            }`}
          ></span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Capacity Snapshot */}
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6F716D]">
            Capacity Snapshot
          </h4>
          <div className="rounded-2xl bg-white/70 p-4">
            {day.capacitySet && day.cap > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#02374D]">{day.issued}</span>
                  <span className="text-xl text-[#6F716D]">/ {day.cap}</span>
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
          <div className="rounded-2xl bg-white/70 p-4">
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
