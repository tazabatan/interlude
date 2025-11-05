'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/explore'

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser()
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const errorDescription = hashParams.get('error_description')

      if (errorDescription) {
        alert(`Sign-in failed: ${errorDescription}`)
        router.replace('/auth')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) {
        console.error(error)
        alert(`Sign-in failed: ${error.message}`)
        router.replace('/auth')
        return
      }

      router.replace(next)
    }

    run()
  }, [router, next])

  return <p>Signing you in…</p>
}
