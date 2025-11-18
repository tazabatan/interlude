import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import GuestNav, { guestNavLinks } from "./nav"
import { getUserRole } from "@/lib/get-user-role"
import AccountMenu from "@/components/account-menu"
import { fetchMemberRewards } from "@/lib/rewards"
import Footer from "@/components/footer"
import { montserrat } from "@/app/fonts"

// Force all app routes to be dynamic
export const dynamic = 'force-dynamic'

export default async function GuestLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserRole()
  const roleLabel =
    role === "member" ? "Member" : role === "admin" ? "Admin" : role ? role.replace("_", " ") : null
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email

  // Fetch credits for members
  let credits: number | null = null
  if (role === 'member' && user?.id) {
    try {
      const rewardsData = await fetchMemberRewards(user.id)
      credits = rewardsData.credits
    } catch (error) {
      console.error('Failed to fetch member rewards:', error)
    }
  }

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-gray-900`}>
      <header className="relative z-50 bg-[#F4F1E7]/90 backdrop-blur">
        <div className="relative flex w-full items-center px-4 py-6 sm:px-10 lg:px-[5rem]">
          <div className="flex flex-1 lg:flex-initial" />
          <Link
            href="/app"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
          >
            <Image src="/interlude-logo.png" alt="Interlude" width={180} height={28} priority />
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
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 md:px-12 lg:max-w-7xl lg:px-16 xl:px-20 2xl:max-w-[105rem] 2xl:px-24">{children}</main>
      <Footer />
    </div>
  )
}
