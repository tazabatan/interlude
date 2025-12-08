import GuestLayout from '@/app/app/(guest)/layout'
import ConciergePage from '@/app/app/(guest)/concierge/page'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Concierge | Interlude',
}

export default async function PublicConciergePage() {
  return (
    <GuestLayout>
      <ConciergePage />
    </GuestLayout>
  )
}
