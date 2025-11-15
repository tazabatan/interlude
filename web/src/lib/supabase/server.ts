import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

export async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptionsWithName) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Ignore errors during rendering - cookies can only be modified in Server Actions or Route Handlers
          }
        },
        remove: (name: string, options: CookieOptionsWithName) => {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          } catch (error) {
            // Ignore errors during rendering - cookies can only be modified in Server Actions or Route Handlers
          }
        },
      },
    }
  )
}

export async function supabaseServer() {
  return getSupabaseServer()
}
