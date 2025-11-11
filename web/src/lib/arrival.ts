const REQUESTED_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d{1,6})?)?$/

function formatTimeParts(hours: number, minutes: number) {
  const period = hours >= 12 ? 'PM' : 'AM'
  const normalizedHour = hours % 12 === 0 ? 12 : hours % 12
  const minuteLabel = String(minutes).padStart(2, '0')
  return `${normalizedHour}:${minuteLabel}${period}`
}

export function formatRequestedArrival(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(REQUESTED_TIME_PATTERN)
  if (!match) return trimmed
  const hours = Number.parseInt(match[1] ?? '0', 10)
  const minutes = Number.parseInt(match[2] ?? '0', 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return trimmed
  return formatTimeParts(hours, minutes)
}

export function formatArrivalRange(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return 'Arrival time TBD'
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Arrival time TBD'
  }
  const startLabel = formatTimeParts(start.getHours(), start.getMinutes())
  const endLabel = formatTimeParts(end.getHours(), end.getMinutes())
  return `${startLabel} – ${endLabel}`
}

export function formatArrivalValue(
  requestedTime: string | null,
  startIso: string | null,
  endIso: string | null
): string {
  if (requestedTime && requestedTime.trim()) {
    return formatRequestedArrival(requestedTime)
  }
  return formatArrivalRange(startIso, endIso)
}

export function buildArrivalDisplay(
  requestedTime: string | null,
  startIso: string | null,
  endIso: string | null
) {
  return {
    label: 'Arrival time' as const,
    value: formatArrivalValue(requestedTime, startIso, endIso),
  }
}
