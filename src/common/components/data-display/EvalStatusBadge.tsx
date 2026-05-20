import { cn } from '@/lib/utils'
import { EVAL_STATUS, evalStatusLabel } from '@/services/evaluation'

interface Config {
  dot: string
  badge: string
}

const STATUS_CONFIG: Record<number, Config> = {
  [EVAL_STATUS.NEW]:         { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  [EVAL_STATUS.ASSIGNED]:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  [EVAL_STATUS.IN_PROGRESS]: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  [EVAL_STATUS.EVALUATED]:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [EVAL_STATUS.FINALIZED]:   { dot: 'bg-teal-500',    badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  [EVAL_STATUS.REJECTED]:    { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200' },
  [EVAL_STATUS.UFM]:         { dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const FALLBACK: Config = { dot: 'bg-slate-400', badge: 'bg-muted/40 text-slate-600 border-border' }

interface EvalStatusBadgeProps {
  statusId: number
  className?: string
}

/**
 * Badge for evaluation-specific status codes (New, Assigned, In Progress, Evaluated, etc.)
 * Uses a colored dot + label for instant visual scanning.
 */
export function EvalStatusBadge({ statusId, className }: EvalStatusBadgeProps) {
  const { dot, badge } = STATUS_CONFIG[statusId] ?? FALLBACK

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        badge,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {evalStatusLabel(statusId)}
    </span>
  )
}
