import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'
import { fetchPassById } from '@/lib/desk'
import { formatPassLabel } from '@/lib/passes/helpers'
import { formatRequestedArrival } from '@/lib/arrival'
import RequestFlow from './request-flow'

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
  const arrivalTimeLabel =
    arrivalTime && arrivalTime.trim() ? formatRequestedArrival(arrivalTime) : 'Arrival time TBD'

  const pass = await fetchPassById(passId)
  if (!pass) {
    redirect('/app/explore')
  }

  const currency = (pass.currency ?? 'USD').toUpperCase()
  const venueName = pass.venue?.name ?? 'Unnamed Venue'
  const destination = (pass.venue?.tz ?? 'America/Anguilla').toUpperCase()
  const passLabel = formatPassLabel(pass.kind, { detail: true })
  const priceCents = pass.min_spend_amount ?? 0
  const taxCents = Math.round(priceCents * DEFAULT_TAX_RATE)
  const totalCents = priceCents + taxCents

  const summary = {
    passId,
    dateIso: requestedDate,
    dateDisplay: formatDisplayDate(requestedDate),
    venueName,
    destination,
    arrivalTimeLabel,
    passLabel,
    partySize,
    partySizeLabel: `${partySize} ${partySize === 1 ? 'Adult' : 'Adults'}`,
    priceLabel: formatCurrency(priceCents, currency),
    taxLabel: formatCurrency(taxCents, currency),
    totalLabel: formatCurrency(totalCents, currency),
    dueNowLabel: formatCurrency(0, currency),
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

  const authRedirectTarget = `/app/request?passId=${encodeURIComponent(passId)}&date=${encodeURIComponent(requestedDate)}&partySize=${partySize}`
  const authRedirectUrl = `/auth?next=${encodeURIComponent(authRedirectTarget)}`

  return (
    <RequestFlow
      summary={summary}
      contactDefaults={contactDefaults}
      passId={passId}
      dateIso={requestedDate}
      partySize={partySize}
      arrivalTime={arrivalTime}
      isAuthenticated={Boolean(user)}
      authRedirectUrl={authRedirectUrl}
    />
  )
}
