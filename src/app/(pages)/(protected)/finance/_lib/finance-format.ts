export function humanizeFieldKey(key: string): string {
  return key
    .replace(/^fk_|^pk_|^in_/g, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatFinanceNumber(value: unknown): string {
  const n = Number(value)
  if (Number.isNaN(n)) return value == null || value === '' ? '' : String(value)
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
