import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import VenueDeskNav, { venueDeskAllNavLinks, venueTeamLink } from "./nav"
import { getUserRole } from "@/lib/get-user-role"
import AccountMenu from "@/components/account-menu"
import { serviceRoleFetch } from "@/lib/supabase/service-role"
import Footer from "@/components/footer"
import { montserrat } from "@/app/fonts"

// Force all desk routes to be dynamic
export const dynamic = 'force-dynamic'

export default async function DeskLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserRole()
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email
  const metadataVenueName =
    ((user?.user_metadata?.venue_name as string | undefined) ?? "").trim() || null
  let subtitle: string | null = metadataVenueName ?? (role ? role.replace("_", " ") : null)
  if (!metadataVenueName && (role === "venue_manager" || role === "venue_staff")) {
    const venueId = (user?.user_metadata?.venue_id as string | undefined) ?? null
    if (venueId) {
      try {
        const res = await serviceRoleFetch(
          `/rest/v1/venues?id=eq.${venueId}&select=${encodeURIComponent("name")}&limit=1`
        )
        const [row] = (await res.json()) as Array<{ name: string | null }>
        subtitle = (row?.name ?? subtitle)?.trim() || subtitle
      } catch {
        // ignore and keep fallback subtitle
      }
    }
  }

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-[#02374D]`}>
      <header className="relative z-50 bg-[#F4F1E7]/90 backdrop-blur">
        <div className="relative flex w-full items-center px-6 py-6 sm:px-10 lg:px-[5rem]">
          <div className="flex flex-1 xl:flex-initial" />
          <Link
            href="/desk"
            className="absolute left-1/2 -translate-x-1/2 xl:static xl:translate-x-0"
          >
            <Image src="/interlude-logo.png" alt="Interlude" width={180} height={28} priority />
          </Link>
          <div className="absolute left-1/2 hidden -translate-x-1/2 xl:flex">
            <VenueDeskNav />
          </div>
          <div className="flex flex-1 justify-end">
            {user ? (
              <AccountMenu
                userName={displayName}
                email={user.email}
                role={role}
                subtitle={subtitle}
                navLinks={venueDeskAllNavLinks}
                additionalDesktopLinks={[venueTeamLink]}
                mobileBreakpoint="xl"
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
      <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:max-w-7xl 2xl:max-w-[105rem]">{children}</main>
      <Footer />
    </div>
  )
}
