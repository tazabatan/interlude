'use client'

import { useState } from 'react'

type TimeLimit = 5 | 10 | 30 | 60

export default function UserImpersonationForm() {
  const [email, setEmail] = useState('')
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timeLimitOptions: Array<{ value: TimeLimit; label: string }> = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
  ]

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, timeLimit }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start impersonation session')
      }

      // Redirect based on the impersonated user's role
      const redirectPath = data.redirectPath || '/app'
      // Use window.location for a full page reload to ensure impersonation context loads
      window.location.href = redirectPath
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[24px] border border-[#E8E4D7] bg-[#F9F6ED] p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]"
    >
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
          User email
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-2 text-sm text-black placeholder:text-[#9CA3AF]"
            disabled={isLoading}
          />
        </label>
      </div>

      <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
        Session time limit
        <select
          name="timeLimit"
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value) as TimeLimit)}
          className="mt-2 w-full rounded border border-[#DBD8C9] bg-white px-4 py-2 text-sm text-black"
          disabled={isLoading}
        >
          {timeLimitOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full rounded-full bg-[#02374D] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A] disabled:opacity-60"
      >
        {isLoading ? 'Starting session…' : 'Start impersonation'}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </form>
  )
}
