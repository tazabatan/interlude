import { fetchMemberBookings } from '@/lib/bookings/member'
import type { GuestBookingView } from '@/lib/bookings/view-model'
import WalletClient from './wallet-client'

export default async function WalletPage() {
  const { bookings } = await fetchMemberBookings()
  return <WalletClient bookings={bookings as GuestBookingView[]} />
}
