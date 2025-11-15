"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"

type NavLink = {
  href: string
  label: string
}

type AccountMenuProps = {
  userName?: string | null
  email?: string | null
  role?: string | null
  subtitle?: string | null
  credits?: number | null
  navLinks?: ReadonlyArray<NavLink>
  additionalDesktopLinks?: ReadonlyArray<NavLink>
  mobileBreakpoint?: 'lg' | 'xl'
}

export default function AccountMenu({ userName, email, role, subtitle, credits, navLinks = [], additionalDesktopLinks = [], mobileBreakpoint = 'lg' }: AccountMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node
      const clickedInsideMenu = menuRef.current?.contains(target)
      const clickedInsideMobile = mobileMenuRef.current?.contains(target)
      if (!clickedInsideMenu && !clickedInsideMobile) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  if (!email) return null

  const displayName = userName || email
  const firstNameSource = (userName?.trim() || email || "").split(/\s+|@/)[0] || "Guest"
  const firstName = firstNameSource.charAt(0).toUpperCase() + firstNameSource.slice(1)
  const trimmedSubtitle = subtitle?.trim() || null
  const fallbackLabel = role ? role.replace("_", " ") : "Account"
  const secondaryLabel = trimmedSubtitle ?? fallbackLabel
  const subtitleIsVenue = Boolean(trimmedSubtitle)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    setSigningOut(true)
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    setSigningOut(false)
    router.replace("/auth")
    router.refresh()
  }

  const hasMobileNavLinks = navLinks.length > 0

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="group flex items-center gap-3 px-2 py-1 text-sm text-black transition"
      >
        <HamburgerIcon />
        <span className="hidden sm:inline">{`Welcome, ${firstName}`}</span>
      </button>

      {open && (
        <>
          <div
            role="menu"
            className={`absolute right-0 z-[100] mt-3 hidden w-64 rounded-[28px] border border-[#E8E4D7] bg-[#FBF7ED] p-5 text-sm text-[#02374D] shadow-[0px_20px_45px_rgba(0,0,0,0.18)] ${mobileBreakpoint === 'xl' ? 'xl:block' : 'lg:block'}`}
          >
            <div className="pb-3 text-xs uppercase tracking-[0.3em] text-[#6F716D]">Signed in</div>
            <div className="pb-2 text-base font-semibold text-black">{displayName}</div>
            <div
              className={
                subtitleIsVenue
                  ? "pb-2 text-sm text-[#4F514D]"
                  : "pb-2 text-xs uppercase tracking-[0.2em] text-[#6F716D]"
              }
            >
              {secondaryLabel}
            </div>
            {credits !== null && credits !== undefined && (
              <div className="pb-4 text-sm text-black">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(credits)} Interlude Credit
              </div>
            )}
            <div className="space-y-3 border-t border-dashed border-[#E8E4D7] pt-4 text-base text-black">
              {additionalDesktopLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block hover:text-[#02374D]">
                  {link.label}
                </Link>
              ))}
              <Link href="/account" onClick={() => setOpen(false)} className="block hover:text-[#02374D]">
                Account settings
              </Link>
              <Link href="/support" onClick={() => setOpen(false)} className="block hover:text-[#02374D]">
                Support
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full text-left hover:text-[#02374D]"
                disabled={signingOut}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>

          {mounted &&
            createPortal(
              <div
                ref={mobileMenuRef}
                className={`fixed inset-x-0 bottom-0 top-[88px] z-[200] bg-[#F4F1E7] px-6 pb-6 pt-12 text-[#02374D] ${mobileBreakpoint === 'xl' ? 'xl:hidden' : 'lg:hidden'}`}
              >
                <div className="relative flex h-full flex-col">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="absolute -top-12 right-0 flex h-12 w-12 items-center justify-center rounded-full bg-[#DBD8C9] text-black transition hover:bg-[#d0ccba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#02374D]"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 4l8 8M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-10 pb-10">
                    <div className="space-y-2 text-sm text-[#4F514D]">
                      <div className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Signed in</div>
                      <div className="text-2xl font-normal uppercase text-black">{displayName}</div>
                      <div
                        className={
                          subtitleIsVenue
                            ? "text-base text-[#4F514D]"
                            : "text-xs uppercase tracking-[0.2em] text-[#6F716D]"
                        }
                      >
                        {secondaryLabel}
                      </div>
                      {credits !== null && credits !== undefined && (
                        <div className="pt-4">
                          <div className="text-3xl font-normal uppercase tracking-[0.02em] text-black">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(credits)}
                          </div>
                          <div className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">Interlude Credit</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 border-t border-[#E8E4D7] pt-8">
                      <div className="space-y-3">
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className="block text-3xl font-normal uppercase tracking-[0.02em] text-black transition hover:text-[#02374D]"
                          >
                            {link.label}
                          </Link>
                        ))}
                        <Link
                          href="/account"
                          onClick={() => setOpen(false)}
                          className="block text-3xl font-normal uppercase tracking-[0.02em] text-black transition hover:text-[#02374D]"
                        >
                          Account settings
                        </Link>
                        <Link
                          href="/support"
                          onClick={() => setOpen(false)}
                          className="block text-3xl font-normal uppercase tracking-[0.02em] text-black transition hover:text-[#02374D]"
                        >
                          Support
                        </Link>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full bg-[#02374D] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#023a52] disabled:opacity-60"
                    disabled={signingOut}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-black transition group-hover:text-[#1A1A1A]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
