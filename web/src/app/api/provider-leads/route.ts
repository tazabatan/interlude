import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import { sendProviderLeadEmail } from '@/lib/email/provider-leads'

type LeadPayload = {
  name?: string | null
  email?: string | null
  company?: string | null
  providerType?: string | null
  location?: string | null
  website?: string | null
  message?: string | null
  phone?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as LeadPayload
    const email = body.email?.trim()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const payload = {
      name: body.name?.trim() || null,
      email,
      company: body.company?.trim() || null,
      provider_type: body.providerType?.trim() || null,
      location: body.location?.trim() || null,
      website: body.website?.trim() || null,
      message: body.message?.trim() || null,
      phone: body.phone?.trim() || null,
    }

    await serviceRoleFetch('/rest/v1/provider_leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    await sendProviderLeadEmail({
      name: payload.name,
      email: payload.email,
      company: payload.company,
      providerType: payload.provider_type,
      location: payload.location,
      website: payload.website,
      message: payload.message,
      phone: payload.phone,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('provider-leads POST failed', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
