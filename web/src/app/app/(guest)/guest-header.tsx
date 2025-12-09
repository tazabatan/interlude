'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import GuestNav, { guestNavLinks } from './nav'
import AccountMenu from '@/components/account-menu'
import clsx from 'clsx'

type GuestHeaderProps = {
  user: { email?: string | null; user_metadata?: Record<string, unknown> } | null
  role: string | null
  roleLabel: string | null
  displayName: string | null | undefined
  credits: number | null
}

export default function GuestHeader({ user, role, roleLabel, displayName, credits }: GuestHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <>
              <div className="hidden sm:block">
                <Link
                  href="/auth"
                  className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
                >
                  Sign in
                </Link>
              </div>
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#02374D] text-[#02374D] transition hover:bg-[#02374D] hover:text-white sm:hidden"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
      {!user && mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm sm:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className={clsx(
              "absolute right-0 top-0 h-full w-4/5 max-w-sm bg-[#FBF7ED] shadow-2xl transition-transform duration-200",
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4D7]">
              <Image src="/interlude-logo.png" alt="Interlude" width={140} height={22} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DBD8C9] text-[#6F716D] hover:text-black"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-5 py-4">
              {guestNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#02374D] hover:bg-[#F1EDE1]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 h-px bg-[#E8E4D7]" />
              <Link
                href="/auth"
                className="mt-2 rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#02374D] hover:bg-[#F1EDE1]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
