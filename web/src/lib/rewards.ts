'use server'

import { getSupabaseServer } from '@/lib/supabase/server'

type Tier = 'Explorer' | 'Voyager' | 'Navigator'

type TierConfig = {
  name: Tier
  earnRate: number
  minSpendCents: number
  minScans: number
}

type RedemptionRow = {
  redeemed_at: string | null
}

type BookingRow = {
  id: string
  hold_amount: number | null
  pass: {
    min_spend_amount: number | null
  } | null
  redemptions: RedemptionRow[] | RedemptionRow | null
}

type RedemptionEntry = {
  amountCents: number
  redeemedAt: Date
}

type CreditEntry = {
  amountCents: number
  issuedAt: Date
  expiresAt: Date
}

export type MemberRewardsSummary = {
  tier: Tier
  credits: number
  expiringCredits: number
  expiringDays: number
  spend90Days: number
  spendTarget: number
  scans90Days: number
  scansTarget: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const ROLLING_WINDOW_DAYS = 90
const CREDIT_EXPIRY_DAYS = 120
const ROLLING_WINDOW_MS = ROLLING_WINDOW_DAYS * DAY_MS
const CREDIT_EXPIRY_MS = CREDIT_EXPIRY_DAYS * DAY_MS

const voyagerSpendCents = dollarsToCents(readEnvNumber('REWARDS_VOYAGER_SPEND_DOLLARS', 500))
const navigatorSpendCents = dollarsToCents(readEnvNumber('REWARDS_NAVIGATOR_SPEND_DOLLARS', 1000))
const voyagerScans = Math.max(1, readEnvInt('REWARDS_VOYAGER_SCANS', 3))
const navigatorScans = Math.max(voyagerScans + 1, readEnvInt('REWARDS_NAVIGATOR_SCANS', 6))

const REWARD_TIERS: TierConfig[] = [
  { name: 'Explorer', earnRate: 0.01, minSpendCents: 0, minScans: 0 },
  { name: 'Voyager', earnRate: 0.02, minSpendCents: voyagerSpendCents, minScans: voyagerScans },
  { name: 'Navigator', earnRate: 0.03, minSpendCents: navigatorSpendCents, minScans: navigatorScans },
]

export async function fetchMemberRewards(userId?: string | null): Promise<MemberRewardsSummary> {
  if (!userId) {
    return buildEmptySummary()
  }

  const supabase = await getSupabaseServer()
  const response = await supabase
    .from('bookings')
    .select(
      `
        id,
        hold_amount,
        pass:passes(min_spend_amount),
        redemptions(redeemed_at)
      `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (response.error) {
    console.error('fetchMemberRewards failed', response.error)
    throw new Error('Unable to load rewards')
  }

  const rows = (response.data ?? []) as BookingRow[]
  const redemptions = extractRedemptions(rows)
  if (redemptions.length === 0) {
    return buildEmptySummary()
  }

  const creditLedger = buildCreditLedger(redemptions)
  const now = Date.now()
  const recent = redemptions.filter((entry) => entry.redeemedAt.getTime() >= now - ROLLING_WINDOW_MS)
  const spend90DaysCents = recent.reduce((sum, entry) => sum + entry.amountCents, 0)
  const scans90Days = recent.length
  const tierConfig = determineTier(spend90DaysCents, scans90Days)
  const nextTier = getNextTier(tierConfig.name)

  const activeCredits = creditLedger.filter((entry) => entry.expiresAt.getTime() > now)
  const totalCreditCents = activeCredits.reduce((sum, entry) => sum + entry.amountCents, 0)

  const { expiringCredits, expiringDays } = computeExpirySnapshot(activeCredits, now)

  const spendTargetCents = nextTier ? nextTier.minSpendCents : spend90DaysCents || 1
  const scansTargetRaw = nextTier ? nextTier.minScans : Math.max(scans90Days, 1)

  return {
    tier: tierConfig.name,
    credits: centsToWholeDollars(totalCreditCents),
    expiringCredits,
    expiringDays,
    spend90Days: centsToWholeDollars(spend90DaysCents),
    spendTarget: Math.max(centsToWholeDollars(spendTargetCents), 1),
    scans90Days,
    scansTarget: Math.max(scansTargetRaw, 1),
  }
}

function buildEmptySummary(): MemberRewardsSummary {
  const voyagerTier = REWARD_TIERS[1]
  return {
    tier: 'Explorer',
    credits: 0,
    expiringCredits: 0,
    expiringDays: 0,
    spend90Days: 0,
    spendTarget: Math.max(centsToWholeDollars(voyagerTier?.minSpendCents ?? 100), 1),
    scans90Days: 0,
    scansTarget: Math.max(voyagerTier?.minScans ?? 1, 1),
  }
}

function extractRedemptions(rows: BookingRow[]): RedemptionEntry[] {
  const entries: RedemptionEntry[] = []
  for (const booking of rows) {
    const spendCents = resolveBookingSpendCents(booking)
    if (spendCents <= 0) continue
    const redemptionRows = normalizeRedemptionRows(booking.redemptions)
    for (const redemption of redemptionRows) {
      if (!redemption?.redeemed_at) continue
      const redeemedAt = new Date(redemption.redeemed_at)
      if (Number.isNaN(redeemedAt.getTime())) continue
      entries.push({ amountCents: spendCents, redeemedAt })
    }
  }
  return entries.sort((a, b) => a.redeemedAt.getTime() - b.redeemedAt.getTime())
}

function resolveBookingSpendCents(booking: BookingRow) {
  if (typeof booking.pass?.min_spend_amount === 'number') {
    return booking.pass.min_spend_amount
  }
  if (typeof booking.hold_amount === 'number') {
    return booking.hold_amount
  }
  return 0
}

function buildCreditLedger(redemptions: RedemptionEntry[]): CreditEntry[] {
  const ledger: CreditEntry[] = []
  const window: RedemptionEntry[] = []
  let windowSpend = 0

  for (const entry of redemptions) {
    const ts = entry.redeemedAt.getTime()
    const cutoff = ts - ROLLING_WINDOW_MS

    while (window.length > 0 && window[0].redeemedAt.getTime() < cutoff) {
      const removed = window.shift()
      if (removed) {
        windowSpend -= removed.amountCents
      }
    }

    const tier = determineTier(windowSpend, window.length)
    const creditCents = Math.round(entry.amountCents * tier.earnRate)
    if (creditCents > 0) {
      ledger.push({
        amountCents: creditCents,
        issuedAt: entry.redeemedAt,
        expiresAt: new Date(ts + CREDIT_EXPIRY_MS),
      })
    }

    window.push(entry)
    windowSpend += entry.amountCents
  }

  return ledger
}

function computeExpirySnapshot(entries: CreditEntry[], nowMs: number) {
  if (entries.length === 0) {
    return { expiringCredits: 0, expiringDays: 0 }
  }

  const sorted = [...entries].sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
  const soonest = sorted[0]
  const dayKey = soonest.expiresAt.toISOString().slice(0, 10)
  const totalSoonestCents = sorted
    .filter((entry) => entry.expiresAt.toISOString().slice(0, 10) === dayKey)
    .reduce((sum, entry) => sum + entry.amountCents, 0)

  const msUntilExpiry = soonest.expiresAt.getTime() - nowMs
  const expiringDays = msUntilExpiry <= 0 ? 0 : Math.max(1, Math.ceil(msUntilExpiry / DAY_MS))

  return {
    expiringCredits: centsToWholeDollars(totalSoonestCents),
    expiringDays,
  }
}

function determineTier(spendCents: number, scans: number): TierConfig {
  let active = REWARD_TIERS[0]
  for (const tier of REWARD_TIERS) {
    if (spendCents >= tier.minSpendCents || scans >= tier.minScans) {
      active = tier
    }
  }
  return active
}

function getNextTier(name: Tier) {
  const index = REWARD_TIERS.findIndex((tier) => tier.name === name)
  if (index === -1) return null
  return REWARD_TIERS[index + 1] ?? null
}

function centsToWholeDollars(value: number) {
  return Math.max(0, Math.round(value / 100))
}

function dollarsToCents(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100)
}

function readEnvNumber(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readEnvInt(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeRedemptionRows(rows: BookingRow['redemptions']) {
  if (!rows) return []
  if (Array.isArray(rows)) return rows
  return [rows]
}
