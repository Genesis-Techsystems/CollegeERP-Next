'use client'

import type { ReactNode } from 'react'

/**
 * Page-level header with title, optional subtitle, and an optional action slot.
 * Use the `action` prop to render CTA buttons, dropdowns, or any header controls.
 */
interface PageHeaderProps {
  /** Primary page title displayed as an h1 */
  title: string
  /** Optional descriptive subtitle rendered below the title */
  subtitle?: string
  /** Optional slot for action controls (buttons, menus, etc.) rendered on the right */
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between pb-4 border-b border-[hsl(var(--border))] mb-6">
      <div>
        <h1 className="font-bold text-foreground" style={{ fontSize: 'var(--font-size-page-title)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
