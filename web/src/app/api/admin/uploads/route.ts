import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'venue-media'

const normalizeFileName = (name: string) => {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
  return cleaned || 'asset'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const role = (user.user_metadata?.app_role as string | undefined) ?? 'guest'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as { fileName?: string | null }
    const fileName = body.fileName?.trim()
    if (!fileName) return NextResponse.json({ error: 'fileName is required' }, { status: 400 })

    const admin = getSupabaseAdminClient()
    const path = `uploads/${randomUUID()}/${normalizeFileName(fileName)}`
    const { data, error } = await admin.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path, { upsert: true })

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
    }

    return NextResponse.json({ uploadUrl: data.signedUrl, path })
  } catch (error) {
    console.error('upload presign error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
