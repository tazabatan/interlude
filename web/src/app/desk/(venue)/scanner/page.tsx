import { notFound } from 'next/navigation'
import { getUserRole } from '@/lib/get-user-role'
import { serviceRoleFetch } from '@/lib/supabase/service-role'
import ScannerClient from './scanner-client'
import { generateScannerTokenAction } from '../actions'

type VenueRecord = {
  id: string
  name: string | null
  scan_device_token?: string | null
  scan_device_token_generated_at?: string | null
}

function getSiteUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? 'http://localhost:3000'
  return base.replace(/\/$/, '')
}

export default async function ScannerSettingsPage() {
  const { user, role } = await getUserRole()
  if (!user || role !== 'venue_manager') {
    notFound()
  }
  const venueId = (user.user_metadata?.venue_id as string | undefined) ?? null
  if (!venueId) {
    notFound()
  }

  const params = new URLSearchParams()
  params.set('id', `eq.${venueId}`)
  params.set('select', 'id,name,scan_device_token,scan_device_token_generated_at')
  params.set('limit', '1')
  const res = await serviceRoleFetch(`/rest/v1/venues?${params.toString()}`)
  const rows = (await res.json()) as VenueRecord[]
  const venue = rows[0]
  if (!venue) {
    notFound()
  }

  const siteUrl = getSiteUrl()
  const registrationUrl =
    venue.scan_device_token && venue.scan_device_token.length
      ? `${siteUrl}/scan/device/register?venueId=${venue.id}&token=${venue.scan_device_token}`
      : null

  return (
    <div className="space-y-6 text-[#02374D]">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6F716D]">Scanner setup</p>
        <h1 className="text-3xl font-semibold">Camera check-in</h1>
        <p className="text-sm text-[#4F514D]">
          Generate a device token once per camera device. Staff can then scan guest passes straight from their native camera.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-[#E8E4D7] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Device token</h2>
            <p className="text-sm text-[#4F514D]">Share this securely with your front-of-house team.</p>
          </div>
          <form action={generateScannerTokenAction}>
            <button
              type="submit"
              className="rounded-full border border-[#02374D] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#02374D] transition hover:bg-[#02374D] hover:text-white"
            >
              {venue.scan_device_token ? 'Regenerate token' : 'Generate token'}
            </button>
          </form>
        </div>

        <ScannerClient
          venueName={venue.name ?? 'Venue'}
          token={venue.scan_device_token ?? null}
          generatedAt={venue.scan_device_token_generated_at ?? null}
          registrationUrl={registrationUrl}
        />
      </section>

      <section className="space-y-2 rounded-3xl border border-[#E8E4D7] bg-[#F9F6ED] p-6 text-sm text-[#4F514D]">
        <h2 className="text-base font-semibold text-[#02374D]">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Generate a device token above.</li>
          <li>On each front-of-house device, scan the registration QR to register that phone/tablet.</li>
          <li>
            Staff can then open their native camera, scan a guest’s Interlude pass, and tap the banner to check them in—no
            extra app needed.
          </li>
          <li>Regenerate the token anytime you want to revoke older devices.</li>
        </ol>
      </section>
    </div>
  )
}
