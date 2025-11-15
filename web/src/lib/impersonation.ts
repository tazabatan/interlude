import { cookies } from 'next/headers'
import { getSupabaseServer } from './supabase/server'
import { serviceRoleFetch } from './supabase/service-role'

export type ImpersonationSession = {
  impersonatedUserId: string
  impersonatedEmail: string
  startTime: number
  timeLimitMinutes: number
  adminUserId: string
}

export type ImpersonationInfo = {
  isImpersonating: boolean
  session: ImpersonationSession | null
  isExpired: boolean
}

export async function getImpersonationInfo(): Promise<ImpersonationInfo> {
  const cookieStore = await cookies()
  const impersonationCookie = cookieStore.get('impersonation_session')

  if (!impersonationCookie) {
    return { isImpersonating: false, session: null, isExpired: false }
  }

  try {
    const session = JSON.parse(impersonationCookie.value) as ImpersonationSession
    const now = Date.now()
    const expiryTime = session.startTime + session.timeLimitMinutes * 60 * 1000
    const isExpired = now > expiryTime

    if (isExpired) {
      // Note: We don't delete the cookie here because this runs during rendering.
      // The cookie will be cleaned up by the ImpersonationTracker component via a server action.
      return { isImpersonating: false, session: null, isExpired: true }
    }

    return { isImpersonating: true, session, isExpired: false }
  } catch (error) {
    console.error('Failed to parse impersonation session:', error)
    // Note: We don't delete the cookie here because this runs during rendering.
    // Invalid cookies will be ignored and eventually expire.
    return { isImpersonating: false, session: null, isExpired: false }
  }
}

export async function getEffectiveUser() {
  const supabase = await getSupabaseServer()
  const {
    data: { user: actualUser },
  } = await supabase.auth.getUser()

  if (!actualUser) {
    return { user: null, role: 'guest', isImpersonating: false, impersonationInfo: null }
  }

  const impersonationInfo = await getImpersonationInfo()

  if (!impersonationInfo.isImpersonating || !impersonationInfo.session) {
    const role = (actualUser.user_metadata?.app_role as string | undefined) ?? 'guest'
    return { user: actualUser, role, isImpersonating: false, impersonationInfo: null }
  }

  // Fetch impersonated user data
  try {
    const query = encodeURIComponent('id,email,raw_user_meta_data')
    const filterQuery = encodeURIComponent(`id.eq.${impersonationInfo.session.impersonatedUserId}`)
    const res = await serviceRoleFetch(`/rest/v1/auth_user_profiles?select=${query}&${filterQuery}`)

    if (!res.ok) {
      console.error('Failed to fetch impersonated user')
      return { user: actualUser, role: 'guest', isImpersonating: false, impersonationInfo: null }
    }

    const users = (await res.json()) as Array<{
      id: string
      email: string
      raw_user_meta_data: { app_role?: string; [key: string]: unknown }
    }>

    if (users.length === 0) {
      return { user: actualUser, role: 'guest', isImpersonating: false, impersonationInfo: null }
    }

    const impersonatedUser = users[0]
    const impersonatedRole = (impersonatedUser.raw_user_meta_data?.app_role as string | undefined) ?? 'guest'

    // Return a user object that matches Supabase User type structure
    const effectiveUser = {
      id: impersonatedUser.id,
      email: impersonatedUser.email,
      user_metadata: impersonatedUser.raw_user_meta_data,
      // Add minimal required fields for compatibility
      aud: 'authenticated',
      created_at: '',
      app_metadata: {},
      role: 'authenticated',
    }

    return {
      user: effectiveUser,
      role: impersonatedRole,
      isImpersonating: true,
      impersonationInfo: impersonationInfo.session,
    }
  } catch (error) {
    console.error('Error fetching impersonated user:', error)
    return { user: actualUser, role: 'guest', isImpersonating: false, impersonationInfo: null }
  }
}
