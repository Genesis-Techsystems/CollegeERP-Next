const STORAGE_KEY = 'ttm-timing-set-context'

export type TimingSetNavContext = {
  timingsetId?: number
  timingsetName?: string
  collegeId?: number
  collegeCode?: string
  academicYearId?: number
  academicYear?: string
}

export function setTimingSetContext(ctx: TimingSetNavContext): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
}

export function getTimingSetContext(): TimingSetNavContext | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TimingSetNavContext
  } catch {
    return null
  }
}

export function clearTimingSetContext(): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}
