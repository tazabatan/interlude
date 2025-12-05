import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import GuestNav, { guestNavLinks } from "@/app/app/(guest)/nav"
import VenueDeskNav, { venueDeskNavLinks } from "@/app/desk/(venue)/nav"
import AdminNav, { adminNavLinks } from "@/app/admin/(admin)/nav"
import AccountMenu from "@/components/account-menu"
import { getUserRole } from "@/lib/get-user-role"
import { fetchMemberRewards } from "@/lib/rewards"
import { serviceRoleFetch } from "@/lib/supabase/service-role"
import { montserrat } from "@/app/fonts"

export const metadata: Metadata = {
  title: "Support | Interlude",
  description: "Your Interlude concierge is available whenever you need assistance.",
}

const phoneNumber = "+44 7957 784126"
const emailAddress = "support@interludepass.com"

export default async function SupportPage() {
  const { user, role } = await getUserRole()
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, string | null>
  const displayName =
    userMetadata.full_name ??
    userMetadata.name ??
    user?.email ??
    null

  let subtitle: string | null = null
  if (role === "member") {
    subtitle = "Member"
  } else if (role === "admin") {
    subtitle = "Admin"
  } else if (role) {
    subtitle = role.replace("_", " ")
  }

  const metadataVenueName = (userMetadata.venue_name ?? "").trim() || null
  const venueId = userMetadata.venue_id ?? null
  if (metadataVenueName) {
    subtitle = metadataVenueName
  } else if ((role === "venue_manager" || role === "venue_staff") && venueId) {
    try {
      const res = await serviceRoleFetch(
        `/rest/v1/venues?id=eq.${venueId}&select=${encodeURIComponent("name")}&limit=1`
      )
      const [row] = (await res.json()) as Array<{ name: string | null }>
      subtitle = row?.name?.trim() || subtitle
    } catch {
      // ignore; keep fallback subtitle
    }
  }

  let credits: number | null = null
  if (role === "member" && user?.id) {
    try {
      const rewardsData = await fetchMemberRewards(user.id)
      credits = rewardsData.credits
    } catch (error) {
      console.error("Failed to fetch member rewards:", error)
    }
  }

  const homeHref =
    role === "venue_manager" || role === "venue_staff"
      ? "/desk"
      : role === "admin"
        ? "/admin"
        : "/app"

  const navLinks =
    role === "admin"
      ? adminNavLinks
      : role === "venue_manager" || role === "venue_staff"
        ? venueDeskNavLinks
        : guestNavLinks

  const nav =
    role === "admin" ? (
      <AdminNav />
    ) : role === "venue_manager" || role === "venue_staff" ? (
      <VenueDeskNav />
    ) : (
      <GuestNav />
    )

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] text-[#02374D] overflow-x-hidden`}>
      <header className="relative z-50 bg-[#F4F1E7]/90 backdrop-blur">
        <div className="flex w-full flex-col gap-4 px-4 py-6 sm:px-10 lg:px-[5rem]">
          <div className="flex w-full items-center gap-4">
            <div className="flex flex-1 md:hidden" aria-hidden="true" />
            <Link
              href={homeHref}
              className="flex flex-1 justify-center md:flex-none md:justify-start"
            >
              <Image src="/interlude-logo.png" alt="Interlude" width={180} height={28} priority />
            </Link>
            <div className="flex flex-1 justify-end">
              {user ? (
                <AccountMenu
                  userName={displayName}
                  email={user.email}
                  role={role}
                  subtitle={subtitle ?? undefined}
                  credits={credits}
                  navLinks={navLinks}
                />
              ) : (
                <Link
                  href="/auth"
                  className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
          <div className="hidden w-full justify-center md:flex">{nav}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
        <div className="space-y-10">
          <div className="space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Interlude Support</p>
            <h1 className="text-4xl font-medium uppercase tracking-[0.12em] text-black sm:text-5xl">
              Here when you need us
            </h1>
          </div>

          <section className="rounded-[36px] border border-[#E8E4D7] bg-[#FBF7ED] p-6 shadow-[0px_20px_45px_rgba(0,0,0,0.15)] sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="space-y-4 rounded-[28px] border border-[#ECE8DA] bg-white/60 p-6 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Call us</div>
                <p className="text-sm text-[#4F514D]">
                  Immediate help with an arrival, check-in, or anything unexpected.
                </p>
                <a
                  href={`tel:${phoneNumber.replace(/\s+/g, '')}`}
                  className="block text-2xl font-semibold text-black transition hover:text-[#02374D]"
                >
                  {phoneNumber}
                </a>
              </div>

              <div className="space-y-4 rounded-[28px] border border-[#ECE8DA] bg-white/60 p-6 backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Email concierge</div>
                <p className="text-sm text-[#4F514D]">
                  Share itinerary details, post-visit notes, or anything that needs thoughtful follow-up.
                </p>
                <a
                  href={`mailto:${emailAddress}`}
                  className="block text-2xl font-semibold text-black transition hover:text-[#02374D]"
                >
                  {emailAddress}
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
