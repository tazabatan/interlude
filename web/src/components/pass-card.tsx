import Image from 'next/image'
import Link from 'next/link'
import { formatPassLabel, formatPassPrice, pickPassImage } from '@/lib/passes/helpers'

type PassCardProps = {
  passId: string
  name: string | null
  location?: string | null
  kind: string | null
  displayPriceText: string | null
  minSpendAmount: number | null
  currency: string | null
  href: string
  srLabel: string
  showStatusBadge?: boolean
  status?: 'active' | 'paused'
  imageUrl?: string | null
  pricePrefix?: string
}

const DEFAULT_LOCATION = 'ANGUILLA'

export default function PassCard({
  passId,
  name,
  location,
  kind,
  displayPriceText,
  minSpendAmount,
  currency,
  href,
  srLabel,
  showStatusBadge = true,
  status = 'active',
  imageUrl,
  pricePrefix = 'From ',
}: PassCardProps) {
  const resolvedName = (name ?? 'Pass').toUpperCase()
  const resolvedLocation = location ?? DEFAULT_LOCATION
  const subtitle = formatPassLabel(kind)
  const price = formatPassPrice(displayPriceText, minSpendAmount, currency, { prefix: pricePrefix })
  const photoSrc = imageUrl ?? pickPassImage(passId)
  const statusClasses =
    status === 'paused' ? 'bg-[#FCE1E1] text-[#B4231F]' : 'bg-[#D0F3EA] text-[#0D6B56]'

  return (
    <div className="flex flex-col space-y-4">
      <div className="overflow-hidden rounded-[32px] border border-[#E8E4D7] shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <Link
          href={href}
          className="relative block h-[22rem] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1E7]"
        >
          <span className="sr-only">{srLabel}</span>
          <Image
            src={photoSrc}
            alt={name ?? 'Pass'}
            fill
            className="object-cover object-center"
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
          {showStatusBadge ? (
            <span className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses}`}>
              {status === 'paused' ? 'Paused' : 'Active'}
            </span>
          ) : null}
        </Link>
      </div>

      <div className="space-y-2 text-left">
        <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-black">
          {resolvedLocation ? `${resolvedName} — ${resolvedLocation}` : resolvedName}
        </h3>
        <p className="text-sm text-[#6F716D]">
          {subtitle} · {price}
        </p>
      </div>
    </div>
  )
}
