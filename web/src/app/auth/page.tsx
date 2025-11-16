"use client"
import { useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function AuthPage() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupSent, setSignupSent] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() =>
    (params?.get('mode') ?? '') === 'signup' ? 'signup' : 'signin'
  )
  const router = useRouter()
  const nextParam = params.get('next')
  const supabase = supabaseBrowser()

  const onPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMessage(error.message)
      return
    }

    // Set session on the server side
    if (data.session) {
      try {
        await fetch('/api/auth/set-session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }),
        })

        // Small delay to ensure cookies are propagated
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        console.error('set-session error:', err)
      }
    }

    const role = data.user.user_metadata?.app_role as string | undefined
    const redirect =
      nextParam ??
      (role === 'venue_manager' || role === 'venue_staff'
        ? '/desk'
        : role === 'admin'
          ? '/admin'
          : '/app')

    // Use full page navigation to ensure cookies are set before next request
    window.location.href = redirect
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

  const inputClass =
    'w-full border-b border-[#DBD8C9] bg-transparent pb-2 text-sm text-[#02374D] placeholder:text-[#7A7C78] focus:outline-none focus:border-[#02374D]'
  const toggleLink = authMode === 'signin' ? 'Create an account' : 'Return to sign in'
  const toggleCopy =
    authMode === 'signin'
      ? 'Not a member? Create an account for rewards and access to the most exclusive properties.'
      : 'Already have an account? Sign in to continue.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1E7] px-4 text-[#02374D] sm:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-10 -mt-24">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Member access</p>
          <h1 className="text-4xl uppercase tracking-[0.08em] text-black">Return to your escape</h1>
        </header>

        <div className="mx-auto max-w-md space-y-6">
          {authMode === 'signin' ? (
            <>
              {errorMessage && (
                <p className="px-2 py-2 text-sm text-[#B4231F]">{errorMessage}</p>
              )}
              <form onSubmit={onPasswordSubmit} className="space-y-6">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="w-full rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800">
                  Sign in
                </button>
              </form>
            </>
          ) : signupSent ? (
            <p className="px-2 py-3 text-sm text-[#02374D]">
              Check your inbox to confirm your email. We&apos;ll route you back here once it&apos;s verified.
            </p>
          ) : (
            <>
              {signupError && (
                <p className="px-2 py-2 text-sm text-[#B4231F]">{signupError}</p>
              )}
              <form onSubmit={onSignupSubmit} className="space-y-6">
                <input
                  type="text"
                  placeholder="Full name"
                  className={inputClass}
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className={inputClass}
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Password"
                  className={inputClass}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                />
                <button
                  disabled={signupLoading}
                  className="w-full rounded-full bg-black px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-gray-800 disabled:opacity-60"
                >
                  {signupLoading ? 'Creating account…' : 'Become an interlude member'}
                </button>
              </form>
            </>
          )}

          <p className="pt-4 text-center text-xs text-[#4F514D]">
            {toggleCopy}{' '}
            <button
              type="button"
              className="font-semibold text-[#02374D] underline-offset-4 hover:underline"
              onClick={() => {
                if (authMode === 'signin') {
                  setAuthMode('signup')
                  setErrorMessage(null)
                } else {
                  setAuthMode('signin')
                  setSignupSent(false)
                  setSignupError(null)
                }
              }}
            >
              {toggleLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
