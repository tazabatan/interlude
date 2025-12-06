import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'

export default async function HomePage() {
  const { user, role } = await getUserRole()

  if (!user) {
    redirect('/app/explore')
  }

  if (role === 'admin') {
    redirect('/admin')
  }

  if (role === 'venue_manager' || role === 'venue_staff') {
    redirect('/desk')
  }

  redirect('/app/explore')
}
