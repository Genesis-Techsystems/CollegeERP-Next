import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  /** Page content */
  children: ReactNode
  /** Additional CSS classes for the outer wrapper */
  className?: string
}

/**
 * Standard page wrapper that applies consistent outer padding.
 * Wraps every page's content to ensure uniform spacing.
 *
 * Uses --spacing-page-x and --spacing-page-y CSS tokens.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'px-[var(--spacing-page-x)] py-[var(--spacing-page-y)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
