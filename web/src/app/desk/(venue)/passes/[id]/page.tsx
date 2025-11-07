import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fetchPassById } from '@/lib/desk'
import {
  autoApproveAction,
  dailyCapAction,
  pauseAction,
  setDefaultCapAction,
  updatePassArrivalWindowAction,
  updatePassPricingAction,
  updatePassServiceHoursAction,
  updatePassStatusVisibilityAction,
} from '@/app/desk/(venue)/actions'
import { formatPassLabel, formatPassPrice, pickPassImage } from '@/lib/passes/helpers'
import { DropdownField } from './DropdownField'

type PassDetailPageProps = {
  params: Promise<{ id: string }>
}

const visibilityOptions = [
  { value: 'members', label: 'Members only' },
  { value: 'guest_only', label: 'Guests only' },
  { value: 'both', label: 'Guests & members' },
]

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
]

const arrivalPresets = [
  { label: 'All day', value: 'all-day' },
  { label: 'Morning', value: 'morning' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Afternoon', value: 'afternoon' },
]

const shortcutOptions = ['Today', 'Tomorrow', 'This week']

function addMinutesToTime(start: string, minutes: number) {
  if (!/^\d{2}:\d{2}$/.test(start)) return start
  const [hours, mins] = start.split(':').map(Number)
  const total = Math.max(0, Math.min(23 * 60 + 59, hours * 60 + mins + minutes))
  const h = String(Math.floor(total / 60)).padStart(2, '0')
  const m = String(total % 60).padStart(2, '0')
  return `${h}:${m}`
}

function inferPreset(start: string, end: string, serviceOpen: string, serviceClose: string) {
  if (start === serviceOpen && end === serviceClose) return 'all-day'
  if (start === serviceOpen && end === '11:00') return 'morning'
  if (start === '12:00' && end === '14:00') return 'lunch'
  if (start === '14:00' && end === '16:00') return 'afternoon'
  return 'custom'
}

function centsToInput(amount: number | null) {
  if (typeof amount !== 'number') return ''
  return String(Math.round(amount) / 100)
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (typeof value !== 'string') return fallback
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return fallback
  return `${match[1]}:${match[2]}`
}

export default async function PassDetailPage({ params }: PassDetailPageProps) {
  const { id } = await params
  const passId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null
  if (!passId || passId === 'undefined') notFound()

  const pass = await fetchPassById(passId)
  if (!pass) notFound()

  const guestPrice =
    pass.kind === 'MIN_SPEND'
      ? formatPassPrice(null, pass.min_spend_amount ?? null, pass.currency ?? 'USD')
      : pass.display_price_text ?? formatPassPrice(null, pass.min_spend_amount ?? null, pass.currency ?? 'USD')
  const serviceOpen = normalizeTime(pass.service_hours_open_local, '09:00')
  const serviceClose = normalizeTime(pass.service_hours_close_local, '18:00')
  const arrivalStart = normalizeTime(pass.default_arrival_start_local, serviceOpen)
  const arrivalMinutes = pass.default_arrival_window_minutes ?? 60
  const arrivalEnd = addMinutesToTime(arrivalStart, arrivalMinutes)
  const inferredPreset = inferPreset(arrivalStart, arrivalEnd, serviceOpen, serviceClose)
  const graceMinutes = pass.arrival_grace_minutes ?? 30
  const todayIso = new Date().toISOString().slice(0, 10)
  const passStatus = statusOptions.some((option) => option.value === pass.status) ? (pass.status as string) : 'active'
  const visibilityValue = pass.visibility ?? 'members'
  const passStatusLabel = statusOptions.find((option) => option.value === passStatus)?.label ?? passStatus
  const visibilityLabel =
    visibilityOptions.find((option) => option.value === visibilityValue)?.label ??
    visibilityValue.replace('_', ' ')
  const arrivalRange = `${arrivalStart} - ${arrivalEnd}`
  const serviceHoursRange = `${serviceOpen} - ${serviceClose}`

  return (
    <div className="space-y-8 text-black">
      <div className="bg-[#F4F1E7] pb-4 pt-2">
        <Link
          href="/desk/passes"
          className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D] transition hover:text-black"
        >
          ← Back to passes
        </Link>

        <header className="mt-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">{formatPassLabel(pass.kind, { detail: true })}</p>
          <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">
            {pass.venue?.name?.toUpperCase() ?? 'Unnamed Venue'}
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] text-[#4F514D]">{pass.venue?.tz ?? 'America/Anguilla'}</p>
        </header>
      </div>

  <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
    <div className="space-y-6">
      <div className="sticky top-0 space-y-6">
      <div className="relative h-96 w-full overflow-hidden rounded-[32px] border border-[#E8E4D7] bg-white shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <Image src={pickPassImage(pass.id)} alt={pass.venue?.name ?? 'Pass'} fill className="object-cover" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-4">
          <span
            className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${
              passStatus === 'paused' ? 'bg-[#FCE1E1] text-[#B4231F]' : 'bg-[#CDEEDF] text-[#0D6B56]'
            }`}
          >
            {passStatusLabel}
          </span>
        </div>
      </div>

          <div className="space-y-4">
            <section className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 text-sm leading-6 text-[#4F514D] shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
              <p>
                <span className="font-semibold text-black">Pass type:</span> {formatPassLabel(pass.kind, { detail: true })}
              </p>
              <p>
                <span className="font-semibold text-black">Price:</span> {guestPrice}
              </p>
              <p>
                <span className="font-semibold text-black">Visibility:</span> {visibilityLabel}
              </p>
              <p>
                <span className="font-semibold text-black">Default cap:</span> {pass.default_daily_cap}
              </p>
            </section>

            <section className="rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 text-sm leading-6 text-[#4F514D] shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
              <p>
                <span className="font-semibold text-black">Arrival window:</span> {arrivalRange}
              </p>
              <p>
                <span className="font-semibold text-black">Grace period:</span> {graceMinutes} min
              </p>
              <p>
                <span className="font-semibold text-black">Service window:</span> {serviceHoursRange}
              </p>
            </section>
          </div>

          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Guest copy preview</h2>
            <div className="rounded-[20px] border border-[#F0EBDC] bg-[#FFFCF5] p-6 text-sm leading-6 text-[#4F514D] shadow-inner">
              <p className="font-semibold uppercase tracking-[0.08em] text-black">{pass.venue?.name ?? 'Pass'}</p>
              <p className="text-2xl font-semibold text-black">{guestPrice}</p>
              <p className="pt-4 text-[#4F514D]">Escape for the day with an exclusive {pass.venue?.name ?? 'TBD Venue'} day pass, offering you full access to our secluded beach front.</p>
              <p className="pt-3 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                {formatPassLabel(pass.kind)} · {pass.visibility?.replace('_', ' ') ?? 'members only'}
              </p>
            </div>
          </section>
          </div>
        </div>

        <div className="space-y-6">
          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Pass status & visibility</h2>
            <div className="space-y-4">
              <form action={updatePassStatusVisibilityAction} className="space-y-2">
                <input type="hidden" name="passId" value={pass.id} />
                <p className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">Pass status</p>
                <div className="mt-2 flex gap-2">
                  {statusOptions.map((option) => {
                    return (
                      <button
                        key={option.value}
                        type="submit"
                        name="status"
                        value={option.value}
                    className={`w-1/2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                      option.value === 'active'
                        ? 'border-[#CDEEDF] bg-[#CDEEDF] text-[#0D6B56] hover:bg-[#B7E2CF]'
                        : 'border-[#B4231F] text-[#B4231F] hover:border-[#F5B8B8] hover:bg-[#F5B8B8]/20'
                    }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </form>

              <form action={updatePassStatusVisibilityAction} className="space-y-2">
                <input type="hidden" name="passId" value={pass.id} />
                <label className="text-xs uppercase tracking-[0.15em] text-[#6F716D]" htmlFor="visibility-select">
                  Visibility
                </label>
                <div className="flex gap-2">
                  <DropdownField
                    name="visibility"
                    options={visibilityOptions}
                    defaultValue={visibilityValue}
                    className="flex-1"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-[#02374D] bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#02486A]"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Auto-approve</h2>
            <form action={autoApproveAction} className="space-y-3">
              <input type="hidden" name="passId" value={pass.id} />
              <input type="hidden" name="enabled" value={String(!pass.auto_approve_enabled)} />
              <button
                type="submit"
                className={`flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left text-xs uppercase tracking-[0.15em] transition-colors ${
                  pass.auto_approve_enabled ? 'border-[#0D9488] bg-[#BAE6E3]' : 'border-[#B4231F] bg-[#FCE1E1]'
                }`}
              >
                <span className="text-[#6F716D]">Auto-approve</span>
                <span
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    pass.auto_approve_enabled ? 'bg-[#0D9488]' : 'bg-[#B4231F]'
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all ${
                      pass.auto_approve_enabled ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>
              <p className="rounded-[20px] border border-[#F0EBDC] bg-[#FFFCF5] p-4 text-xs text-[#4F514D]">
                Auto-approve respects cap & pause. If cap is full or a date is paused, requests queue automatically.
              </p>
            </form>
            <form action={setDefaultCapAction} className="space-y-3 rounded-[20px] border border-[#E8E4D7] bg-[#F9F6ED] p-4 text-sm text-[#4F514D]">
              <input type="hidden" name="passId" value={pass.id} />
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">Default daily cap</span>
                <input
                  type="number"
                  name="defaultCap"
                  min={0}
                  defaultValue={String(pass.default_daily_cap ?? 0)}
                  className="w-full rounded border border-[#DBD8C9] bg-white px-3 py-2 text-sm text-black"
                />
              </label>
              <p className="text-xs text-[#4F514D]">Used automatically for dates without a manual cap. Calendar overrides win.</p>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full border border-[#02374D] bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#02486A]"
                >
                  Save default cap
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Service hours (local)</h2>
            <form action={updatePassServiceHoursAction} className="space-y-3">
              <input type="hidden" name="passId" value={pass.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                  Open
                  <input
                    type="time"
                    name="open"
                    defaultValue={serviceOpen}
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                  Close
                  <input
                    type="time"
                    name="close"
                    defaultValue={serviceClose}
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                  />
                </label>
              </div>
              <p className="text-xs text-[#4F514D]">Windows must sit inside these hours. Used for &ldquo;All day&rdquo; and no-show timing.</p>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full border border-[#02374D] bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#02486A]"
                >
                  Save service hours
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Arrival window presets</h2>
            <div className="flex flex-wrap gap-2">
              {arrivalPresets.map((preset) => {
                const isActive = inferredPreset === preset.value
                return (
                  <form key={preset.value} action={updatePassArrivalWindowAction}>
                    <input type="hidden" name="passId" value={pass.id} />
                    <input type="hidden" name="preset" value={preset.value} />
                    <input type="hidden" name="graceMinutes" value={String(graceMinutes)} />
                    <button
                      type="submit"
                      className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                        isActive ? 'border-[#02374D] bg-[#02374D] text-white' : 'border-[#DBD8C9] text-[#4F514D]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  </form>
                )
              })}
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${
                  inferredPreset === 'custom' ? 'border-[#02374D] text-black' : 'border-[#DBD8C9] text-[#4F514D]'
                }`}
                aria-label="Custom arrival window edits below"
              >
                Custom
              </button>
            </div>

            <form action={updatePassArrivalWindowAction} className="space-y-3">
              <input type="hidden" name="passId" value={pass.id} />
              <input type="hidden" name="preset" value="custom" />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                  Custom start
                  <input
                    type="time"
                    name="start"
                    defaultValue={arrivalStart}
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                  />
                </label>
                <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                  Custom end
                  <input
                    type="time"
                    name="end"
                    defaultValue={arrivalEnd}
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                  Grace period
                  <div className="mt-1">
                    <DropdownField
                      name="graceMinutes"
                      options={[
                        { value: '0', label: '0 min' },
                        { value: '15', label: '15 min' },
                        { value: '30', label: '30 min' },
                      ]}
                      defaultValue={String(graceMinutes)}
                    />
                  </div>
                </label>
                <p className="text-xs text-[#4F514D]">Scanner accepts passes within the window plus this grace.</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full border border-[#02374D] bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#02486A]"
                >
                  Save custom window
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Hold & pricing copy</h2>
            <form action={updatePassPricingAction} className="space-y-4 text-sm text-[#4F514D]">
              <input type="hidden" name="passId" value={pass.id} />
              <input type="hidden" name="kind" value={pass.kind ?? 'DAY_PASS'} />
              {pass.kind === 'MIN_SPEND' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                    Min spend per person (USD)
                    <input
                      type="text"
                      name="minSpend"
                      inputMode="decimal"
                      defaultValue={centsToInput(pass.min_spend_amount)}
                      placeholder="250"
                      className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                    />
                  </label>
                  <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                    No-show hold per person (USD)
                    <input
                      type="text"
                      name="hold"
                      inputMode="decimal"
                      defaultValue={centsToInput(pass.no_show_amount_per_person)}
                      placeholder="100"
                      className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-3">
                  <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                    Display price text
                    <input
                      type="text"
                      name="displayText"
                      defaultValue={pass.display_price_text ?? ''}
                      placeholder="From $250 per guest"
                      className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                    />
                  </label>
                  <label className="space-y-1 text-xs uppercase tracking-[0.15em] text-[#6F716D]">
                    No-show hold per person (USD)
                    <input
                      type="text"
                      name="hold"
                      inputMode="decimal"
                      defaultValue={centsToInput(pass.no_show_amount_per_person)}
                      placeholder="100"
                      className="w-full rounded border border-[#DBD8C9] px-3 py-2 text-sm text-black"
                    />
                  </label>
                </div>
              )}
              <p className="text-xs italic text-[#6F716D]">
                Guardrail: changes apply to new approvals only. Issued bookings keep their original snapshot.
              </p>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full border border-[#02374D] bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#02486A]"
                >
                  Save pricing
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">Inventory controls</h2>
            <div className="flex flex-wrap gap-2">
              {shortcutOptions.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full border border-[#DBD8C9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#4F514D]"
                >
                  {label}
                </button>
              ))}
            </div>
            <form action={dailyCapAction} className="space-y-3 text-sm text-[#4F514D]">
              <input type="hidden" name="passId" value={pass.id} />
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">Date</span>
                  <input
                    type="date"
                    name="date"
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2"
                    defaultValue={todayIso}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">Cap</span>
                  <input
                    type="number"
                    name="cap"
                    className="w-full rounded border border-[#DBD8C9] px-3 py-2"
                    placeholder="20"
                    min={0}
                    required
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-full border border-[#02374D] bg-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#02486A]"
                >
                  Save cap
                </button>
              </div>
            </form>
            <form action={pauseAction} className="space-y-3 text-sm text-[#4F514D]">
              <input type="hidden" name="passId" value={pass.id} />
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-[0.15em] text-[#6F716D]">Date</span>
                <input
                  type="date"
                  name="date"
                  className="w-full rounded border border-[#DBD8C9] px-3 py-2"
                  defaultValue={todayIso}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="paused"
                  value="true"
                  className="flex-1 rounded-full border border-[#B4231F] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#B4231F] transition hover:border-[#F5B8B8] hover:bg-[#F5B8B8]/20"
                >
                  Pause date
                </button>
                <button
                  type="submit"
                  name="paused"
                  value="false"
                  className="flex-1 rounded-full border border-[#7FCFC2] bg-[#7FCFC2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#6AC4B6]"
                >
                  Resume date
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
