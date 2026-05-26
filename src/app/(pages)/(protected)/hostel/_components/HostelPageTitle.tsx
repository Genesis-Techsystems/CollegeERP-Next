import type { ReactNode } from 'react'

interface HostelPageTitleProps {
  title: string
  children?: ReactNode
}

export function HostelPageTitle({ title, children }: Readonly<HostelPageTitleProps>) {
  return (
    <div className="app-card flex flex-wrap items-center justify-between gap-3 overflow-hidden px-4 py-3">
      <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
        {title}
      </h1>
      {children}
    </div>
  )
}
