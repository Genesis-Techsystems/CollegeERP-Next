'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GlobalFilterBarProps {
  children: ReactNode
  className?: string
  /** Optional top row — e.g. radio toggles (Is For University / College). */
  leading?: ReactNode
  /** Title shown on the left of the filter header row. */
  title?: ReactNode
  /** Enables collapsible filter body. */
  collapsible?: boolean
  /** Default open state when collapsible. */
  defaultOpen?: boolean
  /** Controlled open state when collapsible. */
  open?: boolean
  /** Called when open state changes (controlled/uncontrolled). */
  onOpenChange?: (open: boolean) => void
}

/**
 * Filter card with optional leading row + one or more field rows (`GlobalFilterBarRow`).
 */
export function GlobalFilterBar({
  children,
  className,
  leading,
  title = 'Filters',
  collapsible = true,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: GlobalFilterBarProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = collapsible ? (openProp ?? internalOpen) : true

  function setOpen(next: boolean) {
    onOpenChange?.(next)
    if (openProp === undefined) setInternalOpen(next)
  }

  return (
    <div
      className={cn(
        'global-filter-bar app-card overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.05)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <h2 className="app-card-title">{title}</h2>
        {collapsible ? (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="global-filter-bar__inner">
          {leading ? (
            <div className="global-filter-bar__row global-filter-bar__row--leading">{leading}</div>
          ) : null}
          {children}
        </div>
      ) : null}
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
