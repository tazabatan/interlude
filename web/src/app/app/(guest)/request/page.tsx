'use client'
import { useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DEMO_PASS_ID = process.env.NEXT_PUBLIC_DEMO_PASS_ID

export default function RequestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    if (!DEMO_PASS_ID) {
      setResult('Demo pass id missing. Set NEXT_PUBLIC_DEMO_PASS_ID in .env.local')
      setLoading(false)
      return
    }

    const supabase = supabaseBrowser()
    const bookingDate = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase.rpc('fn_request_booking', {
      _pass_id: DEMO_PASS_ID,
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
        <button disabled={loading} className="rounded bg-black px-4 py-2 text-white">
          {loading ? 'Submitting…' : 'Request pass'}
        </button>
      </form>
      {result && <pre className="rounded bg-gray-50 p-3 text-xs">{result}</pre>}
    </div>
  )
}
