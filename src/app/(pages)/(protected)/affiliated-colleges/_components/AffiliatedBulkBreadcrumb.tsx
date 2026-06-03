'use client'

import { Breadcrumb } from '@/common/components/breadcrumb'

type AffiliatedBulkBreadcrumbProps = {
  current: string
}

/** Angular header: Home > Affiliated College Bulk Uploads > … */
export function AffiliatedBulkBreadcrumb({ current }: AffiliatedBulkBreadcrumbProps) {
  return (
    <Breadcrumb
      className="mb-4"
      items={[
        { label: 'Home', href: '/dashboard' },
        { label: 'Affiliated College Bulk Uploads', href: '/affiliated-colleges/college-bulk-uploads' },
        { label: current },
      ]}
    />
  )
}
