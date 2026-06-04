'use client'

import { useBreadcrumbLabel } from '@/common/components/breadcrumb'

type AffiliatedBulkBreadcrumbProps = {
  current: string
}

/**
 * Angular header: Home > Affiliated College Bulk Uploads > …
 *
 * The breadcrumb itself now renders globally in AppShell (card above the
 * filters card). This component only overrides the last segment's label so
 * the global breadcrumb shows the page's human-readable name instead of the
 * URL-derived one. It renders nothing.
 */
export function AffiliatedBulkBreadcrumb({ current }: AffiliatedBulkBreadcrumbProps) {
  useBreadcrumbLabel(current)
  return null
}
