import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getScanSecret } from '@/lib/scan-link'

export const DEVICE_COOKIE_NAME = 'interlude-scan-device-token'
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type DeviceCookiePayload = {
  venueId: string
  token: string
}

function encodePayload(payload: DeviceCookiePayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodePayload(serialized: string): DeviceCookiePayload | null {
  try {
    const json = Buffer.from(serialized, 'base64url').toString('utf-8')
    const parsed = JSON.parse(json) as DeviceCookiePayload
    if (typeof parsed.venueId !== 'string' || typeof parsed.token !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function signPayload(payload: string) {
  return createHmac('sha256', getScanSecret()).update(payload).digest('base64url')
}

function verifySignature(payload: string, signature: string) {
  const expected = signPayload(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createDeviceCookieValue(payload: DeviceCookiePayload) {
  const encoded = encodePayload(payload)
  const signature = signPayload(encoded)
  return `${encoded}.${signature}`
}

export function parseDeviceCookieValue(value: string | undefined) {
  if (!value) return null
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  if (!verifySignature(payload, signature)) return null
  return decodePayload(payload)
}

export function getDeviceCookie() {
  const cookieStore = cookies()
  const raw = cookieStore.get(DEVICE_COOKIE_NAME)?.value
  return parseDeviceCookieValue(raw)
}
