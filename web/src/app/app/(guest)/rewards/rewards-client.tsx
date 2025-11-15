'use client'

type Tier = 'Explorer' | 'Voyager' | 'Navigator'

type RewardsData = {
  tier: Tier
  credits: number
  expiringCredits: number
  expiringDays: number
  spend90Days: number
  spendTarget: number
  scans90Days: number
  scansTarget: number
}

const TIER_BENEFITS = {
  Explorer: {
    earnRate: '1%',
    earlyAccess: null,
  },
  Voyager: {
    earnRate: '2%',
    earlyAccess: '+24 hours',
  },
  Navigator: {
    earnRate: '3%',
    earlyAccess: '+48 hours',
  },
}

const TIER_ORDER: Tier[] = ['Explorer', 'Voyager', 'Navigator']

export default function RewardsClient({ data }: { data: RewardsData }) {
  const currentTierIndex = TIER_ORDER.indexOf(data.tier)
  const nextTier = currentTierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[currentTierIndex + 1] : null
  const benefits = TIER_BENEFITS[data.tier]
  const nextBenefits = nextTier ? TIER_BENEFITS[nextTier] : null

  const spendProgress = (data.spend90Days / data.spendTarget) * 100
  const scansProgress = (data.scans90Days / data.scansTarget) * 100

  const maxProgress = Math.max(spendProgress, scansProgress)
  const creditDisplay = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(data.credits)

  return (
    <div className="space-y-24 pb-32">
      {/* Minimal Level Progress */}
      {nextTier && (
        <div className="mx-auto flex max-w-4xl items-center gap-6">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-[#02374D]">
            {data.tier}
          </span>
          <div className="flex-1">
            <div className="h-1 overflow-hidden rounded-full bg-[#E8E4D7]">
              <div
                className="h-full rounded-full bg-[#02374D] transition-all"
                style={{ width: `${Math.min(maxProgress, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6F716D]">
            {nextTier}
          </span>
        </div>
      )}

      {/* Hero + How It Works */}
      <div className="space-y-12">
        <section className="space-y-12 text-center">
          <div className="space-y-4">
            <h1 className="text-3xl font-normal uppercase tracking-[0.05em] text-[#02374D]">
              {data.tier} Member
            </h1>
            <p className="text-5xl font-normal uppercase tracking-[0.05em] text-black">
              {creditDisplay} <span className="text-[#6F716D]">Interlude Credit</span>
            </p>
            {data.expiringCredits > 0 && (
              <p className="text-sm text-[#D97706]">
                {data.expiringCredits} credits expire in {data.expiringDays} days
              </p>
            )}
            <p className="text-sm text-[#6F716D]">
              Book exclusive member-only properties
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-12 text-center lg:gap-24">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Earn Rate</p>
              <p className="mt-2 text-3xl font-semibold text-[#02374D]">{benefits.earnRate}</p>
            </div>
            <div className="h-12 w-px bg-[#E8E4D7]" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Book</p>
              <p className="mt-2 text-xl font-semibold uppercase tracking-[0.02em] text-[#02374D]">Members Only Properties</p>
            </div>
            {benefits.earlyAccess && (
              <>
                <div className="h-12 w-px bg-[#E8E4D7]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Early Access</p>
                  <p className="mt-2 text-3xl font-semibold text-[#02374D]">{benefits.earlyAccess}</p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-[#02374D] bg-transparent px-10 py-4 text-xs font-semibold uppercase tracking-[0.4em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
          >
            Use Credits
          </button>
        </section>

        {/* How It Works Card */}
        <aside className="mx-auto max-w-3xl rounded-[32px] bg-[#02374D] shadow-[0px_18px_60px_rgba(0,0,0,0.08)]">
          <div className="space-y-6 p-8">
            <h2 className="text-xl font-normal uppercase tracking-[0.05em] text-white">How rewards work</h2>
            <ul className="space-y-3 text-sm leading-relaxed text-white/85">
            <li className="flex gap-3">
              <span className="mt-0.5">•</span>
              <span className="flex-1">Only direct members earn.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5">•</span>
              <span className="flex-1">
                Explorer/Voyager/Navigator members can see and book member-exclusive properties; guests can't.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5">•</span>
              <span className="flex-1">
                Earn 1/2/3% of the purchase price on all direct bookings. Credits are issued when your QR is scanned.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5">•</span>
              <span className="flex-1">
                Use credits on any future direct booking to reduce Interlude's fee (never the partner's price). Credits expire after 120 days.
              </span>
            </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
