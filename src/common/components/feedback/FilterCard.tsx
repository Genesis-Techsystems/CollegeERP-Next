'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Student Details filter-card theme tokens.
 * Kept for pages that still reference FILTER_CARD_THEME for label colors.
 */
export const FILTER_CARD_THEME = {
  titleTeal: 'hsl(var(--primary))',
  labelSlate: '#334155',
} as const

/** Use on `<Select>` inside a FilterCard for consistent label + trigger styling. */
export const FILTER_CARD_SELECT_CLASS =
  "[&_label]:text-[13px] [&_label]:font-medium [&_label]:text-[#334155] [&_button[role='combobox']]:h-9 [&_button[role='combobox']]:rounded-md [&_button[role='combobox']]:border-slate-300 [&_button[role='combobox']]:text-[13px] [&_button[role='combobox']]:shadow-none"

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
  /** Hide the collapse control when the card is always expanded. */
  collapsible?: boolean
}

/**
 * Shared filter card — matches Student Details:
 * muted header bar, title left, Filter + chevron right, collapsible body.
 */
export function FilterCard({
  title,
  children,
  className,
  bodyClassName,
  fieldMaxWidth,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  collapsible = true,
}: FilterCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = openProp ?? internalOpen

  function setOpen(next: boolean) {
    onOpenChange?.(next)
    if (openProp === undefined) setInternalOpen(next)
  }

  return (
    <div className={cn('app-card overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <h2 className="app-card-title">{title}</h2>
        {collapsible ? (
          <Button
            type="button"
            size="sm"
            className="inline-flex h-6 items-center px-2.5 text-[12px] text-muted-foreground"
            style={{ marginRight: '0px' }}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <Filter className="mr-1.5 h-4 w-4" aria-hidden />
            Filter
            <ChevronDown
              className={cn('ml-1.5 h-4 w-4 transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className={cn('p-3', bodyClassName)}>
          {fieldMaxWidth ? <div style={{ maxWidth: fieldMaxWidth }}>{children}</div> : children}
        </div>
      ) : null}
    </div>
  )
}
