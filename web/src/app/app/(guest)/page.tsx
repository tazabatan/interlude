import Link from 'next/link'
import { fetchMemberBookings } from '@/lib/bookings/member'
import type { GuestBookingView } from '@/lib/bookings/view-model'
import WalletClient from './wallet-client'

export default async function WalletPage() {
  const { bookings, user } = await fetchMemberBookings()
  if (!user) {
    return <GuestWalletLanding />
  }
  return <WalletClient bookings={bookings as GuestBookingView[]} />
}

function GuestWalletLanding() {
  return (
    <div className="space-y-10 text-[#02374D]">
      <header className="space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Wallet</p>
        <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">Plan your next escape</h1>
        <p className="text-sm text-[#6F716D]">Browse private passes, then create a free member account to request a day.</p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-8 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6F716D]">Already have an account?</h2>
          <p className="mt-3 text-base text-[#4F514D]">Sign in to view your wallet, QR codes, and upcoming reservations.</p>
          <Link
            href="/auth"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#02374D] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#02486A]"
          >
            Sign in
          </Link>
        </div>

        <div className="rounded-[32px] border border-[#02374D]/10 bg-white p-8 shadow-[0px_6px_28px_rgba(2,55,77,0.12)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6F716D]">New to Interlude?</h2>
          <p className="mt-3 text-base text-[#4F514D]">
            Become a member to unlock full listings and save your passes. It takes under a minute and keeps your requests in one place.
          </p>
          <Link
            href="/auth?mode=signup"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-[#02374D] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
          >
            Create free account
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-dashed border-[#DBD8C9] bg-white/70 px-8 py-12 text-center text-sm text-[#4F514D]">
        Tap Explore to discover which venues are open to guests today. Member-only listings will unlock once you create an account.
      </section>
    </div>
  )
}
