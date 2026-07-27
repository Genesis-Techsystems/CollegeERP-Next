'use client'



import type { ReactElement } from 'react'

import { PageContainer, PageHeader } from '@/components/layout'

import { ClassStudentsListPage } from './ClassStudentsListPage'

import { CourseYearSubjectsPage } from './CourseYearSubjectsPage'

import { CourseYearTimetablePage } from './CourseYearTimetablePage'

import { JoinLivePage } from './JoinLivePage'

import { MarkClassAttendancePage } from './MarkClassAttendancePage'

import { MyClassesPage } from './MyClassesPage'

import { MyTimetablePage } from './MyTimetablePage'

import { AssignmentsPage } from './AssignmentsPage'

import { ViewAssignmentSubmissionsPage } from './ViewAssignmentSubmissionsPage'

import { ViewStudentAttendancePage } from './ViewStudentAttendancePage'



type StaffClassesRoutePageProps = { slug: string }



const PAGE_MAP: Record<string, () => ReactElement> = {

  'my-classes': () => <MyClassesPage />,

  'my-timetable': () => <MyTimetablePage />,

  assignments: () => <AssignmentsPage />,

  'assignments/view-submissions': () => <ViewAssignmentSubmissionsPage />,

  'my-classes/students-list': () => <ClassStudentsListPage />,

  'my-classes/course-year-subjects': () => <CourseYearSubjectsPage />,

  'my-classes/course-year-timetable': () => <CourseYearTimetablePage />,

  'my-classes/mark-attendance': () => <MarkClassAttendancePage mode="mark" />,

  'my-classes/View-attendance': () => <ViewStudentAttendancePage />,

  'join-live': () => <JoinLivePage />,

}



export function StaffClassesRoutePage({ slug }: StaffClassesRoutePageProps) {

  const Page = PAGE_MAP[slug]

  if (Page) return <Page />



  return (

    <PageContainer>

      <PageHeader title="Staff Classes" />

      <p className="text-sm text-muted-foreground">Unknown route: {slug || 'staff-classes'}</p>

    </PageContainer>

  )

}


