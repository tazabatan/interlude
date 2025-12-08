import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'

export default async function HomePage() {
  const { user, role } = await getUserRole()
  const venueId = (user?.user_metadata?.venue_id as string | undefined) ?? null

  if (!user) {
    redirect('/app/explore')
  }

  if (role === 'admin') {
    redirect('/admin')
  }

  if ((role === 'venue_manager' || role === 'venue_staff') && venueId) {
    redirect('/desk')
  }

  redirect('/app/explore')
}
