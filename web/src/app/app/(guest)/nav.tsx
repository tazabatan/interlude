'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

export const guestNavLinks = [
  { href: '/app', label: 'Wallet' },
  { href: '/app/explore', label: 'Explore' },
  { href: '/app/concierge', label: 'Concierge' },
  { href: '/app/rewards', label: 'Rewards' },
] as const

export default function GuestNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-10 text-sm font-medium uppercase tracking-[0.2em] text-[#777]">
      {guestNavLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== '/app' && pathname.startsWith(`${link.href}/`))
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'pb-1 transition',
              isActive
                ? 'text-black underline decoration-2 underline-offset-8'
                : 'text-[#777] hover:text-black'
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
