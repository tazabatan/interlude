import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

export function getSupabaseServer() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptionsWithName) => {
          cookieStore.set({ name, value, ...options })
        },
        remove: (name: string, options: CookieOptionsWithName) => {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function supabaseServer() {
  return getSupabaseServer()
}
