'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

type WalletBooking = {
  id: string
  status: string
  qr_jti: string | null
  arrival_window_start: string | null
  arrival_window_end: string | null
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<WalletBooking | null>(null)

  useEffect(() => {
    const supabase = supabaseBrowser()

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session) {
        setError('Not signed in.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('id, status, qr_jti, arrival_window_start, arrival_window_end')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        setError(error.message)
      } else {
        setBooking(data?.[0] ?? null)
      }

      setLoading(false)
    }

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void load()
    })

    void load()

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Wallet</h1>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p>{error}</p>
      ) : !booking ? (
        <p>No bookings yet.</p>
      ) : (
        <div className="space-y-2 rounded border p-3">
          <div>
            Status: <b>{booking.status}</b>
          </div>
          <div>
            Window: {booking.arrival_window_start ?? '—'} → {booking.arrival_window_end ?? '—'}
          </div>
          <div>
            QR token: <code className="text-xs">{booking.qr_jti ?? '—'}</code>
          </div>
        </div>
      )}
    </div>
  )
}
