import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ValueGetterParams } from 'ag-grid-community'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** AG Grid valueGetter that returns a 1-based sequential row number. */
export function rowIndexGetter(p: ValueGetterParams): number {
  const rowIndex = p.node?.rowIndex ?? 0

  const contextOffset = Number((p as ValueGetterParams & { context?: any }).context?.__rowNumberOffset ?? 0)
  if (Number.isFinite(contextOffset) && contextOffset > 0) {
    return contextOffset + rowIndex + 1
  }

  // When client-side pagination is enabled, AG Grid resets `rowIndex` per page.
  // Offset by the current page so SI.No remains continuous across pages.
  const api = (p as ValueGetterParams & { api?: any }).api
  if (api && typeof api.paginationGetCurrentPage === 'function' && typeof api.paginationGetPageSize === 'function') {
    const page = Number(api.paginationGetCurrentPage())
    const pageSize = Number(api.paginationGetPageSize())
    if (Number.isFinite(page) && Number.isFinite(pageSize) && page >= 0 && pageSize > 0) {
      return page * pageSize + rowIndex + 1
    }
  }

  return rowIndex + 1
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
