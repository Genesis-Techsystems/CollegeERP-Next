'use client'

import type { ReactNode } from 'react'
import { Breadcrumb, useBreadcrumb } from '@/common/components/breadcrumb'

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

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const breadcrumbs = useBreadcrumb()

  return (
    <div className="pb-4 border-b border-[hsl(var(--border))] mb-6 space-y-2">
      <Breadcrumb items={breadcrumbs} maxItems={5} />
      <div className="flex items-start justify-between">
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
    </div>
  )
}
