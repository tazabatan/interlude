'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ImpersonationTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Track page view
    trackPageView(pathname)
  }, [pathname])

  const trackPageView = async (path: string) => {
    try {
      await fetch('/api/admin/track-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'page_view',
          actionPath: path,
        }),
      })
    } catch (error) {
      // Silently fail - we don't want tracking errors to affect user experience
      console.error('Failed to track page view:', error)
    }
  }

  // This component doesn't render anything
  return null
}
