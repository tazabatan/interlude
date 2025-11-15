import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptionsWithName } from '@supabase/ssr'

const guestRoles = ['member', 'admin']
const deskRoles = ['venue_manager', 'venue_staff', 'admin']
const adminRoles = ['admin']

function isPublicAppPath(pathname: string) {
  if (pathname === '/app' || pathname === '/app/') return true
  if (pathname.startsWith('/app/explore')) return true
  if (pathname.startsWith('/app/venue')) return true
  return false
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (_name: string, _value: string, _options: CookieOptionsWithName) => {
          // Middleware cannot mutate cookies on Next.js 16; noop to avoid runtime errors
        },
        remove: (_name: string, _options: CookieOptionsWithName) => {
          // Noop
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role = (user?.user_metadata?.app_role as string | undefined) ?? 'guest'

  // Check for impersonation session
  const impersonationCookie = req.cookies.get('impersonation_session')
  if (impersonationCookie && user) {
    try {
      const impersonationSession = JSON.parse(impersonationCookie.value)
      // Check if session is still valid (not expired)
      const now = Date.now()
      const expiryTime = impersonationSession.startTime + impersonationSession.timeLimitMinutes * 60 * 1000

      if (now <= expiryTime) {
        // Fetch the impersonated user's role using service role
        const serviceRoleUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const query = encodeURIComponent('raw_user_meta_data')
        const filterQuery = encodeURIComponent(`id.eq.${impersonationSession.impersonatedUserId}`)
        const userRes = await fetch(
          `${serviceRoleUrl}/rest/v1/auth_user_profiles?select=${query}&${filterQuery}`,
          {
            headers: {
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
          }
        )

        if (userRes.ok) {
          const users = await userRes.json() as Array<{ raw_user_meta_data: { app_role?: string } }>
          if (users.length > 0) {
            // Use the impersonated user's role for routing
            role = (users[0].raw_user_meta_data?.app_role as string | undefined) ?? 'guest'
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse impersonation session in middleware:', error)
    }
  }

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
    const publicAppPath = isPublicAppPath(path)
    if (!user && !publicAppPath) return buildRedirect('/auth')
    if (user) {
      if (deskRoles.includes(role) && !guestRoles.includes(role)) return buildRedirect('/desk')
      if (!guestRoles.includes(role)) return buildRedirect('/auth')
    }
  } else if (path.startsWith('/account')) {
    if (!user) return buildRedirect('/auth')
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/desk/:path*', '/admin/:path*', '/account/:path*'],
}
