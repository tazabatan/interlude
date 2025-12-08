import { getPassHeroImageUrl } from '@/lib/desk'
import { audienceFromRole, derivePresentationKind, fetchExplorePasses, isStandardProvider } from '@/lib/explore'
import { getUserRole } from '@/lib/get-user-role'
import { formatTimezoneLabel } from '@/lib/timezone'
import PassesClient, { type ExplorePass } from './passes-client'

export default async function PassesPage() {
  const { role } = await getUserRole()
  const audience = audienceFromRole(role)
  const passes = (await fetchExplorePasses(audience)).filter(isStandardProvider)

  const explorePasses: ExplorePass[] = passes.map((pass) => {
    const presentationKind = derivePresentationKind(pass)
    const fallbackAmount = pass.min_spend_amount ?? pass.profile?.prepaidCreditAmountCents ?? null
    const heroMeta = (pass.profile as { heroImage?: { focalX?: number | null; focalY?: number | null; zoom?: number | null } } | null)
      ?.heroImage
    return {
      id: pass.id,
      name: pass.venue?.name ?? pass.kind ?? 'Private Pass',
      location: pass.venue?.tz ? formatTimezoneLabel(pass.venue.tz) : null,
      kind: presentationKind,
      displayPriceText: pass.display_price_text,
      minSpendAmount: fallbackAmount,
      currency: pass.currency,
      imageUrl: getPassHeroImageUrl(pass),
      focalX: heroMeta?.focalX ?? null,
      focalY: heroMeta?.focalY ?? null,
      zoom: heroMeta?.zoom ?? null,
    }
  })

  return (
    <div className="pb-20 text-[#02374D]">
      <PassesClient passes={explorePasses} />
    </div>
  )
}
