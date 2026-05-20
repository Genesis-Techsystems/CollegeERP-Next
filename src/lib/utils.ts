import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ValueGetterParams } from 'ag-grid-community'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** AG Grid valueGetter that returns a 1-based sequential row number. */
export function rowIndexGetter(p: ValueGetterParams): number {
  return (p.node?.rowIndex ?? 0) + 1
}

/**
 * Returns a deduplicated copy of `arr`, preserving the first occurrence of each
 * item as identified by a numeric key returned from `keyFn`.
 */
export function distinct<T>(arr: T[], keyFn: (item: T) => number): T[] {
  const seen = new Set<number>()
  return arr.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
