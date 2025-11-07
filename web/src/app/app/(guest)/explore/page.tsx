import PassCard from '@/components/pass-card'
import { audienceFromRole, fetchExplorePasses } from '@/lib/explore'
import { getUserRole } from '@/lib/get-user-role'

export default async function ExplorePage() {
  const { role } = await getUserRole()
  const audience = audienceFromRole(role)
  const passes = await fetchExplorePasses(audience)

  return (
    <div className="space-y-10 text-[#02374D]">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Explore</p>
        <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">Private passes</h1>
        <p className="text-sm text-[#6F716D]">Pay at the venue. Holds are authorized the afternoon before arrival.</p>
      </header>

      {passes.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#DBD8C9] bg-white/70 px-8 py-16 text-center text-sm text-[#4F514D]">
          No passes are available right now. Check back soon.
        </div>
      ) : (
        <section className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {passes.map((pass) => {
              const displayName = pass.venue?.name ?? pass.kind ?? pass.id
              return (
                <PassCard
                  key={pass.id}
                  passId={pass.id}
                  name={displayName}
                  location="ANGUILLA"
                  kind={pass.kind}
                  displayPriceText={pass.display_price_text}
                  minSpendAmount={pass.min_spend_amount}
                  currency={pass.currency}
                  href={`/app/venue/${pass.id}`}
                  srLabel={`View pass for ${displayName}`}
                  showStatusBadge={false}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
