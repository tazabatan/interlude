'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const SEGMENT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'requests', label: 'Requests' },
  { value: 'bookings', label: 'Bookings' },
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

type Segment = (typeof SEGMENT_OPTIONS)[number]['value']

type BookingCardPayload = {
  id: string
  dateLabel: string
  arrivalWindow: string
  passLabel: string
  priceLabel: string
  statusLabel: string
  partySize: number
  guestLabel: string
  imageSrc: string
  detailHref: string
  status: string
  category: string
  paymentStateKey: string
  paymentStateLabel: string
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function DayDetailClient({ date, bookings }: { date: string; bookings: BookingCardPayload[] }) {
  const [segment, setSegment] = useState<Segment>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [passFilter, setPassFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const todayIso = new Date().toISOString().slice(0, 10)
  const isToday = date === todayIso

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      // Segment filter
      if (segment === 'requests' && booking.status !== 'requested') return false
      if (segment === 'bookings' && booking.status === 'requested') return false

      // Other filters
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false
      if (passFilter !== 'all' && booking.category !== passFilter) return false
      if (paymentFilter !== 'all' && booking.paymentStateKey !== paymentFilter) return false
      return true
    })
  }, [bookings, segment, statusFilter, passFilter, paymentFilter])

  const segmentLabel = segment === 'requests' ? 'REQUEST' : 'BOOKING'
  const heading = `YOU HAVE ${filtered.length} ${segmentLabel}${filtered.length === 1 ? '' : 'S'} ON THIS DAY`

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-4">
        <Link
          href="/desk/calendar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DBD8C9] text-[#02374D] transition hover:bg-[#d0ccba]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div className="flex flex-1 justify-center gap-2">
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
        <div className="h-10 w-10"></div>
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
            <BookingCard key={booking.id} booking={booking} isToday={isToday} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking, isToday }: { booking: BookingCardPayload; isToday: boolean }) {
  const isDeclined = booking.status === 'declined'
  const isRequest = booking.status === 'requested'

  const ctaLabel = isDeclined ? 'Undo Decline' : isToday ? 'Mark Arrived' : null

  const buttonClass = isDeclined
    ? 'border border-[#B4231F] text-[#B4231F] hover:border-[#F5B8B8] hover:bg-[#F5B8B8]/20'
    : isToday
      ? 'bg-[#02374D] text-white hover:bg-[#02486A]'
      : 'border border-[#02374D] text-[#02374D] hover:bg-[#02374D] hover:text-white'

  const statusClass = isDeclined
    ? 'bg-[#FCE1E1] text-[#B4231F]'
    : isRequest
      ? 'bg-[#FFF3CD] text-[#92400E]'
      : 'bg-[#D0F3EA] text-[#0D6B56]'

  return (
    <div className="flex min-h-[20rem] flex-col gap-6 rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] px-7 py-8 text-center shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
      <Link
        href={booking.detailHref}
        className="flex flex-col gap-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1E7]"
      >
        <div className="space-y-3">
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

      {ctaLabel && (
        <div className="flex flex-col gap-3 text-xs text-[#6F716D]">
          <div className="flex justify-center">
            <Link
              href={booking.detailHref}
              className={`w-full max-w-[12rem] rounded-full px-3 py-2 text-sm font-semibold transition ${buttonClass}`}
            >
              {ctaLabel}
            </Link>
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
