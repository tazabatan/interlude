'use client'
import { useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

const DEMO_PASS_ID = process.env.NEXT_PUBLIC_DEMO_PASS_ID

export default function RequestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const passIdFromQuery = searchParams.get('passId')
  const dateFromQuery = searchParams.get('date')
  const todayIso = new Date().toISOString().slice(0, 10)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const passId = passIdFromQuery ?? DEMO_PASS_ID

    if (!passId) {
      setResult('Select a pass from Explore first.')
      setLoading(false)
      return
    }

    const supabase = supabaseBrowser()
    const bookingDate = dateFromQuery ?? todayIso

    const { data, error } = await supabase.rpc('fn_request_booking', {
      _pass_id: passId,
      _date: bookingDate,
      _party_size: 2,
    })

    if (error) {
      setResult(`Error: ${error.message}`)
    } else {
      setResult(`Booking ID: ${data}`)
      router.push('/app')
    }

    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Request (stub)</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <p className="text-sm text-gray-600">
          Pass: <span className="font-medium">{passIdFromQuery ?? 'Demo pass'}</span> · Date:{' '}
          <span className="font-medium">{dateFromQuery ?? todayIso}</span>
        </p>
        <button disabled={loading} className="rounded bg-black px-4 py-2 text-white">
          {loading ? 'Submitting…' : 'Request pass'}
        </button>
      </form>
      {result && <pre className="rounded bg-gray-50 p-3 text-xs">{result}</pre>}
    </div>
  )
}
