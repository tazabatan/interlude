"use client"
import { useState, FormEvent, type ReactNode } from 'react'
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

  const inputClass =
    'w-full rounded-2xl border border-[#DBD8C9] bg-white/90 px-4 py-3 text-sm text-[#02374D] placeholder:text-[#7A7C78] shadow-[inset_0_1px_3px_rgba(2,55,77,0.08)] focus:outline-none focus:ring-2 focus:ring-[#02374D]'
  const toggleLink = authMode === 'signin' ? 'Create an account' : 'Return to sign in'
  const toggleCopy =
    authMode === 'signin'
      ? 'Not a member? Create an account for rewards and access to the most exclusive properties.'
      : 'Already have an account? Sign in to continue.'

  return (
    <div className="min-h-screen bg-[#F4F1E7] px-4 py-12 text-[#02374D] sm:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Member access</p>
          <h1 className="text-4xl font-semibold uppercase tracking-[0.08em] text-black">Return to your escape</h1>
          <p className="text-sm text-[#4F514D]">
            Sign in to manage passes, greet guests, and keep every request at your fingertips.
          </p>
        </header>

        <div className="mx-auto max-w-3xl space-y-6">
          <AuthCard
            title={authMode === 'signin' ? 'Sign in with password' : 'Create your account'}
            subtitle={
              authMode === 'signin'
                  ? 'Use your desk or member credentials to continue.'
                  : 'Unlock rewards, faster arrivals, and hidden inventory.'
              }
            >
              {authMode === 'signin' ? (
                <>
                  {errorMessage && (
                    <p className="rounded-2xl bg-[#FCE1E1] px-4 py-3 text-sm text-[#B4231F]">{errorMessage}</p>
                  )}
                  <form onSubmit={onPasswordSubmit} className="space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
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
                    <button className="w-full rounded-full bg-[#02374D] px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A]">
                      Sign in
                    </button>
                  </form>
                </>
              ) : signupSent ? (
                <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#02374D]">
                  Check your inbox to confirm your email. We&apos;ll route you back here once it&apos;s verified.
                </p>
              ) : (
                <>
                  {signupError && (
                    <p className="rounded-2xl bg-[#FCE1E1] px-4 py-3 text-sm text-[#B4231F]">{signupError}</p>
                  )}
                  <form onSubmit={onSignupSubmit} className="space-y-3">
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
                      placeholder="you@example.com"
                      className={inputClass}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                    />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Create a password"
                      className={inputClass}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                    />
                    <button
                      disabled={signupLoading}
                      className="w-full rounded-full border border-[#02374D] bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white disabled:opacity-60"
                    >
                      {signupLoading ? 'Creating account…' : 'Create free account'}
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
          </AuthCard>
        </div>

        <div className="text-center">
          <button
            className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D] underline-offset-4 hover:text-[#02374D] hover:underline"
            onClick={async () => {
              await supabase.auth.signOut()
              router.refresh()
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function AuthCard({
  children,
  title,
  subtitle,
  id,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className="space-y-4 rounded-[32px] border border-[#E8E4D7] bg-[#FFFCF5] p-6 shadow-[0px_10px_26px_rgba(2,55,77,0.12)]"
    >
      <div className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">{title}</h2>
        {subtitle && <p className="text-sm text-[#4F514D]">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}
