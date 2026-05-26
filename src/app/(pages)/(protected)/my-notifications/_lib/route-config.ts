export type MyNotificationsPageConfig = {
  slug: string
  title: string
  angularPath: string
}

export function getMyNotificationsConfig(slug: string): MyNotificationsPageConfig {
  const key = slug.replace(/^\/+|\/+$/g, '')
  return {
    slug: key,
    title: 'My Notifications',
    angularPath: 'student-communications/student-announcements',
  }
}
