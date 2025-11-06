import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

const guestRoles = ['member', 'admin']
const deskRoles = ['venue_manager', 'venue_staff', 'admin']
const adminRoles = ['admin']

export async function middleware(req: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = (user?.user_metadata?.app_role as string | undefined) ?? 'guest'
  const path = req.nextUrl.pathname

  const buildRedirect = (target: string) => {
    const url = new URL(target, req.url)
    if (!user && !url.searchParams.has('next')) {
      url.searchParams.set('next', req.nextUrl.pathname)
    }
    const redirectResponse = NextResponse.redirect(url)
    // Preserve any cookie mutations Supabase may have queued on the response.
    res.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  if (path.startsWith('/desk')) {
    if (!user) return buildRedirect('/auth')
    if (!deskRoles.includes(role)) return buildRedirect('/app')
  } else if (path.startsWith('/admin')) {
    if (!user) return buildRedirect('/auth')
    if (!adminRoles.includes(role)) return buildRedirect('/app')
  } else if (path.startsWith('/app')) {
    if (!user) return buildRedirect('/auth')
    if (deskRoles.includes(role) && !guestRoles.includes(role)) return buildRedirect('/desk')
    if (!guestRoles.includes(role)) return buildRedirect('/auth')
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/desk/:path*', '/admin/:path*'],
}
