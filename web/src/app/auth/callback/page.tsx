'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  const defaultRouteForRole = (role: string | undefined) => {
    if (role === 'admin') return '/admin'
    if (role === 'venue_manager' || role === 'venue_staff') return '/desk'
    return '/app'
  }

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
        const role = session.user.user_metadata?.app_role as string | undefined
        const target = nextParam ?? defaultRouteForRole(role)
        router.replace(target)
      } else if (event === 'SIGNED_OUT' || !session) {
        router.replace('/auth')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, nextParam])

  return <p>Signing you in…</p>
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<p>Signing you in…</p>}>
      <AuthCallbackInner />
    </Suspense>
  )
}

  return <p>Signing you in…</p>
}
