'use client'

import { useMemo } from 'react'

/** Client-side filter matching Angular MatTableDataSource `filter`. */
export function useFilteredRows<T extends Record<string, unknown>>(
  rows: T[],
  search: string,
): T[] {
  return useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q)),
    )
  }, [rows, search])
}
