import type { ReactNode } from 'react'
import { LayoutGrid } from 'lucide-react'

type WalletPassbookHeaderProps = {
  title: string
  icon?: ReactNode
}

export function WalletPassbookHeader({ title, icon }: WalletPassbookHeaderProps) {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex items-center gap-2 text-[hsl(var(--card-title))]">
        {icon ?? <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
    </div>
  )
}
