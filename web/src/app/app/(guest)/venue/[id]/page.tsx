import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchPassById, fetchPassInventoryByDateRange, getPassHeroImageUrl } from '@/lib/desk'
import { audienceFromRole, isPassActive, isVisibleForAudience } from '@/lib/explore'
import { getUserRole } from '@/lib/get-user-role'
import { formatPassLabel, formatPassPrice, pickPassImage } from '@/lib/passes/helpers'
import PassRequestForm from './pass-request-form'

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (typeof value !== 'string') return fallback
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return fallback
  return `${match[1]}:${match[2]}`
}

function addMinutes(start: string, minutes: number) {
  if (!/^(\d{2}):(\d{2})$/.test(start)) return start
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + minutes
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59))
  const hours = String(Math.floor(clamped / 60)).padStart(2, '0')
  const mins = String(clamped % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function findFirstAvailableDate(startIso: string, endIso: string, pausedSet: Set<string>) {
  const start = new Date(`${startIso}T00:00:00`)
  const end = new Date(`${endIso}T00:00:00`)
  const cursor = new Date(start)
  while (cursor <= end) {
    const iso = toISODate(cursor)
    if (!pausedSet.has(iso)) return iso
    cursor.setDate(cursor.getDate() + 1)
  }
  return startIso
}

type VenuePassPageProps = {
  params: Promise<{ id: string }>
}

export default async function VenuePassPage({ params }: VenuePassPageProps) {
  const [{ id }, { role }] = await Promise.all([params, getUserRole()])
  const passId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null
  if (!passId) notFound()

  const pass = await fetchPassById(passId)
  if (!pass) notFound()

  const audience = audienceFromRole(role)
  if (!isPassActive(pass) || !isVisibleForAudience(pass.visibility ?? null, audience)) {
    notFound()
  }

  const locationLabel = (pass.venue?.tz ?? 'America/Anguilla').toUpperCase()
  const heroImageUrl = getPassHeroImageUrl(pass)
  const heroSrc = heroImageUrl ?? pickPassImage(pass.id)
  const heroNeedsUnoptimized = Boolean(
    heroImageUrl &&
      (heroImageUrl.startsWith('data:') ||
        heroImageUrl.startsWith('blob:') ||
        heroImageUrl.startsWith('http://127.0.0.1') ||
        heroImageUrl.startsWith('http://localhost') ||
        heroImageUrl.startsWith('https://127.0.0.1') ||
        heroImageUrl.startsWith('https://localhost'))
  )
  const passLabel = formatPassLabel(pass.kind, { detail: true })
  const simplePassLabel = formatPassLabel(pass.kind)
  const isMinSpend = pass.kind === 'MIN_SPEND'
  const formattedMinSpend = formatPassPrice(null, pass.min_spend_amount ?? null, pass.currency)
  const priceDisplay = isMinSpend
    ? `${simplePassLabel} included with minimum spend of ${formattedMinSpend} per person on food or beverages`
    : pass.display_price_text ?? formatPassPrice(null, pass.min_spend_amount ?? null, pass.currency)

  const holdDisplay = formatPassPrice(null, pass.no_show_amount_per_person ?? null, pass.currency)
  const serviceOpen = normalizeTime(pass.service_hours_open_local, '09:00')
  const serviceClose = normalizeTime(pass.service_hours_close_local, '18:00')
  const arrivalStart = normalizeTime(pass.default_arrival_start_local, serviceOpen)
  const arrivalMinutes = pass.default_arrival_window_minutes ?? 60
  const arrivalEnd = addMinutes(arrivalStart, arrivalMinutes)
  const graceMinutes = pass.arrival_grace_minutes ?? 30
  const today = new Date()
  const todayIso = toISODate(today)
  const rangeEnd = addDays(today, 90)
  const maxDateIso = toISODate(rangeEnd)
  const inventory = await fetchPassInventoryByDateRange(todayIso, maxDateIso)
  const pausedDates = inventory.filter((row) => row.pass_id === pass.id && row.paused).map((row) => row.date)
  const pausedSet = new Set(pausedDates)
  const defaultDate = findFirstAvailableDate(todayIso, maxDateIso, pausedSet)

  const arrivalRows = [
    { label: 'Arrival window', value: `${arrivalStart} – ${arrivalEnd}` },
    { label: 'Service window', value: `${serviceOpen} – ${serviceClose}` },
    { label: 'Grace period', value: `${graceMinutes} min` },
  ]

  return (
    <div className="space-y-8 text-black">
      <div className="bg-[#F4F1E7] pb-4 pt-2">
        <Link
          href="/app/explore"
          className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D] transition hover:text-black"
        >
          ← Back to explore
        </Link>

        <header className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">{passLabel}</p>
          <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">
            {pass.venue?.name?.toUpperCase() ?? 'Unnamed Venue'}
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] text-[#4F514D]">{locationLabel}</p>
        </header>
      </div>

      <div className="space-y-6">
        <div className="relative h-96 w-full overflow-hidden rounded-[32px] border border-[#E8E4D7] bg-white shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
          <Image
            src={heroSrc}
            alt={pass.venue?.name ?? 'Pass'}
            fill
            priority
            className="object-cover object-center"
            sizes="(min-width: 1280px) 60vw, 100vw"
            unoptimized={heroNeedsUnoptimized}
          />
        </div>

        <section className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 text-sm leading-6 text-[#4F514D] shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
          <p>
            <span className="font-semibold text-black">Pass type:</span> {passLabel}
          </p>
          <p>
            <span className="font-semibold text-black">Price:</span> {priceDisplay}
          </p>
          <p>
            <span className="font-semibold text-black">No-show hold:</span> {holdDisplay} per guest
          </p>
        </section>

        <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Guest copy preview</h2>
          <div className="rounded-[20px] border border-[#F0EBDC] bg-[#FFFCF5] p-6 text-sm leading-6 text-[#4F514D] shadow-inner">
            <p className="font-semibold uppercase tracking-[0.08em] text-black">{pass.venue?.name ?? 'Pass'}</p>
            <p className="text-2xl font-semibold text-black">{priceDisplay}</p>
            <p className="pt-4 text-[#4F514D]">
              Escape for the day with an exclusive {pass.venue?.name ?? 'TBD Venue'} day pass, offering full access to our secluded beachfront.
            </p>
            <p className="pt-3 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
              {formatPassLabel(pass.kind)} · {pass.visibility?.replace('_', ' ') ?? 'members only'}
            </p>
          </div>
        </section>

        <PassRequestForm
          passId={pass.id}
          minDate={todayIso}
          maxDate={maxDateIso}
          defaultDate={defaultDate}
          pausedDates={pausedDates}
          arrivalStart={arrivalStart}
          arrivalEnd={arrivalEnd}
        />

        <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Arrival details</h2>
          <dl className="grid gap-4 md:grid-cols-3">
            {arrivalRows.map((row) => (
              <div key={row.label} className="space-y-1 rounded-2xl border border-[#EFE9D9] bg-[#FFFCF5] p-4 text-center">
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">{row.label}</dt>
                <dd className="text-base font-semibold text-black">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
