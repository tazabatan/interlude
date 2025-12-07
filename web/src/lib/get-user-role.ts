import { getSupabaseServer } from './supabase/server'
import { getEffectiveUser } from './impersonation'

export async function getUserRole() {
  // Check if we're in an impersonation session
  const effectiveUserData = await getEffectiveUser()

  if (effectiveUserData.isImpersonating) {
    return {
      role: effectiveUserData.role,
      user: effectiveUserData.user,
      isImpersonating: true,
      impersonationInfo: effectiveUserData.impersonationInfo
    }
  }

  // Normal flow - get actual logged-in user
  const supabase = await getSupabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    // Treat invalid / expired sessions as logged out
    return { role: 'guest', user: null, isImpersonating: false, impersonationInfo: null }
  }

  const role = (user?.user_metadata?.app_role as string | undefined) ?? 'guest'
  return { role, user, isImpersonating: false, impersonationInfo: null }
}
