import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardTrend {
  /** Numeric trend value (e.g. 12 for +12%) */
  value: number
  /** Display label (e.g. "+12% from last month") */
  label: string
  /** Direction for icon selection */
  direction: 'up' | 'down' | 'neutral'
}

interface StatCardProps {
  /** Card title label */
  title: string
  /** Primary value to display */
  value: string | number
  /** Lucide icon component */
  icon: LucideIcon
  /** Optional trend indicator */
  trend?: StatCardTrend
  /** Whether data is loading — shows skeleton */
  isLoading?: boolean
  /** Color variant for the icon background */
  colorVariant?: 'default' | 'success' | 'warning' | 'error'
  /** Additional CSS classes */
  className?: string
}

const VARIANT_STYLES = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  error: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
}

/**
 * Stat card for dashboard metrics.
 * Displays a title, value, icon, and optional trend indicator.
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  isLoading = false,
  colorVariant = 'default',
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-[var(--radius-card)] border bg-card p-4', className)}>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    )
  }

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus

  return (
    <div className={cn('rounded-[var(--radius-card)] border bg-card p-4', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2', VARIANT_STYLES[colorVariant])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  )
}
