'use client'

import { useMemo, useState } from 'react'

type PassRequestFormProps = {
  passId: string
  minDate: string
  maxDate: string
  defaultDate: string
  pausedDates: string[]
}

export default function PassRequestForm({ passId, minDate, maxDate, defaultDate, pausedDates }: PassRequestFormProps) {
  const pausedSet = useMemo(() => new Set(pausedDates), [pausedDates])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const isPaused = pausedSet.has(selectedDate)

  const buttonStyles = isPaused
    ? 'border border-[#B7B6AE] bg-[#E6E4DA] text-[#7A7B74] cursor-not-allowed'
    : 'border border-[#02374D] bg-[#02374D] text-white hover:bg-[#02486A]'

  const buttonLabel = isPaused ? 'Sold out for this date' : 'Request this pass'

  return (
    <form action="/app/request" method="GET" className="space-y-6">
      <input type="hidden" name="passId" value={passId} />
      <section className="space-y-3 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Choose your date</p>
            <p className="text-sm text-[#4F514D]">Pick the day you plan to arrive. Requests go straight to the venue desk.</p>
          </div>
        </div>
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
        {isPaused && (
          <p className="rounded-2xl bg-[#FCE1E1] px-4 py-3 text-sm text-[#B4231F]">
            This date is sold out. Please pick another day.
          </p>
        )}
      </section>

      <button
        type="submit"
        disabled={isPaused}
        className={`w-full rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition ${buttonStyles}`}
      >
        {buttonLabel}
      </button>
    </form>
  )
}
