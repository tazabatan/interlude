import { RoleInviteForm } from "@/components/role-invite-form"
import { serviceRoleFetch } from "@/lib/supabase/service-role"

type VenueOption = {
  id: string
  name: string | null
}

async function fetchAdminVenues(): Promise<VenueOption[]> {
  const res = await serviceRoleFetch("/rest/v1/venues?select=id,name&order=name.asc")
  return (await res.json()) as VenueOption[]
}

export default async function AdminHome() {
  const venues = await fetchAdminVenues()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#02374D]">Admin control center</h1>
        <p className="text-sm text-gray-600">Create venues, wire controls, and onboard desk teams.</p>
      </header>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6F716D]">Invite desk users</h2>
        <p className="text-sm text-[#4F514D]">
          Send an email link that lets venue managers or staff set a password and land directly in the desk app. Choose the venue they
          should manage and Supabase will handle the email.
        </p>
        <RoleInviteForm mode="admin" venues={venues} />
        {venues.length === 0 && (
          <p className="text-sm text-[#B4231F]">
            Add a venue first to enable invites. Managers must be tied to a specific venue today.
          </p>
        )}
      </section>
    </div>
  )
}
