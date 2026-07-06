import type { LucideIcon } from 'lucide-react'

export interface FormSectionHeaderProps {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
}

export function FormSectionHeader({ icon: Icon, title, action }: FormSectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 bg-sky-50/60 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span>{title}</span>
      </div>
      {action}
    </div>
  )
}
