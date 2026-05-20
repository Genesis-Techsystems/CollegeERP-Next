import type { LucideIcon } from 'lucide-react'
import { InboxIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Optional icon to display above the title */
  icon?: LucideIcon
  /** Primary message */
  title: string
  /** Secondary descriptive message */
  description?: string
  /** Optional call-to-action button */
  action?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
}

/**
 * Empty state display for lists, tables, and data sections.
 * Shows an icon, title, optional description, and optional action.
 */
export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
