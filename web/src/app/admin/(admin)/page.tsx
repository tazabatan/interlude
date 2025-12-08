import { RoleInviteForm } from "@/components/role-invite-form"
import { serviceRoleFetch } from "@/lib/supabase/service-role"

type VenueOption = {
  id: string
  name: string | null
  provider_type?: string | null
}

async function fetchAdminVenues(): Promise<VenueOption[]> {
  const res = await serviceRoleFetch("/rest/v1/venues?select=id,name,provider_type&order=name.asc")
  return (await res.json()) as VenueOption[]
}

export default async function AdminHome() {
  const venues = await fetchAdminVenues()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[#02374D]">Admin control center</h1>
        <p className="text-sm text-gray-600">Create providers, wire controls, and onboard desk teams.</p>
      </header>

      <section className="space-y-4 rounded-[28px] border border-[#E8E4D7] bg-white p-6 shadow-[0px_4px_18px_rgba(0,0,0,0.08)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-[#6F716D]">Invite desk users</h2>
        <p className="text-sm text-[#4F514D]">
          Send an email link that lets provider managers or staff set a password and land directly in the desk app. Choose the provider they
          should manage and Supabase will handle the email. Concierge providers (boats or chefs) will auto-attach to their concierge passes.
        </p>
        <RoleInviteForm mode="admin" venues={venues} />
        {venues.length === 0 && (
          <p className="text-sm text-[#B4231F]">
            Add a provider first to enable invites. Managers must be tied to a specific provider today.
          </p>
        )}
      </section>
    </div>
  )
}
