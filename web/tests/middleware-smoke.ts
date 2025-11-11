import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

import { middleware } from '../src/middleware'
import RootLayout from '../src/app/layout'
import GuestLayout from '../src/app/app/(guest)/layout'
import DeskLayout from '../src/app/desk/(venue)/layout'
import AdminLayout from '../src/app/admin/(admin)/layout'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key'

type CookieMap = Record<string, string>

function setSupabaseMock(mock: any) {
  ;(globalThis as any).__supabaseMock = mock
}

function createRequest(path: string, cookieValues: CookieMap = {}) {
  const cookieEntries = new Map(Object.entries(cookieValues))
  return {
    nextUrl: new URL(`https://example.com${path}`),
    url: `https://example.com${path}`,
    cookies: {
      get(name: string) {
        const value = cookieEntries.get(name)
        return value ? { value } : undefined
      },
    },
  }
}

function expectRedirect(response: any, expectedPath: string) {
  assert.equal(response.type, 'redirect', `Expected redirect for ${expectedPath}`)
  const redirectUrl = new URL(response.url)
  assert.equal(redirectUrl.pathname, expectedPath.split('?')[0])
  if (expectedPath.includes('?')) {
    const [, query] = expectedPath.split('?')
    const params = new URLSearchParams(query)
    for (const [key, value] of params.entries()) {
      assert.equal(redirectUrl.searchParams.get(key), value)
    }
  }
}

async function runMiddlewareTests() {
  // Unauthenticated redirects
  setSupabaseMock({ response: { data: { user: null } } })
  const guestApp = await middleware(createRequest('/app'))
  assert.equal(guestApp.type, 'next', 'Guests should be able to view /app landing without signing in')
  expectRedirect(await middleware(createRequest('/app/booking/demo')), '/auth?next=/app/booking/demo')
  expectRedirect(await middleware(createRequest('/desk')), '/auth?next=/desk')
  expectRedirect(await middleware(createRequest('/admin')), '/auth?next=/admin')

  // Member access rules
  setSupabaseMock({ response: { data: { user: { id: 'user1', user_metadata: { app_role: 'member' } } } } })
  const memberApp = await middleware(createRequest('/app'))
  assert.equal(memberApp.type, 'next', 'Member should access /app')
  expectRedirect(await middleware(createRequest('/desk')), '/app')
  expectRedirect(await middleware(createRequest('/admin')), '/app')

  // Venue staff access rules
  setSupabaseMock({ response: { data: { user: { id: 'user2', user_metadata: { app_role: 'venue_staff' } } } } })
  const staffDesk = await middleware(createRequest('/desk'))
  assert.equal(staffDesk.type, 'next', 'Venue staff should access /desk')
  expectRedirect(await middleware(createRequest('/app')), '/desk')
  expectRedirect(await middleware(createRequest('/admin')), '/app')

  // Admin access rules
  setSupabaseMock({ response: { data: { user: { id: 'user3', user_metadata: { app_role: 'admin' } } } } })
  const adminApp = await middleware(createRequest('/app'))
  assert.equal(adminApp.type, 'next', 'Admin should access /app')
  const adminDesk = await middleware(createRequest('/desk'))
  assert.equal(adminDesk.type, 'next', 'Admin should access /desk')
  const adminAdmin = await middleware(createRequest('/admin'))
  assert.equal(adminAdmin.type, 'next', 'Admin should access /admin')

  // Cookie propagation
  setSupabaseMock({
    async getUser({ cookies }: any) {
      cookies.set('sb-access-token', 'fresh-token', { path: '/' })
      return { data: { user: null } }
    },
  })
  const cookieRedirect = await middleware(createRequest('/app/booking/demo'))
  expectRedirect(cookieRedirect, '/auth?next=/app/booking/demo')
  const refreshed = cookieRedirect.cookies.get('sb-access-token')
  assert.ok(refreshed, 'Expected refreshed cookie to be forwarded')
  assert.equal(refreshed.value, 'fresh-token')
}

function runLayoutTests() {
  const rootHtml = renderToStaticMarkup(
    React.createElement(RootLayout, null, React.createElement('main', null, 'Root child')),
  )
  assert.ok(!rootHtml.includes('<nav'), 'Root layout should not render global navigation')

  const guestHtml = renderToStaticMarkup(
    React.createElement(GuestLayout, null, React.createElement('div', null, 'Guest content')),
  )
  assert.ok(guestHtml.includes('Wallet'), 'Guest layout should include guest navigation')
  assert.ok(!guestHtml.includes('/desk'), 'Guest layout must not link to desk routes')
  assert.ok(!guestHtml.includes('/admin'), 'Guest layout must not link to admin routes')

  const deskHtml = renderToStaticMarkup(
    React.createElement(DeskLayout, null, React.createElement('div', null, 'Desk content')),
  )
  assert.ok(deskHtml.includes('Interlude Desk'), 'Desk layout should brand the desk surface')
  assert.ok(deskHtml.includes('Approvals'), 'Desk layout should include desk navigation items')
  assert.ok(!deskHtml.includes('Wallet'), 'Desk layout must not show guest links')

  const adminHtml = renderToStaticMarkup(
    React.createElement(AdminLayout, null, React.createElement('div', null, 'Admin content')),
  )
  assert.ok(adminHtml.includes('Interlude Admin'), 'Admin layout should brand the admin surface')
  assert.ok(!adminHtml.includes('/app'), 'Admin layout must not expose guest routes')
}

async function main() {
  try {
    await runMiddlewareTests()
    runLayoutTests()
    console.log('✅ Middleware role gating and layout separation smoke tests passed')
  } catch (error) {
    console.error('❌ Smoke tests failed')
    console.error(error)
    process.exitCode = 1
  }
}

void main()
