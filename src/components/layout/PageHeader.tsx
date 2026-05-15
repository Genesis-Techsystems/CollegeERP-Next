'use client'

import type { ReactNode } from 'react'

/**
 * Page-level header with title, optional subtitle, and an optional action slot.
 * Use the `action` prop to render CTA buttons, dropdowns, or any header controls.
 */
interface PageHeaderProps {
  /** Kept for call-site consistency; page titles live in card/toolbar headers instead */
  title: string
  subtitle?: string
  /** Alias for subtitle — legacy call sites from Angular migration */
  description?: string
  /** Optional slot for action controls (buttons, menus, etc.) rendered on the right */
  action?: ReactNode
}

/**
 * Top-of-page chrome is intentionally minimal: the large duplicate title (navy h1) was
 * removed app-wide — each screen uses its in-card / filter header for the visible title.
 * Render only when `action` is passed.
 */
export function PageHeader({ title: _title, subtitle: _subtitle, description: _description, action }: PageHeaderProps) {
  if (!action) return null
  return (
    <div className="mb-3 border-b border-[hsl(var(--border))] pb-2">
      <div className="flex items-start justify-end">{action}</div>
    </div>
  )
}
