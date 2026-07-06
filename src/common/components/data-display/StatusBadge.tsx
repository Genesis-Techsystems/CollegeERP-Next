import { cn } from '@/lib/utils'

type StatusVariant = 'active' | 'inactive' | 'pending' | 'draft' | 'published'

interface StatusBadgeProps {
  /** The status to display. Booleans map to active/inactive. */
  status: StatusVariant | boolean
  /** Override the display label. Defaults to capitalized variant name. */
  label?: string
  /** Legacy alias for `label` when status is active */
  activeLabel?: string
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
export function StatusBadge({ status, label, activeLabel, className }: StatusBadgeProps) {
  const variant: StatusVariant = typeof status === 'boolean'
    ? status ? 'active' : 'inactive'
    : status

  const displayLabel = label ?? activeLabel ?? (variant.charAt(0).toUpperCase() + variant.slice(1))

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold',
        STATUS_STYLES[variant],
        className,
      )}
    >
      {displayLabel}
    </span>
  )
}
