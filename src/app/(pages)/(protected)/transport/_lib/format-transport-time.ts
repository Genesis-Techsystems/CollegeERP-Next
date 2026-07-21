/** Format HH:mm or HH:mm:ss to 12-hour display (Angular `tConvert`). */
export function formatTransportTime(time: string | null | undefined): string {
  if (!time) return '—'
  const match = time.toString().match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/)
  if (!match) return time
  const hours = Number(match[1])
  const suffix = hours < 12 ? 'AM' : 'PM'
  const h12 = hours % 12 || 12
  return `${h12}${match[2]}${match[3]} ${suffix}`
}

export function toApiDate(date: Date | null | undefined): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Normalize HTML time input (HH:mm) to Angular-style `HH:mm:00` for API payloads. */
export function toApiTime(time: string | null | undefined): string | undefined {
  if (!time) return undefined
  if (/^\d{1,2}:\d{2}$/.test(time)) return `${time}:00`
  return time
}
