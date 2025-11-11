import Link from "next/link"
import { redirect } from "next/navigation"
import MemberAccountForm from "./member-form"
import StaffAccountForm from "./staff-form"
import { getUserRole } from "@/lib/get-user-role"

const roleLabels: Record<string, string> = {
  member: "Member",
  venue_staff: "Venue staff",
  venue_manager: "Venue manager",
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
  const roleLabel = roleLabels[role] ?? "Account"

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

  return (
    <div className="min-h-screen bg-[#F4F1E7] px-4 py-10 text-[#02374D] sm:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        <Link
          href={backHref}
          className="inline-flex items-center text-sm font-medium text-[#02374D] hover:underline"
        >
          ← Back
        </Link>

        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">{roleLabel}</p>
          <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">{title}</h1>
          <p className="text-sm text-[#6F716D]">
            Update your contact details, payment preferences, and how we should reach you ahead of each stay.
          </p>
        </header>

        {role === "member" ? (
          <MemberAccountForm initialData={memberData} />
        ) : (
          <StaffAccountForm role={role} initialData={staffData} />
        )}
      </div>
    </div>
  )
}
