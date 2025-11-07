'use client'
import { useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const params = useSearchParams()
  const nextParam = params.get('next')
  const supabase = supabaseBrowser()

  const onMagicSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const redirectUrl = new URL(`${REDIRECT_BASE}/auth/callback`)
    if (nextParam) redirectUrl.searchParams.set('next', nextParam)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl.toString() },
    })
    if (error) {
      setErrorMessage(error.message)
    } else {
      setSent(true)
    }
  }

  const onPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMessage(error.message)
      return
    }
    const role = data.user.user_metadata?.app_role as string | undefined
    const redirect =
      nextParam ??
      (role === 'venue_manager' || role === 'venue_staff'
        ? '/desk'
        : role === 'admin'
          ? '/admin'
          : '/app')
    router.replace(redirect)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Password</h2>
        <form onSubmit={onPasswordSubmit} className="space-y-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Password"
            className="w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full rounded bg-black px-4 py-2 text-white">Sign in</button>
        </form>
      </section>

      <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Magic link</h2>
        {sent ? (
          <p className="text-sm text-gray-700">Magic link sent. Check Mailpit locally.</p>
        ) : (
          <form onSubmit={onMagicSubmit} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="rounded bg-gray-900 px-4 text-white">Send link</button>
          </form>
        )}
      </section>

      <button
        className="text-sm underline"
        onClick={async () => {
          await supabase.auth.signOut()
          router.refresh()
        }}
      >
        Sign out
      </button>
    </div>
  )
}
