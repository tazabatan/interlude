'use client'

import type { MouseEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPassLabel, formatPassPrice, pickPassImage } from '@/lib/passes/helpers'

export type PassCardStatus = 'active' | 'paused' | 'draft'

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
  status?: PassCardStatus
  imageUrl?: string | null
  pricePrefix?: string
  showSubtitle?: boolean
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

const DEFAULT_LOCATION = 'ANGUILLA'
const STATUS_STYLES: Record<PassCardStatus, string> = {
  active: 'bg-[#D0F3EA] text-[#0D6B56]',
  paused: 'bg-[#FCE1E1] text-[#B4231F]',
  draft: 'bg-[#E7E3F4] text-[#4A3B84]',
}

const STATUS_LABELS: Record<PassCardStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  draft: 'Draft',
}

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
  showSubtitle = true,
  onClick,
}: PassCardProps) {
  const resolvedName = (name ?? 'Pass').toUpperCase()
  const resolvedLocation = location ?? DEFAULT_LOCATION
  const subtitle = formatPassLabel(kind)
  const price = formatPassPrice(displayPriceText, minSpendAmount, currency, { prefix: pricePrefix })
  const photoSrc = imageUrl ?? pickPassImage(passId)
  const resolvedStatus: PassCardStatus = status ?? 'active'
  const statusClasses = STATUS_STYLES[resolvedStatus]
  const statusLabel = STATUS_LABELS[resolvedStatus]
  const needsUnoptimized = Boolean(
    imageUrl &&
      (imageUrl.startsWith('data:') ||
        imageUrl.startsWith('blob:') ||
        imageUrl.startsWith('http://127.0.0.1') ||
        imageUrl.startsWith('http://localhost') ||
        imageUrl.startsWith('https://127.0.0.1') ||
        imageUrl.startsWith('https://localhost'))
  )

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      event.preventDefault()
      onClick(event)
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="overflow-hidden rounded-[32px] border border-[#E8E4D7] shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
        <Link
          href={href}
          onClick={handleClick}
          className="relative block h-[22rem] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02374D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F1E7]"
        >
          <span className="sr-only">{srLabel}</span>
          <Image
            src={photoSrc}
            alt={name ?? 'Pass'}
            fill
            className="object-cover object-center"
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            unoptimized={needsUnoptimized}
          />
          {showStatusBadge ? (
            <span className={`absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses}`}>
              {statusLabel}
            </span>
          ) : null}
        </Link>
      </div>

      <div className="space-y-2 text-left">
        <h3 className="text-base font-semibold uppercase tracking-[0.08em] text-black">
          {resolvedLocation ? `${resolvedName} — ${resolvedLocation}` : resolvedName}
        </h3>
        {showSubtitle ? (
          <p className="text-sm text-[#6F716D]">
            {subtitle} · {price}
          </p>
        ) : null}
      </div>
    </div>
  )
}
