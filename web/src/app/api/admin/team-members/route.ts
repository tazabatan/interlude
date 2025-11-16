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
  const limitParam = Number(req.nextUrl.searchParams.get('limit') ?? '100')
  const pageParam = Number(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = Math.max(1, Math.min(200, Number.isFinite(limitParam) ? limitParam : 100))
  const page = Math.max(1, Number.isFinite(pageParam) ? pageParam : 1)
  const offset = (page - 1) * limit

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
    const params = new URLSearchParams({
      select: 'id,email,raw_user_meta_data',
      order: 'email.asc',
      limit: limit.toString(),
      offset: offset.toString(),
    })
    if (venueId) {
      params.set('raw_user_meta_data->>venue_id', `eq.${venueId}`)
    }

    const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?${params.toString()}`)
    const teamMembers = (await res.json()) as TeamMember[]

    return NextResponse.json({ teamMembers })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
