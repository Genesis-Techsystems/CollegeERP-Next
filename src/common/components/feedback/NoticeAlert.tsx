import type { ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NoticeAlertProps = {
  type: 'success' | 'error'
  title: string
  showIcon?: boolean
  action?: ReactNode
  className?: string
}

export function NoticeAlert({ type, title, showIcon = true, action, className }: NoticeAlertProps) {
  const isSuccess = type === 'success'
  const Icon = isSuccess ? CheckCircle2 : XCircle

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-red-200 bg-red-50 text-red-900',
        className,
      )}
    >
      {showIcon ? (
        <Icon
          className={cn('mt-0.5 h-4 w-4 shrink-0', isSuccess ? 'text-emerald-600' : 'text-red-600')}
          aria-hidden
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{title}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
