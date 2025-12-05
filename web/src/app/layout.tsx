import type { Metadata } from 'next'
import './globals.css'
import { inter } from './fonts'
import { getImpersonationInfo } from '@/lib/impersonation'
import ImpersonationBanner from '@/components/impersonation-banner'
import ImpersonationTracker from '@/components/impersonation-tracker'

export const metadata: Metadata = {
  title: 'Interlude',
  description: 'Private, QR-verified access',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
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
