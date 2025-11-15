"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export const adminNavLinks = [
  { href: "/admin", label: "Invite", match: "exact" as const },
  { href: "/admin/create", label: "Venues", match: "startsWith" as const },
  { href: "/admin/dashboard", label: "Dashboard", match: "startsWith" as const },
  { href: "/admin/user-login", label: "User Login", match: "startsWith" as const },
] as const

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-10 text-sm font-medium uppercase tracking-[0.2em] text-[#777]">
      {adminNavLinks.map((link) => {
        const isActive =
          link.match === "startsWith" ? pathname.startsWith(link.href) : pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "pb-1 transition",
              isActive ? "text-black underline decoration-2 underline-offset-8" : "text-[#777] hover:text-black"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
