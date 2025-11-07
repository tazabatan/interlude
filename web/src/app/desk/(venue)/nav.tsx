'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const links = [
  { href: '/desk/bookings', label: 'Bookings' },
  { href: '/desk/requests', label: 'Requests' },
  { href: '/desk/calendar', label: 'Calendar' },
  { href: '/desk/passes', label: 'Passes' },
  { href: '/desk/scanner', label: 'Scanner' },
]

export default function VenueDeskNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center justify-end gap-6 text-sm font-medium uppercase tracking-[0.18em] text-[#777] sm:justify-center lg:flex-nowrap lg:gap-10 lg:tracking-[0.2em]">
      {links.map((link) => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              'pb-1 transition whitespace-nowrap',
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
