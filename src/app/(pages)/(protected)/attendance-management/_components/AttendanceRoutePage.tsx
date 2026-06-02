'use client'

import { getAttendanceConfig } from '../_lib/route-config'
import { AttendanceDashboardPage } from './AttendanceDashboardPage'
import { AttendancePlaceholder } from './AttendancePlaceholder'
import { StaffAttendanceNotMarkedListPage } from './StaffAttendanceNotMarkedListPage'

type AttendanceRoutePageProps = { slug: string }

export function AttendanceRoutePage({ slug }: AttendanceRoutePageProps) {
  const config = getAttendanceConfig(slug)

  if (config.kind === 'hub' || slug === '' || slug === 'attendance-dashboard') {
    return <AttendanceDashboardPage />
  }

  if (slug === 'staff-attendance-not-markedlist') {
    return <StaffAttendanceNotMarkedListPage />
  }

  return <AttendancePlaceholder slug={slug} />
}
