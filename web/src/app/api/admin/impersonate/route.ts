import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  encodeImpersonationCookie,
  decodeImpersonationCookie,
  type SignedImpersonationPayload,
} from '@/lib/impersonation-cookie'
import { getSupabaseServer } from '@/lib/supabase/server'
import { serviceRoleFetch } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

type ImpersonationSession = SignedImpersonationPayload

export async function POST(req: Request) {
  try {
    // Verify admin role
    const supabase = await getSupabaseServer()
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser()

    if (!adminUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const role = (adminUser.user_metadata?.app_role as string | undefined) ?? 'guest'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Parse request body
    const { email, timeLimit } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!timeLimit || typeof timeLimit !== 'number') {
      return NextResponse.json({ error: 'Time limit is required' }, { status: 400 })
    }

    // Find the user to impersonate
    const query = encodeURIComponent('id,email,raw_user_meta_data')
    const filterQuery = encodeURIComponent(`email.eq.${email}`)
    const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?select=${query}&${filterQuery}`)

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 })
    }

    const users = (await res.json()) as Array<{
      id: string
      email: string
      raw_user_meta_data: { app_role?: string; [key: string]: unknown }
    }>

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const targetUser = users[0]
    const targetUserRole = (targetUser.raw_user_meta_data?.app_role as string | undefined) ?? 'guest'
    const startTime = Date.now()
    const timeLimitMinutes = timeLimit
    const expiresAt = startTime + timeLimitMinutes * 60 * 1000

    // Create impersonation session data
    const impersonationSession: ImpersonationSession = {
      impersonatedUserId: targetUser.id,
      impersonatedEmail: targetUser.email,
      impersonatedRole: targetUserRole,
      startTime,
      timeLimitMinutes,
      expiresAt,
      adminUserId: adminUser.id,
    }

    const cookieValue = await encodeImpersonationCookie(impersonationSession)

    // Store in cookie
    const cookieStore = await cookies()
    cookieStore.set('impersonation_session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: timeLimit * 60, // Convert minutes to seconds
      path: '/',
    })

    // Create audit log entry
    try {
      await serviceRoleFetch('/rest/v1/impersonation_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_user_id: adminUser.id,
          impersonated_user_id: targetUser.id,
          started_at: new Date().toISOString(),
          time_limit_minutes: timeLimit,
          status: 'active',
        }),
      })
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Continue even if audit log fails
    }

    // Determine redirect path based on role
    const deskRoles = ['venue_manager', 'venue_staff']
    const redirectPath = deskRoles.includes(targetUserRole) ? '/desk' : '/app'

    return NextResponse.json({
      success: true,
      message: `Impersonation session started for ${targetUser.email}`,
      redirectPath,
    })
  } catch (error) {
    console.error('Error starting impersonation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // Verify admin role
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get current impersonation session
    const cookieStore = await cookies()
    const impersonationCookie = cookieStore.get('impersonation_session')

    if (!impersonationCookie) {
      return NextResponse.json({ error: 'No active impersonation session' }, { status: 400 })
    }

    const session = await decodeImpersonationCookie(impersonationCookie.value)
    if (!session) {
      cookieStore.delete('impersonation_session')
      return NextResponse.json({ error: 'No active impersonation session' }, { status: 400 })
    }

    // Update audit log
    try {
      const filterQuery = encodeURIComponent(
        `admin_user_id.eq.${session.adminUserId},impersonated_user_id.eq.${session.impersonatedUserId},status.eq.active`
      )
      await serviceRoleFetch(`/rest/v1/impersonation_logs?${filterQuery}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ended_at: new Date().toISOString(),
          status: 'ended',
        }),
      })
    } catch (error) {
      console.error('Failed to update audit log:', error)
    }

    // Remove cookie
    cookieStore.delete('impersonation_session')

    return NextResponse.json({ success: true, message: 'Impersonation session ended' })
  } catch (error) {
    console.error('Error ending impersonation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
