import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

type TeamMember = {
  id: string
  email: string
  raw_user_meta_data: {
    full_name?: string
    name?: string
    app_role?: string
    venue_id?: string
  }
}

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venue_id')

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

  try {
    // Fetch all users using service role
    const query = encodeURIComponent('id,email,raw_user_meta_data')
    const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?select=${query}`)

    if (!res.ok) {
      console.error('Failed to fetch users:', res.statusText)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    const allUsers = (await res.json()) as TeamMember[]

    // Filter by venue_id if provided
    let teamMembers = allUsers
    if (venueId) {
      teamMembers = allUsers.filter(
        (user) => user.raw_user_meta_data?.venue_id === venueId
      )
    }

    return NextResponse.json({ teamMembers })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
