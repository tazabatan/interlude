import AdminVenueExperience from "./venue-experience"
import { fetchAdminVenueRecords } from "./data"

export default async function AdminVenuePage() {
  const initialVenues = await fetchAdminVenueRecords()
  return <AdminVenueExperience initialVenues={initialVenues} />
}
