/** Angular `date:'dd-MM-yyyy hh:mm:ss'` for affiliated college reports. */
export function formatAffiliatedDateTime(value: unknown): string {
  if (value == null || value === '') return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
