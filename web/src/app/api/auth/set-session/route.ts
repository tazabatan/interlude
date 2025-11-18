import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json().catch(() => ({}))

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true })
  const setCookies: string[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptionsWithName) => {
          console.log('Setting cookie:', name, 'with options:', options)
          setCookies.push(name)
          response.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: CookieOptionsWithName) => {
          console.log('Removing cookie:', name)
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })

  if (error) {
    console.error('setSession error:', error)
    return NextResponse.json({ error: error.message }, { status: error.status ?? 400 })
  }

  const accessExpiry = 60 * 60 // 1 hour
  const refreshExpiry = 60 * 60 * 24 * 14 // 14 days
  response.cookies.set({
    name: 'sb-access-token',
    value: access_token,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: accessExpiry,
    path: '/',
  })
  response.cookies.set({
    name: 'sb-refresh-token',
    value: refresh_token,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: refreshExpiry,
    path: '/',
  })

  console.log('Cookies set:', [...setCookies, 'sb-access-token', 'sb-refresh-token'])
  return response
}
