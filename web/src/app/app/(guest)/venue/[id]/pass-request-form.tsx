'use client'

import { useEffect, useMemo, useState } from 'react'

type PassRequestFormProps = {
  passId: string
  minDate: string
  maxDate: string
  defaultDate: string
  pausedDates: string[]
  arrivalStart: string
  arrivalEnd: string
}

function generateTimeOptions(start: string, end: string, intervalMinutes: number = 30) {
  const times: string[] = []
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)

  let currentMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  while (currentMinutes <= endMinutes) {
    const hours = Math.floor(currentMinutes / 60)
    const mins = currentMinutes % 60
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    times.push(timeStr)
    currentMinutes += intervalMinutes
  }

  return times
}

const MIN_PARTY_SIZE = 1
const MAX_PARTY_SIZE = 12
const ADULT_VALUE = '30'
const CHILD_VALUE = '10'

export default function PassRequestForm({ passId, minDate, maxDate, defaultDate, pausedDates, arrivalStart, arrivalEnd }: PassRequestFormProps) {
  const pausedSet = useMemo(() => new Set(pausedDates), [pausedDates])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [selectedTime, setSelectedTime] = useState(arrivalStart)
  const [partySize, setPartySize] = useState(2)
  const [guestAges, setGuestAges] = useState<string[]>(() => Array.from({ length: 2 }, () => ADULT_VALUE))
  const isPaused = pausedSet.has(selectedDate)

  const timeOptions = useMemo(() => generateTimeOptions(arrivalStart, arrivalEnd), [arrivalStart, arrivalEnd])
  const guestAgesValue = guestAges.join(',')
  const allGuestAgesEntered = guestAges.every((value) => value.trim() !== '')

  useEffect(() => {
    setGuestAges((prev) => {
      let next = prev
      if (partySize > prev.length) {
        next = [...prev, ...Array.from({ length: partySize - prev.length }, () => ADULT_VALUE)]
      } else if (partySize < prev.length) {
        next = prev.slice(0, partySize)
      } else {
        next = [...prev]
      }
      if (next[0] !== ADULT_VALUE) {
        next[0] = ADULT_VALUE
      }
      return next
    })
  }, [partySize])

  const handlePartySizeChange = (value: string) => {
    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
      setPartySize(MIN_PARTY_SIZE)
      return
    }
    const clamped = Math.max(MIN_PARTY_SIZE, Math.min(parsed, MAX_PARTY_SIZE))
    setPartySize(clamped)
  }

  const buttonStyles = isPaused
    ? 'border border-[#B7B6AE] bg-[#E6E4DA] text-[#7A7B74] cursor-not-allowed'
    : 'border border-[#02374D] bg-[#02374D] text-white hover:bg-[#02486A]'

  const buttonLabel = isPaused ? 'Sold out for this date' : 'Request this pass'

  return (
    <form action="/app/request" method="GET" className="space-y-6">
      <input type="hidden" name="passId" value={passId} />
      <input type="hidden" name="guestAges" value={guestAgesValue} />
      <section className="space-y-6 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Choose your date & time</p>
          <p className="mt-1 text-sm text-[#4F514D]">Pick the day and arrival time you plan to arrive. Requests go straight to the venue desk.</p>
        </div>
        <div className="space-y-4">
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6F716D]">
            Arrival date
            <input
              type="date"
              name="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              min={minDate}
              max={maxDate}
              className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)]"
            />
          </label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="block text-xs uppercase tracking-[0.15em] text-[#6F716D]">
              Arrival time
              <div className="relative mt-2 w-full sm:w-40">
                <select
                  name="arrivalTime"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-[#E8E4D7] bg-[#FFFCF5] px-4 py-3 pr-8 text-sm text-[#02374D] shadow-[0px_2px_8px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#02374D]/30"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6F716D]">
                  ▾
                </span>
              </div>
            </label>
            <label className="block text-xs uppercase tracking-[0.15em] text-[#6F716D]">
              Party size
              <input
                type="number"
                name="partySize"
                min={MIN_PARTY_SIZE}
                max={MAX_PARTY_SIZE}
                value={partySize}
                onChange={(event) => handlePartySizeChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#E8E4D7] bg-[#FFFCF5] px-4 py-3 text-sm text-[#02374D] shadow-[0px_2px_8px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-[#02374D]/30 sm:w-32"
              />
            </label>
          </div>
        </div>
        {partySize > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Who's coming?</p>
            <p className="text-sm text-[#4F514D]">We assume you’re an adult. Mark each additional guest so venues can prep properly.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {guestAges.map((age, index) => {
                if (index === 0) return null
                return (
                  <GuestAgeCard
                    key={`guest-${index}`}
                    guestNumber={index + 1}
                    value={age}
                    onChange={(next) => {
                      setGuestAges((prev) => {
                        const copy = [...prev]
                        copy[index] = next
                        return copy
                      })
                    }}
                  />
                )
              })}
            </div>
            {!allGuestAgesEntered && (
              <p className="text-sm text-[#B4231F]">Please categorize every guest to continue.</p>
            )}
          </div>
        )}
        {isPaused && (
          <p className="rounded-2xl bg-[#FCE1E1] px-4 py-3 text-sm text-[#B4231F]">
            This date is sold out. Please pick another day.
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={isPaused || !allGuestAgesEntered}
        className={`rounded-full px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${buttonStyles} ${!allGuestAgesEntered ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {allGuestAgesEntered ? buttonLabel : 'Select adult/child for everyone'}
      </button>
    </form>
  )
}

function GuestAgeCard({ guestNumber, value, onChange }: { guestNumber: number; value: string; onChange: (value: string) => void }) {
  const isChild = value === CHILD_VALUE
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Guest {guestNumber}</p>
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold uppercase tracking-[0.1em]">
        <button
          type="button"
          onClick={() => onChange(ADULT_VALUE)}
          className={`rounded-full border px-3 py-2 transition ${
            !isChild ? 'border-[#02374D] bg-[#02374D] text-white' : 'border-[#DBD8C9] bg-[#F7F4EA] text-[#02374D]'
          }`}
        >
          Adult
        </button>
        <button
          type="button"
          onClick={() => onChange(CHILD_VALUE)}
          className={`rounded-full border px-3 py-2 transition ${
            isChild ? 'border-[#02374D] bg-[#02374D] text-white' : 'border-[#DBD8C9] bg-[#F7F4EA] text-[#02374D]'
          }`}
        >
          Child
        </button>
      </div>
    </div>
  )
}
