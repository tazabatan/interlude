import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

function parseAuthCookie(value: string) {
  const base64Prefix = 'base64-'
  let raw = value
  if (raw.startsWith(base64Prefix)) {
    let payload = raw.slice(base64Prefix.length)
    payload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = payload.length % 4
    if (pad) payload = payload.padEnd(payload.length + (4 - pad), '=')
    try {
      raw = Buffer.from(payload, 'base64').toString('utf-8')
    } catch {
      try {
        raw = atob(payload)
      } catch {
        return null
      }
    }
  }

  try {
    return JSON.parse(raw) as { refresh_token?: string | null }
  } catch {
    return null
  }
}

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const filteredCookies = allCookies.filter((cookie) => {
    // Only clean Supabase auth cookies that are clearly invalid
    if (!/^sb-.*-auth-token$/.test(cookie.name)) return true
    const parsed = parseAuthCookie(cookie.value)
    // Keep cookies that have a refresh token; drop invalid/malformed ones
    return Boolean(parsed?.refresh_token)
  })

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return filteredCookies
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function supabaseServer() {
  return getSupabaseServer()
}
