"use client"
import { useEffect, useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupSent, setSignupSent] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const nextParam = params.get('next')
  const supabase = supabaseBrowser()

  useEffect(() => {
    if (params.get('mode') === 'signup') {
      const anchor = document.getElementById('signup-form')
      if (anchor) {
        anchor.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }
  }, [params])

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

  const onSignupSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSignupError(null)
    setSignupSent(false)
    setSignupLoading(true)
    const redirectUrl = new URL(`${REDIRECT_BASE}/auth/callback`)
    if (nextParam) redirectUrl.searchParams.set('next', nextParam)
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: redirectUrl.toString(),
        data: {
          app_role: 'member',
          full_name: signupName || undefined,
        },
      },
    })
    if (error) {
      setSignupError(error.message)
    } else {
      setSignupSent(true)
    }
    setSignupLoading(false)
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

      <section id="signup-form" className="space-y-4 rounded-2xl border border-gray-200 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Become a member</h2>
          <p className="text-sm text-gray-600">Create a free account to unlock member-only venues and keep your passes in one place.</p>
        </div>
        {signupError && <p className="text-sm text-red-600">{signupError}</p>}
        {signupSent ? (
          <p className="text-sm text-gray-700">Check your inbox to confirm your email. We&apos;ll route you back here once it&apos;s verified.</p>
        ) : (
          <form onSubmit={onSignupSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="Full name"
              className="w-full rounded border px-3 py-2"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
            />
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded border px-3 py-2"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Create a password"
              className="w-full rounded border px-3 py-2"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
            />
            <button disabled={signupLoading} className="w-full rounded bg-white px-4 py-2 text-sm font-semibold text-black ring-1 ring-black transition hover:bg-black hover:text-white disabled:opacity-60">
              {signupLoading ? 'Creating account…' : 'Create free account'}
            </button>
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
