import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Montserrat } from 'next/font/google'
import VenueDeskNav from './nav'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export default function DeskLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-[#02374D]`}>
      <header className="bg-[#F4F1E7]/90 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-6 px-[5rem] py-6">
          <Link href="/desk" className="flex items-center">
            <Image src="/interlude-logo.png" alt="Interlude" width={180} height={28} priority />
          </Link>
          <VenueDeskNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10 lg:max-w-7xl 2xl:max-w-[105rem]">{children}</main>
    </div>
  )
}
