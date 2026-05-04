import { cn } from '@/lib/utils'

type StatusVariant = 'active' | 'inactive' | 'pending' | 'draft' | 'published'

interface StatusBadgeProps {
  /** The status to display. Booleans map to active/inactive. */
  status: StatusVariant | boolean
  /** Override the display label. Defaults to capitalized variant name. */
  label?: string
  /** Additional CSS classes */
  className?: string
}

const STATUS_STYLES: Record<StatusVariant, string> = {
  active: 'bg-[var(--color-status-active)]/15 text-[var(--color-status-active)] border-[var(--color-status-active)]/30',
  inactive: 'bg-[var(--color-status-inactive)]/15 text-[var(--color-status-inactive)] border-[var(--color-status-inactive)]/30',
  pending: 'bg-[var(--color-status-pending)]/15 text-[var(--color-status-pending)] border-[var(--color-status-pending)]/30',
  draft: 'bg-[var(--color-status-draft)]/15 text-[var(--color-status-draft)] border-[var(--color-status-draft)]/30',
  published: 'bg-[var(--color-status-published)]/15 text-[var(--color-status-published)] border-[var(--color-status-published)]/30',
}

/**
 * Consistent status indicator badge across the app.
 * Maps status strings to semantic color tokens from CSS variables.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant: StatusVariant = typeof status === 'boolean'
    ? status ? 'active' : 'inactive'
    : status

  const displayLabel = label ?? (variant.charAt(0).toUpperCase() + variant.slice(1))

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-badge)] border px-2.5 py-0.5 text-[10px] font-medium',
        STATUS_STYLES[variant],
        className,
      )}
    >
      {displayLabel}
    </span>
  )
}
