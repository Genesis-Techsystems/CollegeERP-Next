'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Angular SIS filter card chrome (teal title, slate filter control). */
export const FILTER_CARD_THEME = {
  titleTeal: '#5da394',
  labelSlate: '#334155',
} as const

/** Use on `<Select>` inside a FilterCard for Angular-matched label + trigger styling. */
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
        'overflow-hidden rounded-[10px] border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2
          className="text-[15px] font-semibold leading-none"
          style={{ color: FILTER_CARD_THEME.titleTeal }}
        >
          {title}
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:opacity-80"
          style={{ color: FILTER_CARD_THEME.labelSlate }}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Filter
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div className={cn('px-4 py-4', bodyClassName)}>
          {fieldMaxWidth ? <div style={{ maxWidth: fieldMaxWidth }}>{children}</div> : children}
        </div>
      ) : null}
    </div>
  )
}
