'use client'

import { useMemo, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import PassCard from '@/components/pass-card'

export type ExplorePass = {
  id: string
  name: string | null
  location: string | null
  kind: string | null
  displayPriceText: string | null
  minSpendAmount: number | null
  currency: string | null
  imageUrl: string | null
  focalX?: number | null
  focalY?: number | null
  zoom?: number | null
}

type ExperienceFilter = 'all' | 'beach' | 'pool' | 'spa' | 'gym'

const EXPERIENCE_OPTIONS: Array<{
  key: ExperienceFilter
  label: string
  icon: string
  kinds: string[] | null
}> = [
  { key: 'all', label: 'All', icon: '/images/hotel-icon.png', kinds: null },
  { key: 'beach', label: 'Beach', icon: '/images/beach-pass-icon.png', kinds: ['BEACH_PASS', 'MIN_SPEND'] },
  { key: 'pool', label: 'Pool', icon: '/images/pool-pass-icon.png', kinds: ['POOL_PASS', 'DAY_PASS'] },
  { key: 'spa', label: 'Spa', icon: '/images/spa-pass-icon.png', kinds: ['SPA_PASS'] },
  { key: 'gym', label: 'Gym', icon: '/images/gym-pass-icon.png', kinds: ['GYM_PASS'] },
]

const SEARCH_FIELDS = [
  { label: 'Destination', placeholder: 'Where would you like to go?' },
  { label: 'Dates', placeholder: 'When would you like to visit?' },
]

export default function PassesClient({ passes }: { passes: ExplorePass[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const experience = (searchParams.get('experience') as ExperienceFilter) ?? 'all'
  const searchQuery = searchParams.get('search') ?? ''

  const [destination, setDestination] = useState('')
  const [dates, setDates] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const activeOption = EXPERIENCE_OPTIONS.find((option) => option.key === experience) ?? EXPERIENCE_OPTIONS[0]

  const filteredPasses = useMemo(() => {
    let filtered = passes

    // Filter by experience type
    if (experience !== 'all') {
      const allowedKinds = activeOption.kinds ?? []
      filtered = filtered.filter((pass) => (pass.kind ? allowedKinds.includes(pass.kind) : false))
    }

    // Filter by search query with fuzzy matching
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((pass) => {
        const name = pass.name?.toLowerCase().trim() ?? ''
        const location = pass.location?.toLowerCase().trim() ?? ''
        const kind = pass.kind?.toLowerCase().trim() ?? ''

        // Exact or partial match
        if (name.includes(searchLower) || location.includes(searchLower) || kind.includes(searchLower)) {
          return true
        }

        // Fuzzy match - check if search chars appear in order
        const fuzzyMatch = (text: string, search: string): boolean => {
          let searchIndex = 0
          for (let i = 0; i < text.length && searchIndex < search.length; i++) {
            if (text[i] === search[searchIndex]) {
              searchIndex++
            }
          }
          return searchIndex === search.length
        }

        return fuzzyMatch(name, searchLower) || fuzzyMatch(location, searchLower)
      })
    }

    return filtered
  }, [experience, searchQuery, passes, activeOption])

  const handleExperienceClick = (key: ExperienceFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('experience', key)
    router.push(`/app/passes?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    const trimmedDestination = destination.trim()
    if (trimmedDestination) {
      params.set('search', trimmedDestination)
    }
    router.push(`/app/passes?${params.toString()}`)
  }

  return (
    <section className="space-y-24">
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-2 md:hidden">
          {EXPERIENCE_OPTIONS.map((option) => {
            const isActive = option.key === experience
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleExperienceClick(option.key)}
                className={`flex flex-1 flex-col items-center gap-1 border-b-2 pb-3 text-center text-[0.6rem] font-semibold uppercase tracking-[0.3em] transition ${
                  isActive
                    ? 'border-[#02374D] text-[#02374D]'
                    : 'border-transparent text-[#A1A09B] hover:text-[#4F514D]'
                }`}
              >
                <div className="flex h-16 items-center justify-center">
                  <Image
                    src={option.icon}
                    alt={`${option.label} icon`}
                    width={72}
                    height={72}
                    className={option.key === 'all' ? 'h-14 w-14' : 'h-12 w-12'}
                  />
                </div>
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-center">
          <div className="hidden md:flex md:items-center md:gap-8">
            {EXPERIENCE_OPTIONS.map((option) => {
              const isActive = option.key === experience
              const iconSize = option.key === 'all' ? 96 : 64
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleExperienceClick(option.key)}
                  className={`flex items-center gap-9 border-b-2 pb-2 transition ${
                    isActive
                      ? 'border-[#02374D] text-[#02374D]'
                      : 'border-transparent text-[#A1A09B] hover:text-[#4F514D]'
                  }`}
                >
                  <div className={`flex flex-shrink-0 items-center justify-center ${option.key === 'all' ? 'h-24 w-24' : 'h-16 w-16'}`}>
                    <Image
                      src={option.icon}
                      alt={`${option.label} icon`}
                      width={iconSize}
                      height={iconSize}
                      className={option.key === 'all' ? 'h-24 w-24' : 'h-16 w-16'}
                    />
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.3em] text-current">
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex w-full flex-col overflow-hidden rounded-[36px] border border-[#E8E4D7] bg-white shadow-[0px_18px_60px_rgba(0,0,0,0.08)] md:w-auto md:flex-row">
            <div className="flex flex-1 flex-col gap-1 px-6 py-5 md:min-w-[16rem] md:px-8 md:py-7">
              <label className="whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-black">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where would you like to go?"
                className="whitespace-nowrap text-base text-[#6F716D] outline-none placeholder:text-[#6F716D]"
              />
            </div>
            <div
              onClick={() => dateInputRef.current?.showPicker()}
              className="flex flex-1 cursor-pointer flex-col gap-1 border-t border-[#EFE9DC] px-6 py-5 md:min-w-[16rem] md:border-l md:border-t-0 md:px-8 md:py-7"
            >
              <span className="whitespace-nowrap text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-black">
                Dates
              </span>
              <input
                ref={dateInputRef}
                type="date"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="When would you like to visit?"
                className="w-full whitespace-nowrap text-base text-[#6F716D] outline-none placeholder:text-[#6F716D] [color-scheme:light]"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="flex w-full items-center justify-center border-t border-[#EFE9DC] bg-[#02374D] px-8 py-5 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-[#02486A] md:w-auto md:rounded-b-none md:rounded-r-[36px] md:border-l md:border-t-0"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[0.65rem] uppercase tracking-[0.35em] text-[#6F716D]">
          <span>CURATED VENUES</span>
          <span className="text-[#C3C0B2]">•</span>
          <span>TRANSPARENT PRICING</span>
          <span className="text-[#C3C0B2]">•</span>
          <span>FAST APPROVAL</span>
        </div>
      </div>

      <section id="popular-passes" className="mt-16 space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Popular Passes</p>
          <h2 className="text-3xl font-normal uppercase tracking-[0.02em] text-black">Plan the perfect day</h2>
        </div>

        {filteredPasses.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#DBD8C9] bg-white/80 px-8 py-16 text-center text-sm text-[#4F514D]">
            No passes match this experience yet. Try another filter.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPasses.map((pass) => (
              <PassCard
                key={pass.id}
                passId={pass.id}
                name={pass.name}
                location={pass.location}
                kind={pass.kind}
                displayPriceText={pass.displayPriceText}
                minSpendAmount={pass.minSpendAmount}
                currency={pass.currency}
                href={`/app/venue/${pass.id}`}
                srLabel={`View pass for ${pass.name ?? 'pass'}`}
                showStatusBadge={false}
                imageUrl={pass.imageUrl}
                focalX={pass.focalX ?? undefined}
                focalY={pass.focalY ?? undefined}
                zoom={pass.zoom ?? undefined}
                pricePrefix={pass.kind === 'MIN_SPEND' ? '' : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
