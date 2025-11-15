import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(_req: NextRequest) {
  // Temporarily bypass middleware logic until cookie mutations are reworked for Next.js 16.
  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*', '/desk/:path*', '/admin/:path*', '/account/:path*'],
}
