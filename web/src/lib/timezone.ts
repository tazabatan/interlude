export function formatTimezoneOffset(timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    const parts = formatter.formatToParts(new Date())
    const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
    return zoneName.replace('GMT', 'UTC')
  } catch {
    return 'UTC'
  }
}

export function formatTimezoneLabel(timeZone: string): string {
  // For Anguilla, always show just "Anguilla"
  if (timeZone === 'America/Anguilla') {
    return 'Anguilla'
  }

  // For other timezones, extract city name only (no offset for pass cards)
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone
  return city
}
