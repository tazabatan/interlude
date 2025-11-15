import { serviceRoleFetch } from '@/lib/supabase/service-role'

type ImpersonationLog = {
  id: string
  admin_user_id: string
  impersonated_user_id: string
  started_at: string
  ended_at: string | null
  time_limit_minutes: number
  status: string
}

type UserProfile = {
  id: string
  email: string
}

async function fetchRecentSessions(): Promise<
  Array<{
    session: ImpersonationLog
    impersonatedEmail: string
  }>
> {
  try {
    // Fetch recent sessions (last 20)
    const sessionQuery = encodeURIComponent(
      'id,admin_user_id,impersonated_user_id,started_at,ended_at,time_limit_minutes,status'
    )
    const res = await serviceRoleFetch(
      `/rest/v1/impersonation_logs?select=${sessionQuery}&order=started_at.desc&limit=20`
    )

    if (!res.ok) {
      console.error('Failed to fetch sessions:', res.statusText)
      return []
    }

    const sessions = (await res.json()) as ImpersonationLog[]

    // Fetch user emails for impersonated users
    const uniqueUserIds = [...new Set(sessions.map((s) => s.impersonated_user_id))]
    const userEmailMap = new Map<string, string>()

    for (const userId of uniqueUserIds) {
      try {
        const userQuery = encodeURIComponent('id,email')
        const userFilterQuery = encodeURIComponent(`id.eq.${userId}`)
        const userRes = await serviceRoleFetch(`/rest/v1/auth_user_profiles?select=${userQuery}&${userFilterQuery}`)

        if (userRes.ok) {
          const users = (await userRes.json()) as UserProfile[]
          if (users.length > 0) {
            userEmailMap.set(userId, users[0].email)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user email:', error)
      }
    }

    return sessions.map((session) => ({
      session,
      impersonatedEmail: userEmailMap.get(session.impersonated_user_id) ?? 'Unknown',
    }))
  } catch (error) {
    console.error('Error fetching recent sessions:', error)
    return []
  }
}

function formatDateTime(isoString: string) {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso)
  const end = endIso ? new Date(endIso) : new Date()
  const durationMs = end.getTime() - start.getTime()
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.floor((durationMs % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export default async function RecentImpersonationSessions() {
  const sessionData = await fetchRecentSessions()

  if (sessionData.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#DBD8C9] bg-white/70 p-8 text-center text-sm text-[#4F514D]">
        No impersonation sessions yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#E8E4D7]">
      <table className="w-full">
        <thead className="bg-[#F9F6ED] text-xs font-semibold uppercase tracking-[0.2em] text-[#6F716D]">
          <tr>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Started</th>
            <th className="px-4 py-3 text-left">Duration</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E4D7]">
          {sessionData.map(({ session, impersonatedEmail }) => (
            <tr key={session.id} className="bg-white hover:bg-[#FEFDFB]">
              <td className="px-4 py-3 text-sm font-medium text-[#02374D]">{impersonatedEmail}</td>
              <td className="px-4 py-3 text-sm text-[#4F514D]">{formatDateTime(session.started_at)}</td>
              <td className="px-4 py-3 text-sm text-[#4F514D]">
                {formatDuration(session.started_at, session.ended_at)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    session.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : session.status === 'ended'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {session.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`/api/admin/impersonation-report?session_id=${session.id}`}
                  download
                  className="inline-flex items-center gap-1 rounded-full bg-[#02374D] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#02486A]"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Report
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
