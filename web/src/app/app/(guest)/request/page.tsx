import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'
import { fetchPassById } from '@/lib/desk'
import { derivePresentationKind } from '@/lib/explore'
import { formatPassLabel } from '@/lib/passes/helpers'
import { formatRequestedArrival } from '@/lib/arrival'
import RequestFlow from './request-flow'
import { computePartyCountsFromAges, formatPartySummary } from '@/lib/party'

const DEFAULT_TAX_RATE = Number(process.env.NEXT_PUBLIC_REQUEST_TAX_RATE ?? 0.135)
const DEMO_PASS_ID = process.env.NEXT_PUBLIC_DEMO_PASS_ID ?? ''

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDisplayDate(iso: string) {
  const parsed = new Date(`${iso}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function previousDayCopy(iso: string) {
  const date = new Date(`${iso}T00:00:00`)
  date.setUTCDate(date.getUTCDate() - 1)
  return formatDisplayDate(date.toISOString().slice(0, 10))
}

type PageProps = {
  searchParams: Promise<{
    passId?: string
    date?: string
    partySize?: string
    arrivalTime?: string
    partyAge?: string
    guestAges?: string
    notes?: string
  }>
}

export default async function RequestPage({ searchParams }: PageProps) {
  const params = await searchParams
  const { user } = await getUserRole()

  const passId = params.passId ?? DEMO_PASS_ID
  if (!passId) {
    redirect('/app/explore')
  }

  const requestedDate = params.date ?? new Date().toISOString().slice(0, 10)
  const partySize = Number(params.partySize ?? 2) || 2
  const arrivalTime = params.arrivalTime ?? null
  const partyAgeNote = params.partyAge?.trim() ?? ''
  const notes = params.notes?.trim() ?? ''
  const guestAgeValues = normalizeGuestAges(params.guestAges, partySize)
  const guestAgeNumbers = guestAgeValues.map((value) => (value ? Number(value) : null))
  const guestAgeDetails = buildGuestAgeDetails(guestAgeValues)
  const counts = computePartyCountsFromAges(guestAgeNumbers)
  const arrivalTimeLabel =
    arrivalTime && arrivalTime.trim() ? formatRequestedArrival(arrivalTime) : 'Arrival time TBD'

  const pass = await fetchPassById(passId)
  if (!pass) {
    redirect('/app/explore')
  }

  const currency = (pass.currency ?? 'USD').toUpperCase()
  const venueName = pass.venue?.name ?? 'Unnamed Venue'
  const derivedKind = derivePresentationKind(pass)
  const passLabel = formatPassLabel(derivedKind ?? pass.kind, { detail: true })
  const isConcierge = derivedKind === 'BOAT_DAY' || derivedKind === 'PRIVATE_CHEF'
  const perGuestPriceCents = isConcierge ? 0 : pass.min_spend_amount ?? 0
  const priceCents = perGuestPriceCents * partySize
  const taxCents = isConcierge ? 0 : Math.round(priceCents * DEFAULT_TAX_RATE)
  const totalCents = priceCents + taxCents

  const summary = {
    passId,
    dateIso: requestedDate,
    dateDisplay: formatDisplayDate(requestedDate),
    venueName,
    destination: venueName,
    arrivalTimeLabel,
    passLabel,
    partySize,
    partySizeLabel: formatPartySummary(counts.adults, counts.children, partySize),
    guestAgeDetails: guestAgeDetails.length > 0 ? guestAgeDetails : partyAgeNote ? [partyAgeNote] : null,
    guestNotes: notes || null,
    guestAgesComplete: guestAgeValues.every((value) => value.trim() !== ''),
    priceLabel: isConcierge ? 'Price on request' : formatCurrency(priceCents, currency),
    taxLabel: isConcierge ? '—' : formatCurrency(taxCents, currency),
    totalLabel: isConcierge ? 'Price on request' : formatCurrency(totalCents, currency),
    dueNowLabel: '0.00',
    currency,
    cancellationCopy: `Free cancellation before ${previousDayCopy(requestedDate)}, 11:59pm property local time.`,
    paymentCopy: 'Payment details are securely stored. Your card is only charged once the venue issues your pass.',
  }

  const metadata = (user?.user_metadata ?? {}) as Record<string, string>
  const fullName = metadata.full_name ?? metadata.name ?? ''
  const [firstName = '', ...rest] = fullName.split(' ')
  const lastName = metadata.last_name ?? rest.join(' ')

  const contactDefaults = {
    firstName: metadata.first_name ?? firstName,
    lastName,
    phone: metadata.phone ?? '',
    email: user?.email ?? metadata.email ?? '',
  }

  const authParams = new URLSearchParams({
    passId,
    date: requestedDate,
    partySize: String(partySize),
  })
  if (arrivalTime) {
    authParams.set('arrivalTime', arrivalTime)
  }
  if (notes) {
    authParams.set('notes', notes)
  }
  const serializedGuestAges = serializeGuestAges(guestAgeValues)
  if (serializedGuestAges) {
    authParams.set('guestAges', serializedGuestAges)
  } else if (partyAgeNote) {
    authParams.set('partyAge', partyAgeNote)
  }
  const authRedirectTarget = `/app/request?${authParams.toString()}`
  const authRedirectUrl = `/auth?next=${encodeURIComponent(authRedirectTarget)}`

  return (
    <RequestFlow
      summary={summary}
      contactDefaults={contactDefaults}
      passId={passId}
      dateIso={requestedDate}
      partySize={partySize}
      arrivalTime={arrivalTime}
      guestAges={guestAgeValues}
      isAuthenticated={Boolean(user)}
      authRedirectUrl={authRedirectUrl}
    />
  )
}

const ADULT_AGE_TOKEN = '30'

function normalizeGuestAges(raw: string | undefined, expectedCount: number) {
  if (!raw) return Array.from({ length: expectedCount }, (_, index) => (index === 0 ? ADULT_AGE_TOKEN : ADULT_AGE_TOKEN))
  const parts = raw.split(',').map((value) => sanitizeAgeValue(value))
  const limited = parts.slice(0, expectedCount)
  while (limited.length < expectedCount) {
    limited.push(ADULT_AGE_TOKEN)
  }
  if (!limited[0]) {
    limited[0] = ADULT_AGE_TOKEN
  }
  return limited
}

function sanitizeAgeValue(value: string | undefined | null) {
  if (!value) return ''
  const digits = value.replace(/[^\d]/g, '')
  if (!digits) return ''
  const numeric = Math.min(Number(digits), 120)
  return Number.isNaN(numeric) ? '' : String(numeric)
}

function buildGuestAgeDetails(values: string[]) {
  const hasAny = values.some((value) => value)
  if (!hasAny) return []
  return values.map((value, index) => `Guest ${index + 1}: ${value || '—'}`)
}

function serializeGuestAges(values: string[]) {
  const sanitized = values.map((value) => sanitizeAgeValue(value))
  if (!sanitized.some((value) => value)) {
    return ''
  }
  return sanitized.join(',')
}
