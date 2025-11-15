import { notFound } from 'next/navigation'
import PassCard from '@/components/pass-card'
import { fetchDeskBookings, fetchVenuePasses, fetchPassInventoryByDateRange, getPassHeroImageUrl } from '@/lib/desk'
import { getUserRole } from '@/lib/get-user-role'
import { formatTimezoneLabel } from '@/lib/timezone'

type PassControl = {
  passId: string
  name: string
  location: string
  kind: string | null
  displayPriceText: string | null
  minSpendAmount: number | null
  currency: string | null
  tz: string
  autoApprove: boolean
  defaultStart: string
  defaultMinutes: number
  isPaused: boolean
  imageUrl: string | null
}

function formatPassControls(passRows: Awaited<ReturnType<typeof fetchDeskBookings>>[]) {
  const map = new Map<string, PassControl>()
  passRows.flat().forEach((booking) => {
    if (booking.pass && !map.has(booking.pass_id)) {
      const venueName = booking.pass.venue?.name ?? 'Unnamed Venue'
      const tz = booking.pass.venue?.tz ?? 'America/Anguilla'
      const destination = formatTimezoneLabel(tz)
      map.set(booking.pass_id, {
        passId: booking.pass_id,
        name: venueName,
        location: destination,
        kind: booking.pass.kind,
        displayPriceText: booking.pass.display_price_text,
        minSpendAmount: booking.pass.min_spend_amount ?? booking.pass.profile?.prepaidCreditAmountCents ?? null,
        currency: booking.pass.currency,
        tz,
        autoApprove: booking.pass.auto_approve_enabled,
        defaultStart: booking.pass.default_arrival_start_local ?? '12:00',
        defaultMinutes: booking.pass.default_arrival_window_minutes ?? 60,
        isPaused: false,
        imageUrl: getPassHeroImageUrl(booking.pass),
      })
    }
  })
  return Array.from(map.values())
}

export default async function DeskPassesPage() {
  const today = new Date().toISOString().slice(0, 10)

  const { user } = await getUserRole()
  const venueId = user?.user_metadata?.venue_id as string | undefined
  if (!venueId) {
    notFound()
  }

  // Fetch bookings filtered by venue
  const data = await Promise.all([
    fetchDeskBookings('requested', venueId),
    fetchDeskBookings('pending_verification', venueId)
  ])
  let passControls = formatPassControls(data)

  if (passControls.length === 0) {
    if (venueId) {
      const passes = await fetchVenuePasses(venueId)
      passControls = passes.map((pass) => {
        const venueName = pass.venue?.name ?? 'Unnamed Venue'
        const tz = pass.venue?.tz ?? 'America/Anguilla'
        const destination = formatTimezoneLabel(tz)
        return {
          passId: pass.id,
          name: venueName,
          location: destination,
          kind: pass.kind,
          displayPriceText: pass.display_price_text ?? null,
          minSpendAmount: pass.min_spend_amount ?? pass.profile?.prepaidCreditAmountCents ?? null,
          currency: pass.currency ?? null,
          tz,
          autoApprove: pass.auto_approve_enabled,
          defaultStart: pass.default_arrival_start_local ?? '12:00',
          defaultMinutes: pass.default_arrival_window_minutes ?? 60,
          isPaused: false,
          imageUrl: getPassHeroImageUrl(pass),
        }
      })
    }
  }

  // Fetch today's inventory to check paused status
  const inventory = await fetchPassInventoryByDateRange(today, today, venueId)
  const pausedPassIds = new Set(inventory.filter((inv) => inv.paused).map((inv) => inv.pass_id))

  // Update passControls with paused status
  passControls = passControls.map((control) => ({
    ...control,
    isPaused: pausedPassIds.has(control.passId),
  }))

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-12 px-4 text-[#02374D] sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[92rem]">
      <header className="text-center">
        <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">Your passes</h1>
      </header>

      {passControls.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#DBD8C9] bg-white/70 px-12 py-16 text-center text-sm text-[#4F514D]">
          Pass controls will appear once bookings exist for this venue.
        </div>
      ) : (
        <ControlsSection controls={passControls} />
      )}
    </div>
  )
}

function ControlsSection({ controls }: { controls: PassControl[] }) {
  return (
    <section className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {controls
          .filter((control) => Boolean(control.passId))
          .map((control) => (
            <PassCard
              key={control.passId}
              passId={control.passId}
              name={control.name}
              location={control.location}
              kind={control.kind}
              displayPriceText={control.displayPriceText}
              minSpendAmount={control.minSpendAmount}
              currency={control.currency}
              href={`/desk/passes/${control.passId}`}
              srLabel={`View pass controls for ${control.name}`}
              showStatusBadge
              status={control.isPaused ? 'paused' : 'active'}
              imageUrl={control.imageUrl ?? undefined}
              pricePrefix=""
            />
          ))}
      </div>
    </section>
  )
}
