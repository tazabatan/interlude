'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ImpersonationSession = {
  impersonatedUserId: string
  impersonatedEmail: string
  startTime: number
  timeLimitMinutes: number
  adminUserId: string
}

type Props = {
  session: ImpersonationSession
}

export default function ImpersonationBanner({ session }: Props) {
  const router = useRouter()
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now()
      const expiryTime = session.startTime + session.timeLimitMinutes * 60 * 1000
      const remaining = Math.max(0, expiryTime - now)
      return remaining
    }

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining())

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)

      // Auto-redirect when time expires
      if (remaining === 0) {
        handleEndSession()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleEndSession = async () => {
    if (isEnding) return

    setIsEnding(true)

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
      })

      if (response.ok) {
        // Redirect back to admin user login page
        router.push('/admin/user-login')
        router.refresh()
      } else {
        console.error('Failed to end session')
        setIsEnding(false)
      }
    } catch (error) {
      console.error('Error ending session:', error)
      setIsEnding(false)
    }
  }

  const isExpiringSoon = timeRemaining < 60000 // Less than 1 minute

  return (
    <div
      className={`fixed left-0 right-0 top-0 z-[1000] border-b shadow-lg transition-colors ${
        isExpiringSoon
          ? 'border-red-300 bg-red-600'
          : 'border-amber-300 bg-amber-500'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-white">
              Impersonating: <span className="font-mono">{session.impersonatedEmail}</span>
            </p>
            <p className="text-xs text-white/90">
              You're viewing the app as this user. All actions are logged.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className={`font-mono text-sm font-semibold ${
              isExpiringSoon ? 'animate-pulse text-white' : 'text-white'
            }`}>
              {formatTime(timeRemaining)}
            </span>
          </div>

          <button
            onClick={handleEndSession}
            disabled={isEnding}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-60"
          >
            {isEnding ? 'Ending...' : 'End Session'}
          </button>
        </div>
      </div>
    </div>
  )
}
