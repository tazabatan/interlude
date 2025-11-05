import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Interlude',
  description: 'Private, QR-verified access',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="border-b">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <a href="/explore" className="font-semibold">
              Interlude
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/explore">Explore</a>
              <a href="/wallet">Wallet</a>
              <a href="/auth">Sign in</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
