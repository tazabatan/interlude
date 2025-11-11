'use client'

import { useMemo, useState } from 'react'

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

export default function PassRequestForm({ passId, minDate, maxDate, defaultDate, pausedDates, arrivalStart, arrivalEnd }: PassRequestFormProps) {
  const pausedSet = useMemo(() => new Set(pausedDates), [pausedDates])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [selectedTime, setSelectedTime] = useState(arrivalStart)
  const isPaused = pausedSet.has(selectedDate)

  const timeOptions = useMemo(() => generateTimeOptions(arrivalStart, arrivalEnd), [arrivalStart, arrivalEnd])

  const buttonStyles = isPaused
    ? 'border border-[#B7B6AE] bg-[#E6E4DA] text-[#7A7B74] cursor-not-allowed'
    : 'border border-[#02374D] bg-[#02374D] text-white hover:bg-[#02486A]'

  const buttonLabel = isPaused ? 'Sold out for this date' : 'Request this pass'

  return (
    <form action="/app/request" method="GET" className="space-y-6">
      <input type="hidden" name="passId" value={passId} />
      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Choose your date & time</p>
          <p className="mt-1 text-sm text-[#4F514D]">Pick the day and arrival time you plan to arrive. Requests go straight to the venue desk.</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6F716D]">
            Arrival date
            <input
              type="date"
              name="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              min={minDate}
              max={maxDate}
              className="mt-2 w-full sm:w-[200px] rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)]"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.15em] text-[#6F716D]">
            Arrival time
            <select
              name="arrivalTime"
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
              className="mt-2 w-full sm:w-[160px] rounded border border-[#DBD8C9] bg-white px-4 py-3 text-sm text-black shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)]"
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isPaused && (
          <p className="rounded-2xl bg-[#FCE1E1] px-4 py-3 text-sm text-[#B4231F]">
            This date is sold out. Please pick another day.
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={isPaused}
        className={`rounded-full px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${buttonStyles}`}
      >
        {buttonLabel}
      </button>
    </form>
  )
}
