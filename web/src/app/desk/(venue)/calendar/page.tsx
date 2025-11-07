import { fetchBookingsByDateRange, fetchPassInventoryByDateRange } from '@/lib/desk'
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

  const [bookings, inventory] = await Promise.all([
    fetchBookingsByDateRange(startDate, endDate),
    fetchPassInventoryByDateRange(startDate, endDate),
  ])

  return (
    <div className="w-full text-[#02374D]">
      <CalendarClient bookings={bookings} inventory={inventory} />
    </div>
  )
}
