export function isPastDate(dateIso: string | null | undefined) {
  if (!dateIso) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bookingDate = new Date(dateIso)
  if (Number.isNaN(bookingDate.getTime())) return false
  bookingDate.setHours(0, 0, 0, 0)
  return bookingDate < today
}

