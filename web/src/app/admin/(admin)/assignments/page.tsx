import Assignments from "@/app/admin/(admin)/assignments/assignments"
import { serviceRoleFetch } from "@/lib/supabase/service-role"
import { formatPassLabel } from "@/lib/passes/helpers"

type AssignmentRow = {
  id: string
  pass_id: string
  user_id: string
  role: string | null
}

type ConciergePassRow = {
  id: string
  kind: string | null
  status: string | null
  profile: { presentationKind?: string | null } | null
  venue: { name: string | null; provider_type?: string | null } | null
  concierge_pass_assignments?: AssignmentRow[] | null
}

const CONCIERGE_KINDS = ["BOAT_DAY", "PRIVATE_CHEF"]

async function fetchConciergePasses(): Promise<ConciergePassRow[]> {
  const select = [
    "id",
    "kind",
    "status",
    "profile",
    "venue:venues(name,provider_type)",
    "concierge_pass_assignments(id,pass_id,user_id,role)",
  ].join(",")
  const filter = `kind=in.(${CONCIERGE_KINDS.join(",")})`
  const res = await serviceRoleFetch(
    `/rest/v1/passes?${filter}&order=created_at.desc&select=${encodeURIComponent(select)}`
  )
  return (await res.json()) as ConciergePassRow[]
}

export default async function AdminAssignmentsPage() {
  const passes = await fetchConciergePasses()
  const hasPasses = passes.length > 0

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Concierge</p>
        <h1 className="text-3xl font-normal uppercase tracking-[0.05em] text-black">Assignments</h1>
        <p className="text-sm text-[#4F514D]">Attach manager or staff accounts to concierge passes.</p>
      </div>

      {!hasPasses ? (
        <div className="rounded-2xl border border-dashed border-[#DBD8C9] bg-white/70 px-8 py-12 text-center text-sm text-[#4F514D]">
          No concierge passes yet. Create a Boat Day or Private Chef pass in the Provider builder.
        </div>
      ) : (
        <div className="space-y-8">
          {passes.map((pass) => {
            const label = formatPassLabel(pass.profile?.presentationKind ?? pass.kind, { detail: false })
            const provider = pass.venue?.name?.trim() || "Provider"
            return (
              <div key={pass.id} className="space-y-3 rounded-2xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.3em] text-[#6F716D]">{provider}</div>
                    <h2 className="text-xl font-semibold uppercase tracking-[0.06em] text-black">{label}</h2>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">
                    {(pass.status ?? "draft").toUpperCase()}
                  </div>
                </div>
                <Assignments
                  passId={pass.id}
                  existing={(pass.concierge_pass_assignments ?? []).map((a) => ({
                    id: a.id,
                    user_id: a.user_id,
                    role: a.role ?? "staff",
                  }))}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
