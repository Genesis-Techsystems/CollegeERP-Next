'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getMyNotificationsConfig } from '../_lib/route-config'

export function MyNotificationsPage() {
  const config = getMyNotificationsConfig('')

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{config.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Student notifications and announcements inbox — mirrored from Angular{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{config.angularPath}</code>. Full
          list UI will be ported from the Angular NotificationsComponent.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
