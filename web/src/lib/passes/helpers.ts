const PASS_PLACEHOLDER_IMAGES = [
  '/venue-photos/4655308-beachfront-five-bedroom-pool-villa-belmond-cap-juluca.jpg',
  '/venue-photos/Fb-2.png',
  '/venue-photos/Screenshot 2025-10-29 at 17.48.44.png',
  '/venue-photos/Screenshot 2025-10-29 at 17.48.52.png',
  '/venue-photos/Screenshot 2025-10-29 at 17.49.28.png',
  '/venue-photos/Screenshot 2025-11-07 at 13.25.25.png',
  '/venue-photos/belmond-cap-juluca.jpg',
] as const

type LabelOptions = {
  detail?: boolean
}

const PASS_KIND_LABELS: Record<string, { base: string; detail?: string }> = {
  BEACH_PASS: { base: 'Beach Club Pass' },
  POOL_PASS: { base: 'Pool Pass' },
  GYM_PASS: { base: 'Gym Pass' },
  SPA_PASS: { base: 'Spa Pass' },
  MIN_SPEND: { base: 'Beach Club Pass', detail: 'Beach Club Pass — Min-spend' },
  DAY_PASS: { base: 'Pool Pass', detail: 'Day Pass — Hotel' },
}

export function formatPassLabel(kind: string | null, options: LabelOptions = {}) {
  const detail = options.detail ?? false
  if (kind) {
    const entry = PASS_KIND_LABELS[kind]
    if (entry) {
      return detail ? entry.detail ?? entry.base : entry.base
    }
  }
  return detail ? 'Private Pass' : 'Private Pass'
}

export function formatPassPrice(
  displayText: string | null,
  amountCents: number | null,
  currency: string | null,
  options: { prefix?: string } = {}
) {
  const prefix = options.prefix ?? ''

  // When using a prefix (like "From "), always use the amount calculation instead of displayText
  if (prefix) {
    if (typeof amountCents === 'number') {
      try {
        const value = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: (currency ?? 'USD').toUpperCase(),
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amountCents / 100)
        return `${prefix}${value}`
      } catch {
        return `${prefix}$—`
      }
    }
    // If prefix but no amount, return placeholder
    return `${prefix}$—`
  }

  // No prefix - use displayText if available, otherwise format amount
  if (displayText) {
    const trimmed = displayText.trim()
    const numericCandidate = Number(trimmed.replace(/,/g, ''))
    if (trimmed && !Number.isNaN(numericCandidate) && currency) {
      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: (currency ?? 'USD').toUpperCase(),
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numericCandidate)
      } catch {
        // fall through to returning trimmed display text
      }
    }
    return trimmed
  }
  if (typeof amountCents === 'number') {
    try {
      const value = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: (currency ?? 'USD').toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amountCents / 100)
      return value
    } catch {
      return '$—'
    }
  }
  return '$—'
}

export function pickPassImage(seed: string) {
  if (PASS_PLACEHOLDER_IMAGES.length === 0) return ''
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % PASS_PLACEHOLDER_IMAGES.length
  return PASS_PLACEHOLDER_IMAGES[index]
}
