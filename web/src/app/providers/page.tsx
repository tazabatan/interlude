import GuestLayout from '@/app/app/(guest)/layout'
import ProvidersPage, { metadata as providersMetadata } from '@/app/app/(guest)/providers/page'

export const dynamic = 'force-dynamic'
export const metadata = providersMetadata

export default async function PublicProvidersPage() {
  return (
    <GuestLayout>
      <ProvidersPage />
    </GuestLayout>
  )
}
