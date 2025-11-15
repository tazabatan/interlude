'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

// Desktop nav links (shown in header)
export const venueDeskNavLinks = [
  { href: '/desk/bookings', label: 'Bookings' },
  { href: '/desk/requests', label: 'Requests' },
  { href: '/desk/calendar', label: 'Calendar' },
  { href: '/desk/passes', label: 'Passes' },
  { href: '/desk/dashboard', label: 'Dashboard' },
] as const

// All nav links including Team (for mobile menu)
export const venueDeskAllNavLinks = [
  ...venueDeskNavLinks,
  { href: '/desk/team', label: 'Team' },
] as const

// Team link for desktop dropdown
export const venueTeamLink = { href: '/desk/team', label: 'Team' } as const

export default function VenueDeskNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-10 text-sm font-medium uppercase tracking-[0.2em] text-[#777]">
      {venueDeskNavLinks.map((link) => {
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
