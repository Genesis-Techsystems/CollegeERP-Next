'use client'

import type { ReactElement } from 'react'
import { getMentorshipConfig } from '../_lib/route-config'
import { ActivityTypePage } from './ActivityTypePage'
import { CounselorMeetingsPage } from './CounselorMeetingsPage'
import { MentorshipDashboardPage } from './MentorshipDashboardPage'
import { MentorshipPlaceholder } from './MentorshipPlaceholder'
import { AssignCounselorPage } from './AssignCounselorPage'
import { MeetingHistoryPage } from './MeetingHistoryPage'
import { StudentCounselorsPage } from './StudentCounselorsPage'

type MentorshipRoutePageProps = { slug: string }

const PAGE_MAP: Record<string, () => ReactElement> = {
  'activity-type': () => <ActivityTypePage />,
  'student-counselors': () => <StudentCounselorsPage />,
  'student-meetings': () => (
    <CounselorMeetingsPage mode="admin" title="Student Meetings" />
  ),
  'meetings-list': () => (
    <CounselorMeetingsPage mode="staff" title="Meetings List" />
  ),
  'schedule-ptm': () => (
    <CounselorMeetingsPage mode="staff" title="Schedule PTM" />
  ),
  'assign-counselor': () => <AssignCounselorPage title="Assign Counselor" />,
  'assign-mentor-to-students': () => (
    <AssignCounselorPage title="Assign Mentor to Students" />
  ),
  'meeting-history': () => <MeetingHistoryPage />,
}

export function MentorshipRoutePage({ slug }: MentorshipRoutePageProps) {
  const config = getMentorshipConfig(slug)

  if (config.kind === 'hub' || slug === '' || slug === 'counseling-dashboard') {
    return <MentorshipDashboardPage />
  }

  const Page = PAGE_MAP[slug]
  if (Page) return <Page />

  return <MentorshipPlaceholder slug={slug} />
}
