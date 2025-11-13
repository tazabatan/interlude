"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"

type AccountMenuProps = {
  userName?: string | null
  email?: string | null
  role?: string | null
  subtitle?: string | null
}

export default function AccountMenu({ userName, email, role, subtitle }: AccountMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  const handleLogout = async () => {
    setSigningOut(true)
    const supabase = supabaseBrowser()
    await supabase.auth.signOut()
    setSigningOut(false)
    router.replace("/auth")
    router.refresh()
  }

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
        <div
          role="menu"
          className="absolute right-0 z-[100] mt-3 w-64 rounded-[28px] border border-[#E8E4D7] bg-[#FBF7ED] p-5 text-sm text-[#02374D] shadow-[0px_20px_45px_rgba(0,0,0,0.18)]"
        >
          <div className="pb-3 text-xs uppercase tracking-[0.3em] text-[#6F716D]">Signed in</div>
          <div className="pb-2 text-base font-semibold text-black">{displayName}</div>
          <div
            className={
              subtitleIsVenue
                ? "pb-4 text-sm text-[#4F514D]"
                : "pb-4 text-xs uppercase tracking-[0.2em] text-[#6F716D]"
            }
          >
            {secondaryLabel}
          </div>
          <div className="space-y-3 border-t border-dashed border-[#E8E4D7] pt-4 text-base text-black">
            <Link href="/account" onClick={() => setOpen(false)} className="block hover:text-[#02374D]">
              Account settings
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
      )}
    </div>
  )
}

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[#02374D] transition group-hover:text-black"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}
