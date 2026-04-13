import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type TagColor =
  | 'magenta'
  | 'red'
  | 'volcano'
  | 'orange'
  | 'gold'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'geekblue'
  | 'purple'
  | 'gray'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  color?: TagColor
  /** Compact text size (defaults to true for dense tables) */
  compact?: boolean
}

const COLOR_MAP: Record<TagColor, string> = {
  magenta: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  volcano: 'bg-orange-50 text-orange-700 border-orange-200',
  orange: 'bg-amber-50 text-amber-700 border-amber-200',
  gold: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  lime: 'bg-lime-50 text-lime-700 border-lime-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  geekblue: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  gray: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function Tag({ color = 'gray', compact = true, className, children, ...rest }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border',
        compact ? 'px-2 py-0.5 text-[11px] font-medium' : 'px-2.5 py-0.5 text-xs font-medium',
        COLOR_MAP[color],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

