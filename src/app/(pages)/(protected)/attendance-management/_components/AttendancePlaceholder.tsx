'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getAttendanceConfig } from '../_lib/route-config'

type AttendancePlaceholderProps = { slug: string }

export function AttendancePlaceholder({ slug }: AttendancePlaceholderProps) {
  const config = getAttendanceConfig(slug)

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{config.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          This screen mirrors Angular route{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{config.angularPath}</code>. Workflow
          UI will be ported incrementally onto the shared services layer.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/attendance-management/attendance-dashboard">Back to Attendance Dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
