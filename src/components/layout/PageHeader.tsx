'use client'

import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  action?: ReactNode
}

/**
 * Page-level heading rendered above filter cards and tables.
 * Title + subtitle sit outside the filter card (Approvals reference layout).
 */
export function PageHeader({ title, subtitle, description, action }: PageHeaderProps) {
  const sub = subtitle ?? description

  return (
    <div className="page-header flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="page-header__title">{title}</h1>
        {sub ? <p className="page-header__subtitle">{sub}</p> : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </div>
  )
}
