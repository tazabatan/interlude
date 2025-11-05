'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/explore'

  useEffect(() => {
    const supabase = supabaseBrowser()

    // Check for error in hash
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const errorDescription = hashParams.get('error_description')

    if (errorDescription) {
      alert(`Sign-in failed: ${errorDescription}`)
      router.replace('/auth')
      return
    }

    // Listen for auth state change (magic link tokens are processed automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace(next)
      } else if (event === 'SIGNED_OUT' || !session) {
        router.replace('/auth')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, next])

  return <p>Signing you in…</p>
}
