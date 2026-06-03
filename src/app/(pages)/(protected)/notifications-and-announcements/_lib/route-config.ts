export type NotificationsPageKind = 'hub' | 'list' | 'form' | 'inbox'

export type NotificationsPageConfig = {
  slug: string
  title: string
  kind: NotificationsPageKind
  angularPath: string
}

export const NOTIFICATIONS_HUB_CARDS: {
  label: string
  href: string
  description?: string
}[] = [
  {
    label: 'Employee Inbox',
    href: '/notifications-and-announcements/employee-inbox',
    description: 'Notifications for employees (Angular default route)',
  },
  {
    label: 'Notifications List',
    href: '/notifications-and-announcements/notifications-list',
    description: 'Admin notifications and announcements list',
  },
  {
    label: 'Add Notification',
    href: '/notifications-and-announcements/add-notification',
    description: 'Create notification or announcement',
  },
]

const PAGE_META: Record<string, Omit<NotificationsPageConfig, 'slug'>> = {
  'employee-inbox': {
    title: 'Employee Notifications',
    kind: 'inbox',
    angularPath: 'notifications-&-announcements',
  },
  'notifications-list': {
    title: 'Notifications List',
    kind: 'list',
    angularPath: 'notifications-&-announcements/notifications-list',
  },
  'add-notification': {
    title: 'Add Notification',
    kind: 'form',
    angularPath: 'notifications-&-announcements/add-notification',
  },
}

function titleFromSlug(slug: string): string {
  return slug
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getNotificationsConfig(slug: string): NotificationsPageConfig {
  const key = slug.replace(/^\/+|\/+$/g, '')
  if (!key) {
    return {
      slug: '',
      title: 'Notifications & Announcements',
      kind: 'hub',
      angularPath: 'notifications-&-announcements',
    }
  }
  const meta = PAGE_META[key]
  if (meta) return { slug: key, ...meta }
  return {
    slug: key,
    title: titleFromSlug(key),
    kind: 'list',
    angularPath: `notifications-&-announcements/${key}`,
  }
}
