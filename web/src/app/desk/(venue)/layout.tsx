import type { ReactNode } from 'react'
import Link from 'next/link'

const deskNav = [
  { href: '/desk', label: 'Calendar' },
  { href: '/desk/approvals', label: 'Approvals' },
  { href: '/desk/scanner', label: 'Scanner' },
  { href: '/desk/controls', label: 'Controls' },
]

export default function DeskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-gray-50 p-6">
        <div className="mb-6 text-lg font-semibold">Interlude Desk</div>
        <nav className="space-y-2 text-sm">
          {deskNav.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded px-2 py-1 hover:bg-gray-100">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-white p-8">{children}</main>
    </div>
  )
}
