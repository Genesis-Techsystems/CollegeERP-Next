'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface GlobalFilterBarProps {
  children: ReactNode
  className?: string
  /** Optional top row — e.g. radio toggles (Is For University / College). */
  leading?: ReactNode
}

/**
 * Filter card with optional leading row + one or more field rows (`GlobalFilterBarRow`).
 */
export function GlobalFilterBar({ children, className, leading }: GlobalFilterBarProps) {
  return (
    <div className={cn('global-filter-bar', className)}>
      <div className="global-filter-bar__inner">
        {leading ? (
          <div className="global-filter-bar__row global-filter-bar__row--leading">{leading}</div>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export interface GlobalFilterBarRowProps {
  children: ReactNode
  className?: string
  /** Even column grid — 2 or 3 fields per row. Omit for a single horizontal flex row. */
  columns?: 2 | 3
}

export function GlobalFilterBarRow({ children, className, columns }: GlobalFilterBarRowProps) {
  return (
    <div
      className={cn(
        'global-filter-bar__row global-filter-bar__row--fields',
        columns === 2 && 'global-filter-bar__row--cols-2',
        columns === 3 && 'global-filter-bar__row--cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}
