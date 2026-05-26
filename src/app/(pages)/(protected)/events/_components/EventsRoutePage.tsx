'use client'

import type { ReactElement } from 'react'
import { getEventsConfig } from '../_lib/route-config'
import { CollegeEventsPage } from './CollegeEventsPage'
import { DepartmentEventsPage } from './DepartmentEventsPage'
import { EventTypePage } from './EventTypePage'
import { EventsDashboardPage } from './EventsDashboardPage'
import { EventsPlaceholder } from './EventsPlaceholder'
import { SchoolCalendarPage } from './SchoolCalendarPage'

type EventsRoutePageProps = { slug: string }

const PAGE_MAP: Record<string, () => ReactElement> = {
  'event-type': () => <EventTypePage />,
  'department-events': () => <DepartmentEventsPage />,
  'add-event': () => <CollegeEventsPage title="Add Event" variant="manage" />,
  'college-calendar': () => <CollegeEventsPage title="College Calendar" variant="calendar-view" />,
  'events-calendar': () => <CollegeEventsPage title="Events Calendar" variant="student" />,
  'staff-events': () => <CollegeEventsPage title="Staff Events" variant="staff" />,
  'school-calendar': () => <SchoolCalendarPage />,
}

export function EventsRoutePage({ slug }: EventsRoutePageProps) {
  const config = getEventsConfig(slug)

  if (config.kind === 'hub' || slug === '' || slug === 'events-dashboard') {
    return <EventsDashboardPage />
  }

  const Page = PAGE_MAP[slug]
  if (Page) return <Page />

  return <EventsPlaceholder slug={slug} />
}
