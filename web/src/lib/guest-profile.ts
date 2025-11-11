import { serviceRoleFetch } from "@/lib/supabase/service-role"

type SupabaseUserRow = {
  id?: string
  email?: string | null
  phone?: string | null
  raw_user_meta_data?: Record<string, unknown> | null
}

export type GuestProfile = {
  name: string
  email: string | null
  phone: string | null
  dietaryNotes: string | null
  loungePreferences: string | null
  contactPreference: string | null
  avatarUrl: string | null
  avatarIsLocal: boolean
}

export function buildGuestProfile(user?: SupabaseUserRow | null): GuestProfile {
  const metadata = ((user?.raw_user_meta_data ?? null) as Record<string, unknown> | null) ?? null
  const email = pickString(metadata?.email) ?? user?.email ?? null
  const phone = pickString(metadata?.phone) ?? (user?.phone ?? null)
  const contactPreference = pickString(metadata?.contact_preference)
  const dietaryNotes = pickString(metadata?.dietary_notes)
  const loungePreferences = pickString(metadata?.lounge_preferences)

  const rawName = pickString(metadata?.full_name) ?? pickString(metadata?.name) ?? ''
  const fallback = email?.split('@')[0] ?? 'Guest'
  const name = rawName.trim() || capitalize(fallback)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
  const avatarValue = pickString(metadata?.avatar_url)
  const avatarUrl = resolveAvatarUrl(avatarValue, supabaseUrl)
  const avatarIsLocal = avatarUrl ? isLocalUrl(avatarUrl) : false

  return {
    name,
    email,
    phone,
    dietaryNotes: dietaryNotes || null,
    loungePreferences: loungePreferences || null,
    contactPreference: contactPreference || null,
    avatarUrl,
    avatarIsLocal,
  }
}

function pickString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return null
}

function capitalize(value: string) {
  if (!value) return 'Guest'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function resolveAvatarUrl(avatarValue: string | null, supabaseUrl: string) {
  if (!avatarValue) return null
  if (avatarValue.startsWith('http://') || avatarValue.startsWith('https://')) {
    return avatarValue
  }
  if (!supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/profile-photos/${avatarValue}`
}

export function isLocalUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}

function normalizeIds(userIds: string[]) {
  return Array.from(new Set(userIds.filter((value): value is string => Boolean(value))))
}

async function fetchAuthUsersByIds(userIds: string[]): Promise<SupabaseUserRow[]> {
  const ids = normalizeIds(userIds)
  if (ids.length === 0) return []
  const params = new URLSearchParams({
    select: 'id,email,phone,raw_user_meta_data',
    id: `in.(${ids.map((id) => `"${id}"`).join(',')})`,
  })
  const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?${params.toString()}`)
  const rows = (await res.json()) as SupabaseUserRow[]
  return rows ?? []
}

export async function fetchGuestProfilesByIds(userIds: string[]): Promise<Record<string, GuestProfile>> {
  const rows = await fetchAuthUsersByIds(userIds)
  const profiles: Record<string, GuestProfile> = {}
  for (const row of rows) {
    if (row.id) {
      profiles[row.id] = buildGuestProfile(row)
    }
  }
  return profiles
}

export async function fetchGuestProfileById(userId?: string | null) {
  if (!userId) return null
  const rows = await fetchAuthUsersByIds([userId])
  const row = rows.find((candidate) => candidate.id === userId)
  return row ? buildGuestProfile(row) : null
}
