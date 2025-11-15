export type PartyCounts = {
  adults: number
  children: number
}

const CHILD_AGE_CUTOFF = 13

function normalizeAge(value: string | number | null | undefined) {
  if (value == null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return clampAge(value)
  }
  const digits = `${value}`.replace(/[^\d]/g, '')
  if (!digits) return null
  const parsed = Number.parseInt(digits, 10)
  if (!Number.isFinite(parsed)) return null
  return clampAge(parsed)
}

function clampAge(age: number) {
  if (age < 0) return 0
  if (age > 120) return 120
  return Math.round(age)
}

export function computePartyCountsFromAges(ages: Array<string | number | null | undefined>): PartyCounts {
  let adults = 0
  let children = 0
  ages.forEach((value) => {
    const normalized = normalizeAge(value)
    if (normalized == null) return
    if (normalized < CHILD_AGE_CUTOFF) {
      children += 1
    } else {
      adults += 1
    }
  })
  return { adults, children }
}

export function formatPartySummary(adults?: number | null, children?: number | null, fallbackSize?: number) {
  const segments: string[] = []
  if (adults && adults > 0) {
    segments.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`)
  }
  if (children && children > 0) {
    segments.push(`${children} ${children === 1 ? 'Child' : 'Children'}`)
  }
  if (segments.length > 0) {
    return `Party of ${segments.join(' and ')}`
  }
  if (typeof fallbackSize === 'number' && fallbackSize > 0) {
    return `Party of ${fallbackSize} ${fallbackSize === 1 ? 'Guest' : 'Guests'}`
  }
  return 'Party details pending'
}
