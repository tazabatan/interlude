import type { DeskPass } from '@/lib/desk'
import { PASS_SELECT, fetchPassInventoryByDateRange } from '@/lib/desk'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export type ExploreAudience = 'member' | 'guest' | 'admin'

const VISIBILITY_RULES: Record<ExploreAudience, Set<string>> = {
  member: new Set(['members', 'both']),
  guest: new Set(['guest_only', 'both']),
  admin: new Set(['members', 'guest_only', 'both']),
}

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
