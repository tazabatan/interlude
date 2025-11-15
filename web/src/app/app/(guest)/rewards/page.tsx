import { getUserRole } from '@/lib/get-user-role'
import { redirect } from 'next/navigation'
import { fetchMemberRewards } from '@/lib/rewards'
import RewardsClient from './rewards-client'

export default async function RewardsPage() {
  const { role, user } = await getUserRole()

  // Only members can access rewards
  if (role !== 'member' && role !== 'admin') {
    redirect('/app')
  }

  const rewardsData = await fetchMemberRewards(user?.id)

  return <RewardsClient data={rewardsData} />
}
