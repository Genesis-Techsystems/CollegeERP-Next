'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getTimetableConfig } from '../_lib/route-config'

type TimetablePlaceholderProps = { slug: string }

export function TimetablePlaceholder({ slug }: TimetablePlaceholderProps) {
  const config = getTimetableConfig(slug)

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{config.title}</h1>
        {config.description ? (
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{config.description}</p>
        ) : null}
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          This screen mirrors Angular route{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">time-table-management/{slug}</code>.
          Workflow UI will be added incrementally on the shared timetable services layer.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/time-table-management/timetable-dashboard">Back to Timetable Dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
