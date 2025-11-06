'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const links = [
  { href: '/app', label: 'Wallet' },
  { href: '/app/explore', label: 'Explore' },
  { href: '/auth', label: 'Account' },
]

export default function GuestNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-10 text-sm font-medium uppercase tracking-[0.2em] text-[#777]">
      {links.map((link) => {
        const isActive = pathname === link.href
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
