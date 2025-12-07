import type { ReactNode } from "react"
import { getUserRole } from "@/lib/get-user-role"
import { fetchMemberRewards } from "@/lib/rewards"
import Footer from "@/components/footer"
import { montserrat } from "@/app/fonts"
import GuestHeader from "./guest-header"

// Force all app routes to be dynamic
export const dynamic = 'force-dynamic'

export default async function GuestLayout({ children }: { children: ReactNode }) {
  const { user, role } = await getUserRole()
  const roleLabel =
    role === "member" ? "Member" : role === "admin" ? "Admin" : role ? role.replace("_", " ") : null
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email

  // Fetch credits for members
  let credits: number | null = null
  if (role === 'member' && user?.id) {
    try {
      const rewardsData = await fetchMemberRewards(user.id)
      credits = rewardsData.credits
    } catch (error) {
      console.error('Failed to fetch member rewards:', error)
    }
  }

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-gray-900`}>
      <GuestHeader user={user} role={role} roleLabel={roleLabel} displayName={displayName} credits={credits} />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 md:px-12 lg:max-w-7xl lg:px-16 xl:px-20 2xl:max-w-[105rem] 2xl:px-24">{children}</main>
      <Footer />
    </div>
  )
}
