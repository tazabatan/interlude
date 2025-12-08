import GuestLayout from '@/app/app/(guest)/layout'
import PassesPage from '@/app/app/(guest)/passes/page'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Passes | Interlude',
}

export default async function PublicPassesPage() {
  return (
    <GuestLayout>
      <PassesPage />
    </GuestLayout>
  )
}
