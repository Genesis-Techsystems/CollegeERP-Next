'use client'

import { usePathname } from 'next/navigation'
import type { BreadcrumbItem } from './Breadcrumb'

/**
 * Converts a URL path segment into a human-readable label.
 *
 * Examples:
 *   'admin-examination-management' → 'Admin Examination Management'
 *   'dashboard'                    → 'Dashboard'
 */
function segmentToLabel(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Builds breadcrumb items from the current Next.js pathname.
 *
 * When `customItems` are provided they are returned as-is, letting the caller
 * override auto-generation for any route that requires a non-default label or
 * a non-standard path hierarchy.
 *
 * Auto-generation rules:
 *   - Always inserts a "Home → /dashboard" root item.
 *   - Skips empty segments and App Router route groups (segments that start
 *     with `(`), e.g. `(protected)`, `(public)`.
 *   - Every non-terminal segment receives an `href` so it is rendered as a
 *     link; the terminal segment has no `href` (current page, plain text).
 *
 * @example
 * // pathname: /admin/examination-management/grades
 * // returns:
 * // [
 * //   { label: 'Home',                      href: '/dashboard' },
 * //   { label: 'Admin',                     href: '/admin' },
 * //   { label: 'Examination Management',    href: '/admin/examination-management' },
 * //   { label: 'Grades' },
 * // ]
 */
export function useBreadcrumb(customItems?: BreadcrumbItem[]): BreadcrumbItem[] {
  const pathname = usePathname()

  if (customItems !== undefined) {
    return customItems
  }

  // Strip route-group segments such as (protected) or (public).
  const segments = pathname
    .split('/')
    .filter((s): s is string => s.length > 0 && !s.startsWith('('))

  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/dashboard' }]

  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += '/' + segment
    const isLast = index === segments.length - 1
    items.push({
      label: segmentToLabel(segment),
      href: isLast ? undefined : currentPath,
    })
  })

  return items
}
