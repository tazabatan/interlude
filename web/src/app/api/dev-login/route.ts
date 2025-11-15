import { NextResponse, type NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEV_VENUE_ID = '11111111-2222-3333-4444-555555555555'
const DEV_VENUE_NAME = process.env.DEV_VENUE_NAME ?? 'Belmond Cap Juluca'

type DevAccount = {
  email: string
  password: string
  metadata: Record<string, unknown>
  defaultNext: string
  ensureVenue?: boolean
}

const DEV_ACCOUNTS: Record<string, DevAccount> = {
  admin: {
    email: 'dev-admin@interlude.local',
    password: 'AdminPass123!',
    metadata: { app_role: 'admin' },
    defaultNext: '/admin',
  },
  venue: {
    email: 'dev-venue@interlude.local',
    password: 'VenuePass123!',
    metadata: {
      app_role: 'venue_manager',
      venue_id: DEV_VENUE_ID,
    },
    defaultNext: '/desk',
    ensureVenue: true,
  },
  desk: {
    email: 'dev-desk@interlude.local',
    password: 'DeskPass123!',
    metadata: {
      app_role: 'venue_staff',
      venue_id: DEV_VENUE_ID,
    },
    defaultNext: '/desk',
    ensureVenue: true,
  },
}

async function findUserByEmail(admin: SupabaseClient<any, any, any, any>, email: string) {
  let page = 1
  const perPage = 200

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    if (!data) break
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

async function ensureUser(admin: SupabaseClient<any, any, any, any>, account: DevAccount) {
  const existing = await findUserByEmail(admin, account.email)
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: account.metadata,
      app_metadata: { provider: 'email' },
    })
    if (error) throw new Error(`Failed to create ${account.email}: ${error.message}`)
    return
  }

  const mergedMetadata = { ...(existing.user_metadata ?? {}), ...account.metadata }
  const updates: {
    user_metadata?: Record<string, unknown>
    password?: string
  } = {}

  const metadataChanged = JSON.stringify(existing.user_metadata ?? {}) !== JSON.stringify(mergedMetadata)
  if (metadataChanged) updates.user_metadata = mergedMetadata
  if (account.password) updates.password = account.password

  if (Object.keys(updates).length === 0) return

  const { error } = await admin.auth.admin.updateUserById(existing.id, updates)
  if (error) throw new Error(`Failed to update ${account.email}: ${error.message}`)
}

async function ensureSeedVenue(admin: SupabaseClient<any, any, any, any>) {
  const { error } = await admin
    .from('venues')
    // Supabase client isn't typed with our schema yet, so cast to satisfy TS
    .upsert(
      {
        id: DEV_VENUE_ID,
        name: DEV_VENUE_NAME,
        tz: 'America/Anguilla',
        is_test_venue: true,
      } as any,
      { onConflict: 'id' }
    )
  if (error) throw new Error(`Failed to upsert seed venue: ${error.message}`)
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
  }

  const role = req.nextUrl.searchParams.get('role') ?? 'admin'
  const account = DEV_ACCOUNTS[role]
  if (!account) {
    return NextResponse.json({ error: `Unsupported role "${role}"` }, { status: 400 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    if (account.ensureVenue) {
      await ensureSeedVenue(admin)
    }

    await ensureUser(admin, account)

    const nextParam = req.nextUrl.searchParams.get('next') ?? account.defaultNext
    const callback = new URL('/auth/callback', siteUrl)
    callback.searchParams.set('next', nextParam)

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: account.email,
      options: { redirectTo: callback.toString() },
    })

    if (error || !data?.properties?.action_link) {
      throw new Error(error?.message ?? 'generateLink returned no action link')
    }

    return NextResponse.redirect(data.properties.action_link)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[dev-login]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
