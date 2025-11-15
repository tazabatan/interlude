import { serviceRoleFetch } from "@/lib/supabase/service-role"
import { mapVenueRowToRecord, mapPassRowToRecord, type VenueRow, type PassRow, type VenueRecord, type PassRecord } from "./serialization"

const PASS_SELECT_FIELDS = [
  "id",
  "venue_id",
  "created_at",
  "kind",
  "status",
  "currency",
  "min_spend_amount",
  "display_price_text",
  "interlude_perk",
  "visibility",
  "auto_approve_enabled",
  "default_arrival_start_local",
  "default_arrival_window_minutes",
  "service_hours_open_local",
  "service_hours_close_local",
  "arrival_grace_minutes",
  "default_daily_cap",
  "no_show_amount_per_person",
  "cancellation_window_days",
  "cancellation_cutoff_local",
  "profile",
]

export const ADMIN_PASS_SELECT = PASS_SELECT_FIELDS.join(",")

export const ADMIN_VENUE_SELECT = [
  "id",
  "name",
  "tz",
  "status",
  "created_at",
  "profile",
  `passes(${ADMIN_PASS_SELECT})`,
].join(",")

export async function fetchAdminVenueRows(): Promise<VenueRow[]> {
  const res = await serviceRoleFetch(
    `/rest/v1/venues?select=${encodeURIComponent(ADMIN_VENUE_SELECT)}&order=created_at.asc`
  )
  return (await res.json()) as VenueRow[]
}

export async function fetchAdminVenueRecords(): Promise<VenueRecord[]> {
  const rows = await fetchAdminVenueRows()
  return rows.map(mapVenueRowToRecord)
}

export async function fetchAdminVenueRowById(venueId: string): Promise<VenueRow | null> {
  const res = await serviceRoleFetch(
    `/rest/v1/venues?id=eq.${venueId}&limit=1&select=${encodeURIComponent(ADMIN_VENUE_SELECT)}`
  )
  const rows = (await res.json()) as VenueRow[]
  return rows[0] ?? null
}

export async function fetchAdminVenueRecordById(venueId: string): Promise<VenueRecord | null> {
  const row = await fetchAdminVenueRowById(venueId)
  return row ? mapVenueRowToRecord(row) : null
}

export async function fetchAdminPassRowById(passId: string): Promise<PassRow | null> {
  const res = await serviceRoleFetch(
    `/rest/v1/passes?id=eq.${passId}&limit=1&select=${encodeURIComponent(ADMIN_PASS_SELECT)}`
  )
  const rows = (await res.json()) as PassRow[]
  return rows[0] ?? null
}

export async function fetchAdminPassRecordById(passId: string): Promise<PassRecord | null> {
  const row = await fetchAdminPassRowById(passId)
  return row ? mapPassRowToRecord(row) : null
}
