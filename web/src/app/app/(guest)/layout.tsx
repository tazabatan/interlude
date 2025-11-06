import type { ReactNode } from 'react'
import Link from 'next/link'

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" className="font-semibold">
            Interlude
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/app" className="hover:underline">
              Wallet
            </Link>
            <Link href="/app/explore" className="hover:underline">
              Explore
            </Link>
            <Link href="/auth" className="hover:underline">
              Account
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
