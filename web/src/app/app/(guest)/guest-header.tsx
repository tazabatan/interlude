'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import GuestNav, { guestNavLinks } from './nav'
import AccountMenu from '@/components/account-menu'

type GuestHeaderProps = {
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null
  role: string | null
  roleLabel: string | null
  displayName: string | null | undefined
  credits: number | null
}

export default function GuestHeader({ user, role, roleLabel, displayName, credits }: GuestHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const paddingClass = isScrolled ? 'py-4' : 'py-6'
  const logoWidth = isScrolled ? 150 : 180
  const logoHeight = isScrolled ? 23 : 28

  return (
    <header className="sticky top-0 z-50 bg-[#F4F1E7]">
      <div
        className={`relative flex w-full items-center px-4 sm:px-10 lg:px-[5rem] transition-all duration-200 ${paddingClass}`}
      >
        <div className="flex flex-1 lg:flex-initial" />
        <Link
          href="/app"
          className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
        >
          <Image
            src="/interlude-logo.png"
            alt="Interlude"
            width={logoWidth}
            height={logoHeight}
            priority
            className="transition-all duration-200"
          />
        </Link>
        <div className="absolute left-1/2 hidden -translate-x-1/2 lg:flex">
          <GuestNav />
        </div>
        <div className="flex flex-1 justify-end">
          {user ? (
            <AccountMenu
              userName={displayName}
              email={user.email}
              role={role}
              subtitle={roleLabel}
              credits={credits}
              navLinks={guestNavLinks}
            />
          ) : (
            <Link
              href="/auth"
              className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
