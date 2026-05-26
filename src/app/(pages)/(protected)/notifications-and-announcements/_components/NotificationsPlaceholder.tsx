'use client'

import Link from 'next/link'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getNotificationsConfig } from '../_lib/route-config'

type NotificationsPlaceholderProps = { slug: string }

export function NotificationsPlaceholder({ slug }: NotificationsPlaceholderProps) {
  const config = getNotificationsConfig(slug)

  return (
    <PageContainer className="space-y-5">
      <div className="app-card px-6 py-10 text-center">
        <h1 className="text-lg font-semibold text-[hsl(var(--card-title))]">{config.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          This screen mirrors Angular route{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{config.angularPath}</code>.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link href="/notifications-and-announcements/employee-inbox">Back to Notifications Hub</Link>
        </Button>
      </div>
    </PageContainer>
  )
}
