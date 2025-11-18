import { NextRequest, NextResponse } from 'next/server'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import { createDeviceCookieValue, DEVICE_COOKIE_NAME, DEVICE_COOKIE_MAX_AGE } from '@/lib/scan-device-cookie'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const venueId = searchParams.get('venueId')
  const token = searchParams.get('token')
  const redirectParam = searchParams.get('redirect')

  if (!venueId || !token) {
    return NextResponse.json({ error: 'venueId and token are required' }, { status: 400 })
  }

  const params = new URLSearchParams()
  params.set('id', `eq.${venueId}`)
  params.set('scan_device_token', `eq.${token}`)
  params.set('select', 'id')
  params.set('limit', '1')

  try {
    const res = await serviceRoleFetch(`/rest/v1/venues?${params.toString()}`)
    const rows = (await res.json()) as Array<{ id: string }>
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid device token' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Unable to validate token' }, { status: 500 })
  }

  const cookieValue = createDeviceCookieValue({ venueId, token })
  const redirectUrl = redirectParam ? new URL(redirectParam, origin).toString() : `${origin}/scan/device/success`

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: cookieValue,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: DEVICE_COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}
