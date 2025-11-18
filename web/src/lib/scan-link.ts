import { createHmac, timingSafeEqual } from 'node:crypto'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const SCAN_LINK_SECRET = process.env.SCAN_LINK_SECRET

function requireScanSecret() {
  if (!SCAN_LINK_SECRET) {
    throw new Error('SCAN_LINK_SECRET env var is required for scan links.')
  }
  return SCAN_LINK_SECRET
}

export function getScanSecret() {
  return requireScanSecret()
}

function encodePayload(payload: { bookingId: string; qr: string }) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function decodePayload(token: string) {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8')
    return JSON.parse(json) as { bookingId: string; qr: string }
  } catch {
    throw new Error('Invalid scan token payload')
  }
}

function signPayload(payload: string) {
  return createHmac('sha256', requireScanSecret()).update(payload).digest('base64url')
}

function verifySignature(payload: string, signature: string) {
  const expected = signPayload(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function buildScanToken(bookingId: string, qrJti: string) {
  const payload = encodePayload({ bookingId, qr: qrJti })
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

export function buildScanUrl(bookingId: string, qrJti: string) {
  const token = buildScanToken(bookingId, qrJti)
  return `${SITE_URL}/scan/${token}`
}

export function decodeScanToken(token: string) {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) {
    throw new Error('Invalid scan token')
  }
  if (!verifySignature(payload, signature)) {
    throw new Error('Invalid scan token signature')
  }
  const decoded = decodePayload(payload)
  if (!decoded.bookingId || !decoded.qr) {
    throw new Error('Invalid scan token payload')
  }
  return decoded
}
