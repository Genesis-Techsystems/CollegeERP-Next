'use client'

import type { ReactNode } from 'react'

/**
 * Page-level header chrome. By app convention the visible page title lives in
 * the card / filter-panel header, not at the top of the route. This component
 * only renders when an `action` slot is supplied (right-aligned controls).
 *
 * `title`, `subtitle`, `description` are accepted for call-site compatibility
 * but intentionally not rendered.
 */
interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ action }: PageHeaderProps) {
  if (!action) return null
  return (
    <div className="mb-3 flex items-start justify-end border-b border-[hsl(var(--border))] pb-3">
      <div className="flex items-center gap-2">{action}</div>
    </div>
  )
}
