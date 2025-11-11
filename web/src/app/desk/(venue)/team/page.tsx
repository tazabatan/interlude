import { RoleInviteForm } from "@/components/role-invite-form"
import { getUserRole } from "@/lib/get-user-role"
import { serviceRoleFetch } from "@/lib/supabase/service-role"

type VenueRow = {
  id: string
  name: string | null
}

async function fetchVenue(venueId: string): Promise<VenueRow | null> {
  const params = new URLSearchParams({
    id: `eq.${venueId}`,
    select: "id,name",
    limit: "1",
  })
  const res = await serviceRoleFetch(`/rest/v1/venues?${params.toString()}`)
  const rows = (await res.json()) as VenueRow[]
  return rows[0] ?? null
}

export default async function DeskTeamPage() {
  const { role, user } = await getUserRole()

  if (role !== "venue_manager") {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 rounded-[28px] border border-[#E8E4D7] bg-[#F9F6ED] p-10 text-center text-[#4F514D]">
        <h1 className="text-2xl font-semibold text-[#02374D]">Team invitations</h1>
        <p className="text-sm">
          Only venue managers can invite new staff or managers. Ask your manager to send an invite if you need another account.
        </p>
      </div>
    )
  }

  const venueId = user?.user_metadata?.venue_id as string | undefined
  const venue = venueId ? await fetchVenue(venueId) : null

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 text-[#02374D]">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Team</p>
        <h1 className="text-3xl font-medium uppercase tracking-[0.02em] text-black">Invite your desk team</h1>
        <p className="text-sm text-[#4F514D]">
          Send a link to new staff or co-managers. They&apos;ll receive a Supabase email to set their password and will land directly in the desk app.
        </p>
      </header>

      {!venueId ? (
        <section className="rounded-[24px] border border-[#E8E4D7] bg-white p-6 text-sm text-[#B4231F]">
          This manager account isn&apos;t linked to a venue yet. Add a venue ID via admin tools before inviting your team.
        </section>
      ) : (
        <RoleInviteForm mode="manager" managedVenue={{ id: venueId, name: venue?.name ?? "Your venue" }} />
      )}
    </div>
  )
}
