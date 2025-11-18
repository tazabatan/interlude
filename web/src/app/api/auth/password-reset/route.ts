import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/emails'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string | null } | null
  const email = body?.email?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const redirectUrl = `${SITE_URL}/auth/callback`
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message ?? 'Unable to send reset link.' }, { status: 400 })
    }

    await sendPasswordResetEmail({
      recipient: { email },
      resetUrl: data.properties.action_link,
      supportUrl: `${SITE_URL}/support`,
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[auth] reset email failed', err)
    return NextResponse.json({ error: 'Unable to send reset email.' }, { status: 500 })
  }
}
