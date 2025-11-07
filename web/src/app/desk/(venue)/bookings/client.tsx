'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { BookingCardPayload } from './page'

const FILTER_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

type Segment = (typeof FILTER_OPTIONS)[number]['value']

export function BookingsClient({ bookings }: { bookings: BookingCardPayload[] }) {
  const [filter, setFilter] = useState<Segment>('today')

  const filtered = useMemo(() => {
    return bookings.filter((booking) => booking.segment === filter)
  }, [bookings, filter])

  const heading = `YOU HAVE ${filtered.length} BOOKING${filtered.length === 1 ? '' : 'S'} ${FILTER_OPTIONS.find(
    (option) => option.value === filter
  )?.label?.toUpperCase()}`

  return (
    <div className="space-y-8">
      <div className="flex justify-center gap-2 pb-4">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              option.value === filter
                ? 'bg-[#02374D] text-white shadow-[0px_4px_20px_rgba(2,55,77,0.25)]'
                : 'bg-[#DBD8C9] text-black hover:bg-[#d0ccba]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <header className="pb-2 text-center">
        <h2 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">{heading}</h2>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#DBD8C9] bg-white/70 px-12 py-16 text-center text-sm text-[#4F514D]">
          No bookings in this segment yet.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking }: { booking: BookingCardPayload }) {
  const buttonClass = booking.isDeclined
    ? 'border border-[#B4231F] text-[#B4231F] hover:border-[#F5B8B8] hover:bg-[#F5B8B8]/20'
    : booking.isToday
      ? 'bg-[#02374D] text-white hover:bg-[#02486A]'
      : 'border border-[#02374D] text-[#02374D] hover:bg-[#02374D] hover:text-white'

  const statusClass = booking.isDeclined
    ? 'bg-[#FCE1E1] text-[#B4231F]'
    : booking.isToday
      ? 'bg-[#D0F3EA] text-[#0D6B56]'
      : 'bg-[#DBD8C9] text-[#5F6059]'

  return (
    <div className="flex min-h-[20rem] flex-col gap-6 rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] px-7 py-8 text-center shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
      <Link
        href={booking.detailHref}
        className="flex flex-col gap-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1E7]"
      >
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-black">{booking.dateLabel}</div>
          <div className="text-[0.65rem] uppercase tracking-[0.15em] text-[#6F716D]">{booking.arrivalWindow}</div>
          <span className={`self-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
            {booking.statusLabel}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#DBD8C9] bg-white shadow-[0px_10px_22px_rgba(0,0,0,0.12)]">
            <Image
              src={booking.imageSrc}
              alt={booking.guestLabel}
              width={180}
              height={180}
              className="h-full w-full -translate-y-1 scale-110 object-cover object-top"
            />
          </div>
          <div className="space-y-1">
            <div className="text-base font-semibold uppercase tracking-[0.08em] text-black">{booking.guestLabel}</div>
            <div className="text-sm text-[#31332f]">
              {booking.passLabel} · {booking.priceLabel}
            </div>
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-3 text-xs text-[#6F716D]">
        <div className="flex justify-center">
          <Link
            href={booking.detailHref}
            className={`w-full max-w-[12rem] rounded-full px-3 py-2 text-sm font-semibold transition ${buttonClass}`}
          >
            {booking.ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
