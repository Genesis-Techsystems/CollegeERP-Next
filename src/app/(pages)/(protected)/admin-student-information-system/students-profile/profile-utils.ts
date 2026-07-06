import { formatDate } from '@/common/generic-functions'

type AnyRow = Record<string, any>

export function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const out = String(row?.[key] ?? '').trim()
    if (out) return out
  }
  return ''
}

export function pickDisplay(row: AnyRow | null | undefined, keys: string[], fallback = '—'): string {
  const out = pickText(row, keys)
  return out || fallback
}

export function formatProfileDate(value: unknown): string {
  if (!value) return '—'
  if (value instanceof Date) return formatDate(value.toISOString())
  const raw = String(value).trim()
  if (!raw) return '—'
  const formatted = formatDate(raw)
  return formatted || raw
}

export function studentStatusClass(code: string): string {
  switch (code.toUpperCase().replace(/\s+/g, '')) {
    case 'INCOLLEGE':
      return 'text-emerald-700 font-semibold'
    case 'DTND':
      return 'text-red-600 font-semibold'
    case 'PASSEDOUT':
      return 'text-violet-700 font-semibold'
    case 'DISCONTINUED':
      return 'text-red-600 font-semibold'
    case 'DETAINRECOMMENDED':
      return 'text-orange-600 font-semibold'
    default:
      return 'text-foreground font-medium'
  }
}

export function studentFullName(student: AnyRow): string {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ').trim()
}

export function studentPhotoSrc(path: string | null | undefined): string {
  const raw = String(path ?? '').trim()
  if (!raw) return '/assets/images/avatars/default_Student.png'
  return raw.includes('?') ? raw : `${raw}?${Date.now()}`
}

export type ProfileField = { label: string; value: string }

export function buildFields(pairs: Array<{ label: string; keys: string[]; format?: (v: unknown) => string }>, row: AnyRow): ProfileField[] {
  return pairs.map(({ label, keys, format }) => {
    const raw = keys.reduce<unknown>((found, key) => found ?? row[key], undefined)
    const value = format ? format(raw) : raw == null || raw === '' ? '—' : String(raw)
    return { label, value }
  })
}
