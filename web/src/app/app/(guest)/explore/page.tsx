import Image from 'next/image'
import Link from 'next/link'
import { getPassHeroImageUrl } from '@/lib/desk'
import { audienceFromRole, derivePresentationKind, fetchExplorePasses } from '@/lib/explore'
import { getUserRole } from '@/lib/get-user-role'
import { formatTimezoneLabel } from '@/lib/timezone'
import ExploreClient, { type ExplorePass } from './explore-client'

export default async function ExplorePage() {
  const { role } = await getUserRole()
  const audience = audienceFromRole(role)
  const isGuestAudience = audience === 'guest'
  const passes = await fetchExplorePasses(audience)

  const explorePasses: ExplorePass[] = passes.map((pass) => {
    const presentationKind = derivePresentationKind(pass)
    const fallbackAmount = pass.min_spend_amount ?? pass.profile?.prepaidCreditAmountCents ?? null
    return {
      id: pass.id,
      name: pass.venue?.name ?? presentationKind ?? 'Private Pass',
      location: pass.venue?.tz ? formatTimezoneLabel(pass.venue.tz) : null,
      kind: presentationKind,
      displayPriceText: pass.display_price_text,
      minSpendAmount: fallbackAmount,
      currency: pass.currency,
      imageUrl: getPassHeroImageUrl(pass),
    }
  })

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
                Access the world&apos;s best hotels — no room required
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/90 drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                Book day access to private beaches, rooftop pools, and signature spa rituals for a{' '}
                <strong className="font-semibold text-white">fraction of the room rate.</strong>
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                {isGuestAudience ? (
                  <Link
                    href="/auth?mode=signup"
                    className="inline-flex items-center justify-center rounded-full border border-white/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                  >
                    Become a member
                  </Link>
                ) : (
                  <Link
                    href="/app/passes"
                    className="inline-flex items-center justify-center rounded-full border border-white/80 px-6 py-3 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:border-white hover:bg-white/10"
                  >
                    Find day passes
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExploreClient passes={explorePasses} />
    </div>
  )
}
