import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TableCardProps {
  className?: string
  /** Left side of header (e.g., search) */
  headerLeft?: ReactNode
  /** Right side of header (e.g., buttons) */
  headerRight?: ReactNode
  /** Optional top border under header */
  withHeaderBorder?: boolean
  children: ReactNode
}

/**
 * Standardized table wrapper with consistent spacing, shadows, and header layout.
 * Use across the app wherever a table is shown to match the global design.
 */
export function TableCard({
  className,
  headerLeft,
  headerRight,
  withHeaderBorder = true,
  children,
}: TableCardProps) {
  return (
    <div className={cn('app-card overflow-hidden', className)}>
      {(headerLeft || headerRight) && (
        <div className="table-toolbar flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">{headerLeft}</div>
          <div className="flex items-center gap-2 shrink-0">{headerRight}</div>
        </div>
      )}
      <div className={cn(withHeaderBorder && 'border-t border-border', 'p-2')}>
        {children}
      </div>
    </div>
  )
}

