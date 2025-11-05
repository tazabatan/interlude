import { supabaseServer } from '@/lib/supabase/server'

export default async function WalletPage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <p>Not signed in.</p>

  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, qr_jti, arrival_window_start, arrival_window_end')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return <pre className="rounded bg-gray-50 p-3 text-xs">{error.message}</pre>
  }

  const booking = data?.[0]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Wallet</h1>
      {!booking ? (
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
