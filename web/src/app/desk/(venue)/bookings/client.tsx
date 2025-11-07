'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { BookingCardPayload } from './page'
import { markArrivedAction, undoDeclineAction } from '../actions'

const SEGMENT_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'issued', label: 'Pass issued' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'declined', label: 'Declined' },
  { value: 'pending_verification', label: 'Pending verification' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
] as const

const PASS_OPTIONS = [
  { value: 'all', label: 'All pass types' },
  { value: 'beach', label: 'Beach' },
  { value: 'pool', label: 'Pool' },
  { value: 'spa', label: 'Spa' },
  { value: 'gym', label: 'Gym' },
] as const

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All payments' },
  { value: 'active', label: 'Hold active' },
  { value: 'charged', label: 'No-show charged' },
  { value: 'released', label: 'Hold released' },
] as const

const STATUS_BADGE_CLASSES: Record<string, string> = {
  issued: 'bg-[#D0F3EA] text-[#0D6B56]',
  approved: 'bg-[#D0F3EA] text-[#0D6B56]',
  redeemed: 'bg-[#DCFCE7] text-[#166534]',
  redeemed_late: 'bg-[#BDEBD9] text-[#0B5B48]',
  pending_verification: 'bg-[#EDE9FE] text-[#5B21B6]',
  cancelled: 'bg-[#FCE1E1] text-[#B4231F]',
  no_show: 'bg-[#FDE6D5] text-[#B45309]',
}

type Segment = (typeof SEGMENT_OPTIONS)[number]['value']

export function BookingsClient({ bookings }: { bookings: BookingCardPayload[] }) {
  const [segment, setSegment] = useState<Segment>('today')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [passFilter, setPassFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      if (booking.segment !== segment) return false
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (passFilter !== 'all' && booking.category !== passFilter) return false
      if (paymentFilter !== 'all' && booking.paymentStateKey !== paymentFilter) return false
      return true
    })
  }, [bookings, segment, statusFilter, passFilter, paymentFilter])

  const label = SEGMENT_OPTIONS.find((option) => option.value === segment)?.label ?? 'Bookings'
  const heading =
    segment === 'today'
      ? `YOU HAVE ${filtered.length} BOOKING${filtered.length === 1 ? '' : 'S'} TODAY`
      : `YOU HAVE ${filtered.length} ${label.toUpperCase()} BOOKING${filtered.length === 1 ? '' : 'S'}`

  return (
    <div className="space-y-8">
      <div className="flex justify-center gap-2 pb-4">
        {SEGMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSegment(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              option.value === segment
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

      <div className="flex flex-wrap items-center gap-3 text-sm text-[#02374D]">
        <FilterPill
          id="status"
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={setStatusFilter}
          isOpen={openDropdown === 'status'}
          onToggle={(isOpen) => setOpenDropdown(isOpen ? 'status' : null)}
        />
        <FilterPill
          id="pass"
          label="Pass type"
          value={passFilter}
          options={PASS_OPTIONS}
          onChange={setPassFilter}
          isOpen={openDropdown === 'pass'}
          onToggle={(isOpen) => setOpenDropdown(isOpen ? 'pass' : null)}
        />
        <FilterPill
          id="payment"
          label="Payment"
          value={paymentFilter}
          options={PAYMENT_OPTIONS}
          onChange={setPaymentFilter}
          isOpen={openDropdown === 'payment'}
          onToggle={(isOpen) => setOpenDropdown(isOpen ? 'payment' : null)}
        />
      </div>

      {filtered.length > 0 && (
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
    : STATUS_BADGE_CLASSES[booking.status] ??
      (booking.isToday ? 'bg-[#D0F3EA] text-[#0D6B56]' : 'bg-[#DBD8C9] text-[#5F6059]')

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

      {booking.ctaLabel && (
        <div className="flex flex-col gap-3 text-xs text-[#6F716D]">
          <div className="flex justify-center">
            {booking.ctaLabel === 'Mark Arrived' && booking.qrJti ? (
              <form action={markArrivedAction} className="w-full max-w-[12rem]">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="qrJti" value={booking.qrJti} />
                <button
                  type="submit"
                  className={`w-full rounded-full px-3 py-2 text-sm font-semibold transition ${buttonClass}`}
                >
                  {booking.ctaLabel}
                </button>
              </form>
            ) : booking.ctaLabel === 'Undo Decline' ? (
              <form action={undoDeclineAction} className="w-full max-w-[12rem]">
                <input type="hidden" name="bookingId" value={booking.id} />
                <button
                  type="submit"
                  className={`w-full rounded-full px-3 py-2 text-sm font-semibold transition ${buttonClass}`}
                >
                  {booking.ctaLabel}
                </button>
              </form>
            ) : (
              <Link
                href={booking.detailHref}
                className={`w-full max-w-[12rem] rounded-full px-3 py-2 text-sm font-semibold transition ${buttonClass}`}
              >
                {booking.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type DropdownOption = { value: string; label: string }

function FilterPill({
  id,
  label,
  value,
  options,
  onChange,
  isOpen,
  onToggle,
}: {
  id: string
  label: string
  value: string
  options: readonly DropdownOption[]
  onChange: (next: string) => void
  isOpen: boolean
  onToggle: (isOpen: boolean) => void
}) {
  const activeLabel = options.find((option) => option.value === value)?.label ?? label

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => onToggle(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-[#DBD8C9] px-4 py-2 text-sm font-medium text-black hover:bg-[#d0ccba]"
      >
        {activeLabel}
        <span className="text-xs">▾</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-44 rounded-2xl border border-[#c9c5b4] bg-[#DBD8C9] py-2 text-sm shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`block w-full px-4 py-2 text-left ${
                option.value === value ? 'font-semibold text-[#02374D]' : 'text-[#4F514D]'
              } hover:bg-[#F4F1E7]`}
              onClick={() => {
                onChange(option.value)
                onToggle(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
