"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

type NavLink = {
  label: string
  href: string
}

const venueLinks: NavLink[] = [
  { label: "Bookings", href: "/desk/bookings" },
  { label: "Requests", href: "/desk/requests" },
  { label: "Calendar", href: "/desk/calendar" },
  { label: "Passes", href: "/desk/passes" },
  { label: "Team", href: "/desk/team" },
]

const memberLinks: NavLink[] = [
  { label: "Wallet", href: "/app" },
  { label: "Explore", href: "/app/explore" },
  { label: "Request", href: "/app/request" },
  { label: "Account", href: "/account" },
]

export default function AdminNav() {
  const pathname = usePathname()
  const inviteActive = pathname === "/admin"
  const createActive = pathname.startsWith("/admin/create")

  return (
    <nav className="flex flex-wrap items-center justify-end gap-6 text-sm font-medium uppercase tracking-[0.18em] text-[#777] sm:justify-center lg:flex-nowrap lg:gap-10 lg:tracking-[0.2em]">
      <DropdownMenu label="Member Control" links={memberLinks} />
      <DropdownMenu label="Venue Control" links={venueLinks} />
      <Link
        href="/admin"
        className={clsx(
          "pb-1 transition whitespace-nowrap uppercase tracking-[0.2em]",
          inviteActive
            ? "text-black underline decoration-2 underline-offset-8"
            : "text-[#777] hover:text-black"
        )}
      >
        Invite
      </Link>
      <Link
        href="/admin/create"
        className={clsx(
          "pb-1 transition whitespace-nowrap uppercase tracking-[0.2em]",
          createActive
            ? "text-black underline decoration-2 underline-offset-8"
            : "text-[#777] hover:text-black"
        )}
      >
        Venue
      </Link>
    </nav>
  )
}

function DropdownMenu({ label, links }: { label: string; links: NavLink[] }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("click", handleClick)
    window.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("click", handleClick)
      window.removeEventListener("keydown", handleKey)
    }
  }, [])

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), 250)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
        onMouseEnter={() => {
          clearCloseTimer()
          setOpen(true)
        }}
        onMouseLeave={scheduleClose}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          "flex items-center gap-2 pb-1 text-[#777] transition whitespace-nowrap uppercase tracking-[0.2em]",
          open ? "text-black" : "hover:text-black"
        )}
      >
        {label}
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div
          role="menu"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          className="absolute left-1/2 top-full z-20 mt-3 w-56 -translate-x-1/2 rounded-[28px] border border-[#E8E4D7] bg-[#FBF7ED] p-4 text-[#02374D] shadow-[0px_18px_40px_rgba(0,0,0,0.15)]"
        >
          <ul className="space-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#6F716D]">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-full px-3 py-2 text-sm tracking-[0.18em] text-[#02374D] transition hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={clsx(
        "h-3.5 w-3.5 text-[#777] transition-transform",
        open ? "rotate-180 text-black" : "text-[#777]"
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
    </svg>
  )
}
