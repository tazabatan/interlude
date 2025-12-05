export function isPastDate(dateIso: string | null | undefined) {
  if (!dateIso) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bookingDate = new Date(dateIso)
  if (Number.isNaN(bookingDate.getTime())) return false
  bookingDate.setHours(0, 0, 0, 0)
  return bookingDate < today
}

export function isPastArrivalCutoff(
  dateIso: string | null | undefined,
  arrivalStartIso: string | null | undefined,
  cutoffMinutes: number = 60,
) {
  // If we have an arrival window start time, use it as the anchor
  if (arrivalStartIso) {
    const arrivalStart = new Date(arrivalStartIso)
    if (!Number.isNaN(arrivalStart.getTime())) {
      const cutoff = arrivalStart.getTime() - cutoffMinutes * 60 * 1000
      return Date.now() > cutoff
    }
  }
  // Fallback to simple date comparison (treat missing times as past once the day has passed)
  return isPastDate(dateIso)
}
