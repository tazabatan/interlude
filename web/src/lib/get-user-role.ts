import { getSupabaseServer } from './supabase/server'

export async function getUserRole() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = (user?.user_metadata?.app_role as string | undefined) ?? 'guest'
  return { role, user }
}
