import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import { getUserRole } from "@/lib/get-user-role"
import AccountMenu from "@/components/account-menu"
import AdminNav, { adminNavLinks } from "./nav"
import Footer from "@/components/footer"

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserRole()
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email
  const subtitle = role === "admin" ? "Admin" : role ? role.replace("_", " ") : null

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-[#02374D]`}>
      <header className="relative z-[100] bg-[#F4F1E7]/90 backdrop-blur">
        <div className="relative flex w-full items-center px-6 py-6 sm:px-10 lg:px-[5rem]">
          <div className="flex flex-1 lg:flex-initial" />
          <Link
            href="/admin"
            className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0"
          >
            <Image src="/interlude-logo.png" alt="Interlude" width={180} height={28} priority />
          </Link>
          <div className="absolute left-1/2 hidden -translate-x-1/2 lg:flex">
            <AdminNav />
          </div>
          <div className="flex flex-1 justify-end">
            {user ? (
              <AccountMenu
                userName={displayName}
                email={user.email}
                role={role}
                subtitle={subtitle ?? undefined}
                navLinks={adminNavLinks}
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
      <main className="mx-auto w-full max-w-6xl px-8 py-10 md:px-12 lg:max-w-7xl lg:px-16 xl:px-20 2xl:max-w-[105rem] 2xl:px-24">
        {children}
      </main>
      <Footer />
    </div>
  )
}
