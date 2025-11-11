import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import GuestNav from "./nav"
import { getUserRole } from "@/lib/get-user-role"
import AccountMenu from "@/components/account-menu"

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export default async function GuestLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserRole()
  const roleLabel =
    role === "member" ? "Member" : role === "admin" ? "Admin" : role ? role.replace("_", " ") : null
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-gray-900`}>
      <header className="bg-[#F4F1E7]/90 backdrop-blur">
        <div className="flex w-full items-center gap-6 px-[5rem] py-6">
          <Link href="/app" className="flex items-center">
            <Image src="/interlude-logo.png" alt="Interlude" width={180} height={28} priority />
          </Link>
          <div className="flex flex-1 justify-center">
            <GuestNav />
          </div>
          {user ? (
            <AccountMenu userName={displayName} email={user.email} role={role} subtitle={roleLabel} />
          ) : (
            <Link
              href="/auth"
              className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:max-w-7xl 2xl:max-w-[105rem]">{children}</main>
    </div>
  )
}
