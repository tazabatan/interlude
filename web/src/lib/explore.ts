import type { DeskPass } from '@/lib/desk'
import { PASS_SELECT, fetchPassInventoryByDateRange } from '@/lib/desk'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export type ExploreAudience = 'member' | 'guest' | 'admin'

const VISIBILITY_RULES: Record<ExploreAudience, Set<string>> = {
  member: new Set(['members', 'both']),
  guest: new Set(['guest_only', 'both']),
  admin: new Set(['members', 'guest_only', 'both']),
}

const CONCIERGE_PROVIDER_TYPES = new Set(['private_chef', 'boat_company'])
const CONCIERGE_KINDS = new Set(['PRIVATE_CHEF', 'BOAT_DAY'])

export function audienceFromRole(role: string | null | undefined): ExploreAudience {
  if (role === 'guest') return 'guest'
  if (role === 'admin') return 'admin'
  return 'member'
}

export function isVisibleForAudience(visibility: string | null, audience: ExploreAudience) {
  const audienceSet = VISIBILITY_RULES[audience] ?? VISIBILITY_RULES.member
  if (!visibility) return false
  return audienceSet.has(visibility)
}

export function isPassActive(pass: Pick<DeskPass, 'status'>) {
  return (pass.status ?? 'active').toLowerCase() === 'active'
}

export function derivePresentationKind(pass: DeskPass) {
  const providerType = pass.venue?.provider_type?.toLowerCase?.()
  if (providerType === 'boat_company') return 'BOAT_DAY'
  if (providerType === 'private_chef') return 'PRIVATE_CHEF'

  const profileKind = (pass.profile as { presentationKind?: string | null } | null)?.presentationKind
  if (profileKind) return profileKind
  return pass.kind ?? null
}

export async function fetchExplorePasses(audience: ExploreAudience) {
  const today = new Date().toISOString().slice(0, 10)

  const [passResponse, inventory] = await Promise.all([
    serviceRoleFetch(`/rest/v1/passes?order=created_at.asc&select=${encodeURIComponent(PASS_SELECT)}`),
    fetchPassInventoryByDateRange(today, today),
  ])

  const pausedPassIds = new Set(inventory.filter((inv) => inv.paused).map((inv) => inv.pass_id))
  const passes = (await passResponse.json()) as DeskPass[]

  return passes.filter((pass) => {
    const isActive = isPassActive(pass)
    const visible = isVisibleForAudience(pass.visibility, audience)
    const isPaused = pausedPassIds.has(pass.id)
    return isActive && visible && !isPaused
  })
}

export function isConciergeProvider(pass: DeskPass) {
  const providerType = pass.venue?.provider_type?.toLowerCase?.() ?? ''
  if (CONCIERGE_PROVIDER_TYPES.has(providerType)) return true
  const derived = derivePresentationKind(pass)
  return derived ? CONCIERGE_KINDS.has(derived) : false
}

export function isStandardProvider(pass: DeskPass) {
  return !isConciergeProvider(pass)
}
