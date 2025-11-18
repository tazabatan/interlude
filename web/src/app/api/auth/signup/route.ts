import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendConfirmEmail } from '@/emails'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

type SignupRequest = {
  email?: string
  password?: string
  name?: string
  next?: string | null
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as SignupRequest | null
  const email = body?.email?.trim().toLowerCase()
  const password = body?.password ?? ''
  const name = body?.name?.trim() ?? ''
  const next = body?.next?.trim()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    const redirectUrl = new URL('/auth/callback', SITE_URL)
    if (next) {
      redirectUrl.searchParams.set('next', next)
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: redirectUrl.toString(),
        data: {
          app_role: 'member',
          full_name: name || undefined,
        },
      },
    })

    if (error || !data?.properties?.action_link) {
      return NextResponse.json({ error: error?.message ?? 'Unable to start signup.' }, { status: 400 })
    }

    await sendConfirmEmail({
      recipient: { email, name: name || null },
      confirmUrl: data.properties.action_link,
      supportUrl: `${SITE_URL}/support`,
    })

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('[auth] failed to send signup confirmation', err)
    return NextResponse.json({ error: 'Unable to send confirmation email.' }, { status: 500 })
  }
}
