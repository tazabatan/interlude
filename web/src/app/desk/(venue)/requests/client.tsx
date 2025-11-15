'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { approveDefaultAction, declineAction } from '../actions'

export type PassCategory = 'all' | 'beach' | 'pool' | 'spa' | 'gym'

export type RequestCardPayload = {
  id: string
  status: string
  statusLabel: string
  dateLabel: string
  partySize: number
  partySummary: string
  arrivalWindow: string
  passLabel: string
  priceLabel: string
  category: PassCategory
  guestLabel: string
  imageSrc: string
  imageUnoptimized: boolean
}

const FILTER_OPTIONS: { value: PassCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'beach', label: 'Beach' },
  { value: 'pool', label: 'Pool' },
  { value: 'spa', label: 'Spa' },
  { value: 'gym', label: 'Gym' },
]

export function RequestsClient({ bookings, heading }: { bookings: RequestCardPayload[]; heading: string }) {
  const [filter, setFilter] = useState<PassCategory>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings
    return bookings.filter((booking) => booking.category === filter)
  }, [bookings, filter])

  const currentLabel = FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? 'All'
  const currentHeading =
    filter === 'all'
      ? heading
      : `YOU HAVE ${filtered.length} ${currentLabel.toUpperCase()} REQUEST${filtered.length === 1 ? '' : 'S'} TO REVIEW`

  return (
    <div className="space-y-12">
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

      <header className="pb-4 text-center">
        <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">{currentHeading}</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((booking) => (
          <RequestCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  )
}

function RequestCard({ booking }: { booking: RequestCardPayload }) {
  const detailHref = `/desk/requests/${booking.id}`

  return (
    <div className="flex min-h-[24rem] flex-col gap-6 rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] px-7 py-8 text-center shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
      <Link
        href={detailHref}
        className="flex flex-col gap-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1E7]"
      >
        <div className="space-y-1 uppercase tracking-[0.2em]">
          <div className="text-xs font-semibold text-black">{booking.dateLabel}</div>
          <div className="text-[0.65rem] text-[#6F716D]">{booking.arrivalWindow}</div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-[#DBD8C9] bg-white shadow-[0px_10px_22px_rgba(0,0,0,0.12)]">
            <Image
              src={booking.imageSrc}
              alt={booking.guestLabel}
              width={200}
              height={200}
              unoptimized={booking.imageUnoptimized}
              className="h-full w-full -translate-y-1 scale-110 object-cover object-top"
            />
          </div>

          <div className="space-y-1">
            <div className="text-lg font-semibold uppercase tracking-[0.08em] text-black">
              {booking.guestLabel}
            </div>
            <div className="text-sm text-[#31332f]">
              {booking.passLabel} · {booking.priceLabel}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">{booking.partySummary}</div>
          </div>
        </div>
      </Link>

      <div className="flex gap-3 pt-2">
        <form action={approveDefaultAction} className="flex flex-1 justify-center">
          <input type="hidden" name="bookingId" value={booking.id} />
          <button className="w-full max-w-[12rem] rounded-full bg-[#7fcfc2] px-3 py-2 text-sm font-semibold text-white shadow-[0px_4px_18px_rgba(0,0,0,0.12)] transition hover:bg-[#6ac4b6]">
            Approve
          </button>
        </form>
        <form action={declineAction} className="flex flex-1 justify-center">
          <input type="hidden" name="bookingId" value={booking.id} />
          <button className="w-full max-w-[12rem] rounded-full border border-[#B4231F] px-3 py-2 text-sm font-semibold text-[#B4231F] transition hover:border-[#F5B8B8] hover:bg-[#F5B8B8]/20">
            Decline
          </button>
        </form>
      </div>
    </div>
  )
}
