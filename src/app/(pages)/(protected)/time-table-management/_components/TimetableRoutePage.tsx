'use client'

import type React from 'react'
import { getTimetableConfig } from '../_lib/route-config'
import { ManageTimetablePage } from './ManageTimetablePage'
import { TimetableDashboardPage } from './TimetableDashboardPage'
import { TimetablePlaceholder } from './TimetablePlaceholder'
import { TimingSetsPage } from './TimingSetsPage'
import { TimingSlotsPage } from './TimingSlotsPage'
import { TimetableAllocationPage } from './TimetableAllocationPage'
import { ViewTimetablePage } from './ViewTimetablePage'
import { AssignResourceTimetablePage } from './AssignResourceTimetablePage'

const LIST_PAGES: Record<string, () => React.ReactElement> = {
  'timing-sets': () => <TimingSetsPage />,
  'timing-slots': () => <TimingSlotsPage />,
  'manage-timetable': () => <ManageTimetablePage />,
  'timetable-allocation': () => <TimetableAllocationPage />,
  'create-timetable': () => <AssignResourceTimetablePage />,
  'view-timetable': () => <ViewTimetablePage />,
}

type TimetableRoutePageProps = { slug: string }

export function TimetableRoutePage({ slug }: TimetableRoutePageProps) {
  const config = getTimetableConfig(slug)

  if (config.kind === 'hub' || slug === 'timetable-dashboard' || slug === '') {
    return <TimetableDashboardPage />
  }

  const ListPage = LIST_PAGES[slug]
  if (ListPage) {
    return <ListPage />
  }

  return <TimetablePlaceholder slug={slug} />
}
