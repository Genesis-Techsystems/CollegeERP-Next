import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface FilterBarProps {
  /** Filter controls to render inside the bar */
  children: ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * Horizontal filter bar container for list page filter areas.
 * Provides consistent layout and spacing for filter controls.
 *
 * @example
 * <FilterBar>
 *   <Select label="University" ... />
 *   <Select label="Course" ... />
 *   <SearchInput ... />
 * </FilterBar>
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border bg-card p-[var(--spacing-card-y)_var(--spacing-card-x)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
