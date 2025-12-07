import { getPassHeroImageUrl } from '@/lib/desk'
import { audienceFromRole, fetchExplorePasses } from '@/lib/explore'
import { getUserRole } from '@/lib/get-user-role'
import { formatTimezoneLabel } from '@/lib/timezone'
import ConciergeClient, { type ConciergePass } from './concierge-client'

const CONCIERGE_KINDS = ['PRIVATE_CHEF', 'BOAT_DAY']

export default async function ConciergePage() {
  const { role } = await getUserRole()
  const audience = audienceFromRole(role)
  const passes = await fetchExplorePasses(audience)

  const conciergePasses: ConciergePass[] = passes
    .filter((pass) => (pass.kind ? CONCIERGE_KINDS.includes(pass.kind) : false))
    .map((pass) => {
      const fallbackAmount = pass.min_spend_amount ?? pass.profile?.prepaidCreditAmountCents ?? null
      return {
        id: pass.id,
        name: pass.venue?.name ?? pass.kind ?? 'Concierge',
        location: pass.venue?.tz ? formatTimezoneLabel(pass.venue.tz) : null,
        kind: pass.kind,
        displayPriceText: pass.display_price_text,
        minSpendAmount: fallbackAmount,
        currency: pass.currency,
        imageUrl: getPassHeroImageUrl(pass),
      }
    })

  return (
    <div className="pb-20 text-[#02374D]">
      <ConciergeClient passes={conciergePasses} />
    </div>
  )
}
