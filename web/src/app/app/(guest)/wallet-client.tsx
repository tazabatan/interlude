'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { GuestBookingView } from '@/lib/bookings/view-model'
import { formatArrivalValue } from '@/lib/arrival'
import { formatPassLabel, pickPassImage } from '@/lib/passes/helpers'

type Segment = 'today' | 'upcoming' | 'past' | 'cancelled'

const segmentLabels: Record<Segment, string> = {
  today: 'Today',
  upcoming: 'Upcoming',
  past: 'Past',
  cancelled: 'Cancelled',
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
  requested: 'bg-[#FFF3C2] text-[#8C6B00]',
  approved: 'bg-[#D0F3EA] text-[#0D6B56]',
  issued: 'bg-[#D0F3EA] text-[#0D6B56]',
  pending_verification: 'bg-[#D8E8FF] text-[#1D4ED8]',
  declined: 'bg-[#FCE1E1] text-[#B4231F]',
  cancelled: 'bg-[#DBD8C9] text-[#5F6059]',
  no_show: 'bg-[#E2E0D7] text-[#5F6059]',
  redeemed: 'bg-[#D0F3EA] text-[#0D6B56]',
  redeemed_late: 'bg-[#BDEBD9] text-[#0B5B48]',
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
  if (booking.status === 'cancelled' || booking.status === 'declined') {
    return 'cancelled'
  }

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
  const router = useRouter()
  const isCancelled = booking.status === 'cancelled'

  const handleCardClick = () => {
    router.push(`/app/booking/${booking.id}`)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCardClick()
    }
  }

  const segment = computeSegment(booking)
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status
  const badgeStyle = STATUS_VARIANTS[booking.status] ?? 'bg-gray-200 text-gray-700'
  const arrivalSummary = formatArrivalValue(
    booking.requested_arrival_time ?? null,
    booking.arrival_window_start,
    booking.arrival_window_end
  )
  const dateSuffix =
    segment === 'today' && booking.arrival_window_start ? 'Today' : formatDisplayDate(booking.date)
  const headingLine = `${arrivalSummary} · ${dateSuffix}`
  const fallbackSeed = booking.pass_id ?? booking.id
  const fallbackImage = pickPassImage(fallbackSeed)
  const imageSrc = booking.hero_image_url ?? fallbackImage
  const heroUrl = booking.hero_image_url
  const needsUnoptimized = Boolean(
    heroUrl &&
      (heroUrl.startsWith('data:') ||
        heroUrl.startsWith('blob:') ||
        heroUrl.startsWith('http://127.0.0.1') ||
        heroUrl.startsWith('http://localhost') ||
        heroUrl.startsWith('https://127.0.0.1') ||
        heroUrl.startsWith('https://localhost'))
  )

  const showPrimaryCta = booking.status === 'issued' || booking.status === 'approved'
  const primaryCta = booking.status === 'issued' ? 'Show pass' : 'View reservation'
  const showCancelLink = booking.can_cancel && booking.status !== 'cancelled' && booking.status !== 'requested'

  return (
    <div
      className="mx-auto w-full max-w-[24rem] cursor-pointer rounded-[32px] px-3 focus:outline-none focus:ring-2 focus:ring-[#02374D]/40 focus:ring-offset-2 focus:ring-offset-[#F4F1E7] sm:max-w-[25.5rem] lg:max-w-[26.5rem] xl:max-w-[27.5rem] sm:px-0"
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex min-h-[22rem] w-full flex-col items-center justify-center gap-4 rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] px-4 py-6 text-center shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)] sm:px-7 sm:py-7 lg:min-h-[24rem] xl:min-h-[26rem]">
        <div className="flex flex-col items-center text-[0.58rem] uppercase tracking-[0.22em] text-[#6F716D] sm:text-[0.62rem]">
          <span className="tracking-[0.25em] text-[#6F716D]">{headingLine}</span>
          <span
            className={`mt-1 inline-flex rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-tight ${badgeStyle}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#DBD8C9] bg-white shadow-[0px_10px_22px_rgba(0,0,0,0.12)] sm:h-32 sm:w-32 lg:h-36 lg:w-36">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={booking.venue_name ?? 'Venue placeholder'}
                width={200}
                height={200}
                className="h-full w-full object-cover"
                unoptimized={needsUnoptimized}
              />
            ) : (
              <div className="h-full w-full bg-[#DBD8C9]" />
            )}
          </div>

          <div className="space-y-1">
            <div className="text-lg font-semibold uppercase tracking-[0.08em] text-black">
              {booking.venue_name ?? 'Venue TBD'}
            </div>
            <div className="text-sm text-[#31332f]">
              {formatPassLabel(booking.pass_presentation_kind ?? booking.pass_kind)} · Party {booking.party_size}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#6F716D]">{booking.price_display}</div>
          </div>
        </div>

        {!isCancelled && (
          <div className="flex w-full flex-col gap-3 px-2 text-sm sm:min-h-[2.5rem] sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            {showPrimaryCta && (
              <Link
                href={`/app/booking/${booking.id}`}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-full bg-[#02374D] px-5 py-2 text-center font-medium text-white transition hover:bg-[#02486A] sm:w-auto sm:min-w-[140px]"
              >
                {primaryCta}
              </Link>
            )}
            {showCancelLink && (
              <Link
                href={`/app/booking/${booking.id}`}
                onClick={(event) => event.stopPropagation()}
                className="w-full rounded-full border border-[#F5B8B8] px-5 py-2 text-center font-medium text-[#B4231F] transition hover:border-[#f29393] sm:w-auto sm:min-w-[140px]"
              >
                Cancel
              </Link>
            )}
            {!showPrimaryCta && !showCancelLink && <span className="inline-block h-10 w-0" />}
          </div>
        )}
      </div>
    </div>
  )
}

export default function WalletClient({ bookings }: Props) {
  const [segment, setSegment] = useState<Segment>('upcoming')
  const [bookingsState, setBookingsState] = useState<GuestBookingView[]>(bookings)

  useEffect(() => {
    setBookingsState(bookings)
  }, [bookings])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/my/bookings', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { bookings: GuestBookingView[] }
        setBookingsState(data.bookings)
      } catch (error) {
        console.warn('Failed to refresh bookings', error)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const grouped = useMemo(() => {
    return bookingsState.reduce(
      (acc, booking) => {
        const key = computeSegment(booking)
        acc[key].push(booking)
        return acc
      },
      {
        today: [] as GuestBookingView[],
        upcoming: [] as GuestBookingView[],
        past: [] as GuestBookingView[],
        cancelled: [] as GuestBookingView[],
      }
    )
  }, [bookingsState])

  const upcomingCount = grouped.today.length + grouped.upcoming.length
  const activeList =
    segment === 'today'
      ? grouped.today
      : segment === 'upcoming'
        ? [...grouped.today, ...grouped.upcoming]
        : segment === 'past'
          ? grouped.past
          : grouped.cancelled

  const segmentCounts = {
    today: grouped.today.length,
    upcoming: upcomingCount,
    past: grouped.past.length,
    cancelled: grouped.cancelled.length,
  }

  const headlineText =
    segment === 'today'
      ? segmentCounts.today > 0
        ? `You have ${segmentCounts.today} reservation${segmentCounts.today === 1 ? '' : 's'} today`
        : 'You have no reservations today'
      : segment === 'upcoming'
        ? segmentCounts.upcoming > 0
          ? `You have ${segmentCounts.upcoming} upcoming reservation${segmentCounts.upcoming === 1 ? '' : 's'}`
          : 'You have no upcoming reservations yet'
        : segment === 'past'
          ? segmentCounts.past > 0
            ? `You have ${segmentCounts.past} past reservation${segmentCounts.past === 1 ? '' : 's'}`
            : 'You have no past reservations yet'
          : segmentCounts.cancelled > 0
            ? `You have ${segmentCounts.cancelled} cancelled reservation${segmentCounts.cancelled === 1 ? '' : 's'}`
            : 'You have no cancelled reservations'

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-12 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <div className="flex flex-wrap items-center justify-center gap-2 pb-6">
        {(Object.keys(segmentLabels) as Segment[]).map((key) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              key === segment
                ? 'bg-[#02374D] text-white shadow-[0px_4px_20px_rgba(2,55,77,0.25)]'
                : 'bg-[#DBD8C9] text-black hover:bg-[#d0ccba]'
            }`}
          >
            {segmentLabels[key]}
          </button>
        ))}
      </div>

      <header className="pb-4 text-center">
        <h1 className="text-2xl font-medium uppercase tracking-[0.02em] text-black sm:text-3xl">{headlineText}</h1>
      </header>

      {activeList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#DBD8C9] bg-white/80 p-6 text-center text-[#4F514D] sm:p-12">
          {segment === 'past'
            ? 'No past reservations yet.'
            : segment === 'cancelled'
              ? 'No cancelled reservations.'
              : 'No reservations yet. Request a pass to get started.'}
        </div>
      ) : (
        <div className="grid items-stretch justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-[1.2rem]">
          {activeList.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}
