const COOKIE_VERSION = 'v1'
const encoder = new TextEncoder()

type CryptoKeyPromise = Promise<CryptoKey>
let cachedKeyPromise: CryptoKeyPromise | null = null

const DEFAULT_DEV_SECRET = 'dev-impersonation-secret'

function getSecret() {
  const secret = process.env.IMPERSONATION_COOKIE_SECRET ?? (process.env.NODE_ENV !== 'production' ? DEFAULT_DEV_SECRET : undefined)
  if (!secret) {
    throw new Error('IMPERSONATION_COOKIE_SECRET must be set')
  }
  return secret
}

function base64Encode(value: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64')
  }
  if (typeof btoa === 'function') {
    const bytes = encoder.encode(value)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return btoa(binary)
  }
  throw new Error('No base64 encoder available')
}

function base64Decode(value: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8')
  }
  if (typeof atob === 'function') {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new TextDecoder().decode(bytes)
  }
  throw new Error('No base64 decoder available')
}

function toBase64Url(value: string) {
  return base64Encode(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4 !== 0) {
    base64 += '='
  }
  return base64Decode(base64)
}

async function getCryptoKey() {
  if (!cachedKeyPromise) {
    const secret = getSecret()
    cachedKeyPromise = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ])
  }
  return cachedKeyPromise
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function signPayload(encodedPayload: string) {
  const key = await getCryptoKey()
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload))
  return bytesToHex(new Uint8Array(signature))
}

export type SignedImpersonationPayload = {
  impersonatedUserId: string
  impersonatedEmail: string
  impersonatedRole: string
  adminUserId: string
  startTime: number
  timeLimitMinutes: number
  expiresAt: number
}

export async function encodeImpersonationCookie(payload: SignedImpersonationPayload) {
  const encoded = toBase64Url(JSON.stringify(payload))
  const signature = await signPayload(encoded)
  return `${COOKIE_VERSION}.${encoded}.${signature}`
}

export async function decodeImpersonationCookie(value: string) {
  const [version, encoded, signature] = value.split('.')
  if (version !== COOKIE_VERSION || !encoded || !signature) {
    return null
  }
  const expectedSignature = await signPayload(encoded)
  if (!timingSafeEqual(expectedSignature, signature)) {
    return null
  }
  try {
    return JSON.parse(fromBase64Url(encoded)) as SignedImpersonationPayload
  } catch {
    return null
  }
}
