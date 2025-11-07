const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321'

export function getServiceRoleBaseUrl() {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, '')
}

export function getServiceRoleKey() {
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!srk) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return srk
}

export async function serviceRoleFetch(path: string, init: RequestInit = {}) {
  const srk = getServiceRoleKey()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${srk}`)
  headers.set('apikey', srk)

  const method = (init.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${getServiceRoleBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    throw new Error(`Supabase request failed (${res.status}): ${text}`)
  }

  return res
}

export async function serviceRoleRpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const res = await serviceRoleFetch(`/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return res.json() as Promise<T>
}
