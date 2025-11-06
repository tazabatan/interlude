'use client'
import { useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const REDIRECT_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const nextParam = params.get('next')

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const supabase = supabaseBrowser()
    const redirectUrl = new URL(`${REDIRECT_BASE}/auth/callback`)
    if (nextParam) {
      redirectUrl.searchParams.set('next', nextParam)
    }
    const redirectTo = redirectUrl.toString()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    if (!error) setSent(true)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {sent ? (
        <p>Magic link sent. Check your email.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="rounded bg-black px-4 text-white">Send link</button>
        </form>
      )}
      <button
        className="text-sm underline"
        onClick={async () => {
          await supabaseBrowser().auth.signOut()
          router.refresh()
        }}
      >
        Sign out
      </button>
    </div>
  )
}
