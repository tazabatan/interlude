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
  venueTz: string | null | undefined,
  cutoffMinutes: number = 60,
) {
  // If we have an arrival window start time, use it as the anchor
  if (arrivalStartIso) {
    const arrivalStart = new Date(arrivalStartIso)
    if (!Number.isNaN(arrivalStart.getTime())) {
      // Compute "now" in the venue timezone
      const now = new Date()
      const nowLocale = new Date(
        new Intl.DateTimeFormat('en-US', {
          timeZone: venueTz ?? 'America/Anguilla',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now).replace(
          /(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/,
          '$3-$1-$2T$4:$5:$6',
        ),
      )
      const cutoff = arrivalStart.getTime() - cutoffMinutes * 60 * 1000
      return nowLocale.getTime() > cutoff
    }
  }
  // Fallback to simple date comparison (treat missing times as past once the day has passed)
  return isPastDate(dateIso)
}
