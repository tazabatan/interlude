import { fetchBookingsByDateRange, fetchPassInventoryByDateRange, fetchVenuePasses } from '@/lib/desk'
import { supabaseServer } from '@/lib/supabase/server'
import { CalendarClient } from './client'

function getMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
  }
}

export default async function DeskCalendarPage() {
  const { startDate, endDate } = getMonthRange()

  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const venueId = user?.user_metadata?.venue_id as string | undefined

  const [bookings, inventory, passes] = await Promise.all([
    fetchBookingsByDateRange(startDate, endDate),
    fetchPassInventoryByDateRange(startDate, endDate),
    venueId ? fetchVenuePasses(venueId) : Promise.resolve([]),
  ])

  return (
    <div className="w-full text-[#02374D]">
      <CalendarClient bookings={bookings} inventory={inventory} passes={passes} />
    </div>
  )
}
