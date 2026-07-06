'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface GlobalFilterFieldProps {
  /** Uppercase label text shown above the control (e.g. "University"). */
  label: string
  /** Optional icon rendered before the label. */
  icon?: LucideIcon
  className?: string
  children: ReactNode
}

export function GlobalFilterField({
  label,
  icon: Icon,
  className,
  children,
}: GlobalFilterFieldProps) {
  return (
    <div className={cn('global-filter-field', className)}>
      <div className="global-filter-field__label">
        {Icon ? <Icon className="global-filter-field__icon" aria-hidden /> : null}
        <span>{label}</span>
      </div>
      <div className="global-filter-field__control">{children}</div>
    </div>
  )
}
