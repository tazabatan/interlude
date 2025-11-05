import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/explore')
  }

  redirect('/auth')
  return null
}
