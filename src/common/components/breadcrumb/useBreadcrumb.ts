'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { BreadcrumbItem } from './Breadcrumb'
import { useBreadcrumbStore } from '@/store/breadcrumb-store'
import { useNavigationStore } from '@/store/navigation-store'
import { findNavBreadcrumbItems } from '@/lib/navigation'

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
  const lastSegmentLabel = useBreadcrumbStore((s) => s.lastSegmentLabel)
  const navItems = useNavigationStore((s) => s.navItems)

  if (customItems !== undefined) {
    return customItems
  }

  const navBreadcrumb = navItems.length > 0
    ? findNavBreadcrumbItems(navItems, pathname)
    : null

  let items: BreadcrumbItem[]

  if (navBreadcrumb) {
    items = navBreadcrumb
  } else {
    // Strip route-group segments such as (protected) or (public).
    const segments = pathname
      .split('/')
      .filter((s): s is string => s.length > 0 && !s.startsWith('('))

    items = [{ label: 'Home', href: '/dashboard' }]

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += '/' + segment
      const isLast = index === segments.length - 1

      items.push({
        label: segmentToLabel(segment),
        href: isLast ? undefined : currentPath,
      })

      // Admin module: insert submodule label so breadcrumb matches Angular's
      // "Admin → Master Settings → <Page>" hierarchy even when the sidebar/nav
      // metadata isn't available client-side.
      const isAdminRoot = segment === 'admin' && index === 0
      if (isAdminRoot && segments.length >= 2) {
        items.push({ label: 'Master Settings' })
      }
    })
  }

  if (lastSegmentLabel && items.length > 0) {
    const last = items[items.length - 1]
    items[items.length - 1] = { ...last, label: lastSegmentLabel }
  }

  return items
}

/**
 * Page-level override for the LAST breadcrumb segment label. Parent segments
 * stay auto-generated. Pass `null` (or omit during cleanup) to fall back to
 * the URL-derived label.
 *
 * @example
 *   useBreadcrumbLabel(isEditMode ? 'Edit Exam Fee Structure' : 'Add Exam Fee Structure')
 */
export function useBreadcrumbLabel(label: string | null): void {
  useEffect(() => {
    useBreadcrumbStore.getState().setLastSegmentLabel(label)
    return () => {
      useBreadcrumbStore.getState().setLastSegmentLabel(null)
    }
  }, [label])
}
