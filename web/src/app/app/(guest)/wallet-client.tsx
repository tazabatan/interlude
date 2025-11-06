'use client'

import { useMemo, useState } from 'react'
import type { GuestBookingView } from '@/lib/bookings/view-model'

type Segment = 'today' | 'upcoming' | 'past'

const segmentLabels: Record<Segment, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  past: 'Past',
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  issued: 'Approved',
  pending_verification: 'Pending',
  declined: 'Declined',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  redeemed: 'Redeemed',
  redeemed_late: 'Redeemed late',
}

const STATUS_VARIANTS: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  issued: 'bg-emerald-100 text-emerald-700',
  pending_verification: 'bg-blue-100 text-blue-700',
  declined: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-gray-200 text-gray-700',
  no_show: 'bg-gray-300 text-gray-700',
  redeemed: 'bg-emerald-100 text-emerald-700',
  redeemed_late: 'bg-emerald-200 text-emerald-800',
}

function parse(dateIso: string | null) {
  if (!dateIso) return null
  const parsed = new Date(dateIso)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDisplayDate(dateIso: string | null) {
  if (!dateIso) return 'Date TBC'
  const parsed = parse(dateIso)
  if (!parsed) return 'Date TBC'
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed)
}

function isSameDay(date: Date, other: Date) {
  return (
    date.getFullYear() === other.getFullYear() &&
    date.getMonth() === other.getMonth() &&
    date.getDate() === other.getDate()
  )
}

function computeSegment(booking: GuestBookingView): Segment {
  const start = parse(booking.arrival_window_start)
  const now = new Date()
  if (start && isSameDay(start, now)) return 'today'
  if (booking.is_past) return 'past'
  return 'upcoming'
}

type Props = {
  bookings: GuestBookingView[]
}

function BookingCard({ booking }: { booking: GuestBookingView }) {
  const segment = computeSegment(booking)
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status
  const badgeStyle = STATUS_VARIANTS[booking.status] ?? 'bg-gray-200 text-gray-700'
  const dateToShow =
    segment === 'today' && booking.arrival_window_start ? 'Today' : formatDisplayDate(booking.date)

  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
        <span>{dateToShow}</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}>{statusLabel}</span>
      </div>
      <div className="mb-4">
        <div className="text-lg font-semibold uppercase tracking-wide">
          {booking.venue_name ?? 'Venue TBD'}
        </div>
        <div className="text-sm text-gray-600">Party {booking.party_size}</div>
        {booking.hold_banner && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{booking.hold_banner}</div>
        )}
      </div>
      <div className="mt-auto flex flex-wrap gap-3 text-sm">
        {booking.qr_jti && (
          <button className="rounded-full bg-black px-4 py-2 font-medium text-white hover:bg-black/80">
            View QR
          </button>
        )}
        {booking.can_cancel && (
          <button className="rounded-full border border-red-200 px-4 py-2 font-medium text-red-600 hover:border-red-300">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

export default function WalletClient({ bookings }: Props) {
  const [segment, setSegment] = useState<Segment>('upcoming')

  const grouped = useMemo(() => {
    return bookings.reduce(
      (acc, booking) => {
        const key = computeSegment(booking)
        acc[key].push(booking)
        return acc
      },
      {
        today: [] as GuestBookingView[],
        upcoming: [] as GuestBookingView[],
        past: [] as GuestBookingView[],
      }
    )
  }, [bookings])

  const upcomingCount = grouped.today.length + grouped.upcoming.length
  const activeList =
    segment === 'today'
      ? grouped.today
      : segment === 'upcoming'
        ? [...grouped.today, ...grouped.upcoming]
        : grouped.past

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Wallet</p>
        <h1 className="text-3xl font-semibold">You have {upcomingCount} upcoming reservations</h1>
      </header>

      <div className="flex gap-2">
        {(Object.keys(segmentLabels) as Segment[]).map((key) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              key === segment ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {segmentLabels[key]}
          </button>
        ))}
      </div>

      {activeList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          {segment === 'past'
            ? 'No past reservations yet.'
            : 'No reservations yet. Request a pass to get started.'}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeList.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}
