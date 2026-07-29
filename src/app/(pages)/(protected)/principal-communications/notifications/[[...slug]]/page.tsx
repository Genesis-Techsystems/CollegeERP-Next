import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ slug?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Angular:
 *  - `#/principal-communications/notifications/send-notifications`
 *  - `#/principal-communications/notifications/send-notifications/add-notification`
 */
export default async function PrincipalCommunicationsNotificationsRedirect({
  params,
  searchParams,
}: PageProps) {
  const { slug = [] } = await params
  const qs = await searchParams
  const isAdd = slug.some((s) => s.toLowerCase() === 'add-notification')

  if (isAdd) {
    const collegeId = typeof qs.collegeId === 'string' ? qs.collegeId : ''
    const academicYearId =
      typeof qs.academicYearId === 'string' ? qs.academicYearId : ''
    const notificationId =
      typeof qs.notificationId === 'string' ? qs.notificationId : ''
    const query = new URLSearchParams()
    if (collegeId) query.set('collegeId', collegeId)
    if (academicYearId) query.set('academicYearId', academicYearId)
    if (notificationId) query.set('notificationId', notificationId)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    redirect(`/notifications-and-announcements/add-notification${suffix}`)
  }

  redirect('/notifications-and-announcements/employee-inbox')
}
