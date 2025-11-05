import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const protectedPrefixes = ['/explore', '/venue', '/request', '/wallet']
  if (!protectedPrefixes.some((prefix) => req.nextUrl.pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptionsWithName) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name: string, options: CookieOptionsWithName) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    const redirectUrl = new URL('/auth', req.url)
    redirectUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/explore/:path*', '/venue/:path*', '/request/:path*', '/wallet/:path*'],
}
