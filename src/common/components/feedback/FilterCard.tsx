'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Use on `<Select>` inside a FilterCard for consistent trigger styling. */
export const FILTER_CARD_SELECT_CLASS =
  "[&_button[role='combobox']]:h-9 [&_button[role='combobox']]:text-[13px]"

export interface FilterCardProps {
  title: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** Constrains filter fields width (e.g. single student search). */
  fieldMaxWidth?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FilterCard({
  title,
  children,
  className,
  bodyClassName,
  fieldMaxWidth,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: FilterCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp ?? internalOpen

  function setOpen(next: boolean) {
    onOpenChange?.(next)
    if (openProp === undefined) setInternalOpen(next)
  }

  return (
    <div
      className={cn(
        'app-card overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.05)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <h2 className="app-card-title">{title}</h2>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle filters"
          aria-expanded={open}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className={cn('px-3 py-3', bodyClassName)}>
          {fieldMaxWidth ? <div style={{ maxWidth: fieldMaxWidth }}>{children}</div> : children}
        </div>
      ) : null}
    </div>
  )
}
