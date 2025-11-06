import type { ReactNode } from 'react'
import Link from 'next/link'

const adminNav = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/statements', label: 'Statements' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
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
      <main className="flex-1 bg-white p-8 text-gray-900">{children}</main>
    </div>
  )
}
