import type { ReactNode } from "react"
import Link from "next/link"
import { getUserRole } from "@/lib/get-user-role"
import AccountMenu from "@/components/account-menu"

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/statements", label: "Statements" },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserRole()
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-900 p-6 text-white">
        <div className="mb-6 text-lg font-semibold">Interlude Admin</div>
        <nav className="space-y-2 text-sm">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-2 py-1 hover:bg-gray-800">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-white text-gray-900">
        <header className="flex items-center justify-end border-b border-gray-200 px-8 py-4">
          {user && <AccountMenu userName={displayName} email={user.email} role={role} />}
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
