import Image from 'next/image'
import Link from 'next/link'
import { getPassHeroImageUrl } from '@/lib/desk'
import { audienceFromRole, derivePresentationKind, fetchExplorePasses, fetchPassPopularityCounts } from '@/lib/explore'
import { getUserRole } from '@/lib/get-user-role'
import { formatTimezoneLabel } from '@/lib/timezone'
import ExploreClient, { type ExplorePass, type PopularPassGroup } from './explore-client'

export default async function ExplorePage() {
  const { role } = await getUserRole()
  const audience = audienceFromRole(role)
  const isGuestAudience = audience === 'guest'

  const passes = await fetchExplorePasses(audience)
  const popularityRows = await fetchPassPopularityCounts()

  const popularityMap = new Map<string, number>()
  popularityRows.forEach((row) => {
    if (!row.pass_id) return
    const count = typeof row.count === 'number' ? row.count : Number(row.count ?? 0)
    popularityMap.set(row.pass_id, Number.isFinite(count) ? count : 0)
  })

  type PassWithMeta = ExplorePass & { popularityScore: number; originalIndex: number }
  const explorePasses: PassWithMeta[] = passes.map((pass, index) => {
    const presentationKind = derivePresentationKind(pass)
    const fallbackAmount = pass.min_spend_amount ?? pass.profile?.prepaidCreditAmountCents ?? null
    const heroMeta = (pass.profile as { heroImage?: { focalX?: number | null; focalY?: number | null; zoom?: number | null } } | null)
      ?.heroImage
    return {
      id: pass.id,
      name: pass.venue?.name ?? presentationKind ?? 'Private Pass',
      location: pass.venue?.tz ? formatTimezoneLabel(pass.venue.tz) : null,
      kind: presentationKind,
      displayPriceText: pass.display_price_text,
      minSpendAmount: fallbackAmount,
      currency: pass.currency,
      imageUrl: getPassHeroImageUrl(pass),
      focalX: heroMeta?.focalX ?? null,
      focalY: heroMeta?.focalY ?? null,
      zoom: heroMeta?.zoom ?? null,
      popularityScore: popularityMap.get(pass.id) ?? 0,
      originalIndex: index,
    }
  })

  const sortByPopularity = (list: PassWithMeta[]) =>
    [...list].sort((a, b) => {
      if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore
      return a.originalIndex - b.originalIndex
    })

  const ensureLagunaInThirdPosition = (list: PassWithMeta[]) => {
    const lagunaIndex = list.findIndex((pass) => (pass.name ?? '').toLowerCase().includes('laguna'))
    if (lagunaIndex === -1 || lagunaIndex === 2 || list.length < 3) return list

    const reordered = [...list]
    const [lagunaPass] = reordered.splice(lagunaIndex, 1)
    reordered.splice(2, 0, lagunaPass)
    return reordered
  }

  const stripMeta = ({ popularityScore: _popularity, originalIndex: _index, ...pass }: PassWithMeta): ExplorePass => pass

  const popularGroups: PopularPassGroup[] = [
    {
      key: 'hotel',
      title: 'Hotel day access',
      description: 'Beach clubs, pool decks, and spa escapes.',
      passes: ensureLagunaInThirdPosition(
        sortByPopularity(
          explorePasses.filter((pass) => {
            const kind = pass.kind?.toUpperCase()
            return kind !== 'BOAT_DAY' && kind !== 'PRIVATE_CHEF'
          })
        )
      )
        .slice(0, 3)
        .map(stripMeta),
    },
    {
      key: 'boat',
      title: 'Boat day passes',
      description: 'Crewed boats and yachts for the day.',
      passes: sortByPopularity(explorePasses.filter((pass) => pass.kind?.toUpperCase() === 'BOAT_DAY'))
        .slice(0, 3)
        .map(stripMeta),
    },
    {
      key: 'chef',
      title: 'Private chefs',
      description: 'In-villa dining and tasting menus.',
      passes: sortByPopularity(explorePasses.filter((pass) => pass.kind?.toUpperCase() === 'PRIVATE_CHEF'))
        .slice(0, 3)
        .map(stripMeta),
    },
  ]

  return (
    <div className="space-y-16 pb-20 text-[#02374D]">
      <section
        className="relative h-[48rem] overflow-hidden"
        style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}
      >
        <div className="relative h-full w-full">
          <Image
            src="/images/explore-hero-header8-optimized.jpg"
            alt="Private beach with umbrellas overlooking turquoise water"
            fill
            sizes="100vw"
            priority
            className="object-cover object-[center_70%]"
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.38)_0%,rgba(0,0,0,0.24)_45%,rgba(0,0,0,0.14)_70%,rgba(0,0,0,0.08)_85%,rgba(0,0,0,0)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.2)_35%,rgba(0,0,0,0)_75%)]" />

          <div className="absolute inset-0 flex items-center justify-center bg-transparent text-center">
            <div className="w-full max-w-5xl px-6 text-white sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">Day access for the in-between</p>
              <h1 className="mt-5 text-4xl font-normal uppercase leading-tight tracking-[0.05em] text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.48)] sm:text-5xl">
                Access the world&apos;s best hotels. No room required
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90 drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                Book day access to private beaches, rooftop pools, and signature spa rituals for a{' '}
                <strong className="font-semibold text-white">fraction of the room rate.</strong>
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/passes"
                  className="inline-flex items-center justify-center rounded-full border border-white/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                >
                  Find day passes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExploreClient popularGroups={popularGroups} />
    </div>
  )
}
