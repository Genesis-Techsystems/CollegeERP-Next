'use client'

import { getNotificationsConfig } from '../_lib/route-config'
import { NotificationsDashboardPage } from './NotificationsDashboardPage'
import { NotificationsPlaceholder } from './NotificationsPlaceholder'

type NotificationsRoutePageProps = { slug: string }

export function NotificationsRoutePage({ slug }: NotificationsRoutePageProps) {
  const config = getNotificationsConfig(slug)

  if (config.kind === 'hub' && slug === '') {
    return <NotificationsDashboardPage />
  }

  if (slug === 'employee-inbox') {
    return <NotificationsPlaceholder slug={slug} />
  }

  if (slug === '' || slug === 'notifications-dashboard') {
    return <NotificationsDashboardPage />
  }

  return <NotificationsPlaceholder slug={slug} />
}
