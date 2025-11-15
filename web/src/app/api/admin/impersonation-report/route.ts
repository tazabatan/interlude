import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

type ImpersonationLog = {
  id: string
  admin_user_id: string
  impersonated_user_id: string
  started_at: string
  ended_at: string | null
  time_limit_minutes: number
  status: string
}

type ImpersonationAction = {
  id: string
  session_id: string
  action_type: string
  action_path: string | null
  action_details: Record<string, unknown> | null
  timestamp: string
}

type UserProfile = {
  id: string
  email: string
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin role
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const role = (user.user_metadata?.app_role as string | undefined) ?? 'guest'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get session_id from query params
    const sessionId = req.nextUrl.searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Fetch the impersonation session
    const sessionQuery = encodeURIComponent('id,admin_user_id,impersonated_user_id,started_at,ended_at,time_limit_minutes,status')
    const sessionFilterQuery = encodeURIComponent(`id.eq.${sessionId}`)
    const sessionRes = await serviceRoleFetch(
      `/rest/v1/impersonation_logs?select=${sessionQuery}&${sessionFilterQuery}`
    )

    if (!sessionRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
    }

    const sessions = (await sessionRes.json()) as ImpersonationLog[]

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const session = sessions[0]

    // Fetch all actions for this session
    const actionsQuery = encodeURIComponent('id,session_id,action_type,action_path,action_details,timestamp')
    const actionsFilterQuery = encodeURIComponent(`session_id.eq.${sessionId}`)
    const actionsRes = await serviceRoleFetch(
      `/rest/v1/impersonation_actions?select=${actionsQuery}&${actionsFilterQuery}&order=timestamp.asc`
    )

    if (!actionsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 })
    }

    const actions = (await actionsRes.json()) as ImpersonationAction[]

    // Fetch user emails
    const adminQuery = encodeURIComponent('id,email')
    const adminFilterQuery = encodeURIComponent(`id.eq.${session.admin_user_id}`)
    const adminRes = await serviceRoleFetch(
      `/rest/v1/auth_user_profiles?select=${adminQuery}&${adminFilterQuery}`
    )

    const impersonatedQuery = encodeURIComponent('id,email')
    const impersonatedFilterQuery = encodeURIComponent(`id.eq.${session.impersonated_user_id}`)
    const impersonatedRes = await serviceRoleFetch(
      `/rest/v1/auth_user_profiles?select=${impersonatedQuery}&${impersonatedFilterQuery}`
    )

    let adminEmail = 'Unknown'
    let impersonatedEmail = 'Unknown'

    if (adminRes.ok) {
      const adminUsers = (await adminRes.json()) as UserProfile[]
      adminEmail = adminUsers[0]?.email ?? 'Unknown'
    }

    if (impersonatedRes.ok) {
      const impersonatedUsers = (await impersonatedRes.json()) as UserProfile[]
      impersonatedEmail = impersonatedUsers[0]?.email ?? 'Unknown'
    }

    // Generate CSV report
    const csvRows = [
      // Header
      ['Impersonation Session Report'],
      [],
      ['Session ID', session.id],
      ['Admin User', adminEmail],
      ['Impersonated User', impersonatedEmail],
      ['Started At', new Date(session.started_at).toLocaleString()],
      ['Ended At', session.ended_at ? new Date(session.ended_at).toLocaleString() : 'In Progress'],
      ['Time Limit', `${session.time_limit_minutes} minutes`],
      ['Status', session.status],
      [],
      ['Actions Logged', actions.length.toString()],
      [],
      // Actions header
      ['Timestamp', 'Action Type', 'Path', 'Details'],
    ]

    // Add action rows
    actions.forEach((action) => {
      csvRows.push([
        new Date(action.timestamp).toLocaleString(),
        action.action_type,
        action.action_path ?? '',
        action.action_details ? JSON.stringify(action.action_details) : '',
      ])
    })

    // Convert to CSV string
    const csvContent = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="impersonation-report-${sessionId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
