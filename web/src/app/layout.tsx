import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getImpersonationInfo } from '@/lib/impersonation'
import ImpersonationBanner from '@/components/impersonation-banner'
import ImpersonationTracker from '@/components/impersonation-tracker'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Interlude',
  description: 'Private, QR-verified access',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const impersonationInfo = await getImpersonationInfo()

  return (
    <html lang="en">
      <body className={inter.className}>
        {impersonationInfo.isImpersonating && impersonationInfo.session && (
          <>
            <ImpersonationBanner session={impersonationInfo.session} />
            <ImpersonationTracker />
          </>
        )}
        <div className={impersonationInfo.isImpersonating ? 'pt-[60px]' : ''}>
          {children}
        </div>
      </body>
    </html>
  )
}
