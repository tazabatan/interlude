import Link from "next/link"
import { redirect } from "next/navigation"
import { Montserrat } from "next/font/google"
import MemberAccountForm from "./member-form"
import StaffAccountForm from "./staff-form"
import { getUserRole } from "@/lib/get-user-role"
import { serviceRoleFetch } from "@/lib/supabase/service-role"

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const roleLabels: Record<string, string> = {
  member: "Member",
  venue_staff: "Staff",
  venue_manager: "Manager",
  admin: "Admin",
}

export default async function AccountPage() {
  const { user, role } = await getUserRole()
  if (!user) {
    redirect("/auth")
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, string>
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? ""
  const avatarPath = metadata.avatar_url ?? ""
  const avatarImageUrl = avatarPath ? `${supabaseUrl}/storage/v1/object/public/profile-photos/${avatarPath}` : ""

  const title = `Account settings`

  // Get venue name for staff/managers
  let venueName: string | null = null
  const metadataVenueName = metadata.venue_name?.trim() || null
  if (metadataVenueName) {
    venueName = metadataVenueName
  } else if (role === "venue_manager" || role === "venue_staff") {
    const venueId = metadata.venue_id ?? null
    if (venueId) {
      try {
        const res = await serviceRoleFetch(
          `/rest/v1/venues?id=eq.${venueId}&select=${encodeURIComponent("name")}&limit=1`
        )
        const [row] = (await res.json()) as Array<{ name: string | null }>
        venueName = row?.name?.trim() || null
      } catch {
        // ignore and keep null
      }
    }
  }

  const roleLabel = venueName && (role === "venue_staff" || role === "venue_manager")
    ? `${venueName} · ${roleLabels[role]}`
    : roleLabels[role] ?? "Account"

  const memberData = {
    fullName: metadata.full_name ?? "",
    email: user.email ?? "",
    phone: metadata.phone ?? "",
    dietaryNotes: metadata.dietary_notes ?? "",
    loungePreferences: metadata.lounge_preferences ?? "",
    contactPreference: metadata.contact_preference ?? "email",
    cardNickname: metadata.card_nickname ?? "",
    cardLast4: metadata.card_last4 ?? "",
    avatarPath,
    avatarImageUrl,
  }

  const staffData = {
    fullName: metadata.full_name ?? "",
    email: user.email ?? "",
    phone: metadata.phone ?? "",
    title: metadata.job_title ?? "",
  }

  const backHref =
    role === "venue_manager" || role === "venue_staff"
      ? "/desk"
      : role === "admin"
        ? "/admin"
        : "/app"

  const formContent =
    role === "member" ? (
      <MemberAccountForm initialData={memberData} />
    ) : (
      <StaffAccountForm role={role} initialData={staffData} />
    )

  return (
    <div className={`${montserrat.className} min-h-screen bg-[#F4F1E7] px-4 py-10 text-[#02374D] sm:px-8`}>
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="flex items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DBD8C9] text-black transition hover:bg-[#d0ccba]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">{roleLabel}</p>
            <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">{title}</h1>
          </div>
        </header>

        <div className="rounded-[32px] border border-[#E8E4D7] bg-[#F9F6ED] p-8 shadow-[0px_4px_23.1px_6px_rgba(0,0,0,0.15)]">
          {formContent}
        </div>
      </div>
    </div>
  )
}
