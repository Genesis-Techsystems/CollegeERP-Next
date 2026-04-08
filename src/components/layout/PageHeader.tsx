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

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="pb-2 border-b border-[hsl(var(--border))] mb-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-[hsl(var(--page-title))] text-[20px] leading-[1.15]">
            {title}
          </h1>
          {/* Subtitle intentionally hidden globally per UI preference */}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
