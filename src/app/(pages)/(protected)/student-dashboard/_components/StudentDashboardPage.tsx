'use client'

/**
 * Angular `student-dashboard/student-dashboard.component` → StudentDashboardPage.
 * Layout mirrors Angular (profile | today timetable | events/notifications) while
 * using React app tokens (`bg-primary` panel headers, `app-card` surfaces).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Breadcrumb } from '@/common/components/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSessionContext } from '@/context/SessionContext'
import { MINIO_URL } from '@/config/constants/api'
import defaultStudent from '@/assets/images/avatars/default_Student.png'
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  formatStudentDashboardTime,
  listStudentAudienceNotifications,
  listStudentDashboardEvents,
  loadStudentTodayTimetable,
  resolveStudentAudienceId,
  studentDashboardProfileFromDetail,
  type CollegeEventRow,
  type StudentDashboardNotification,
  type TimetableDayTiming,
} from '@/services'
import { cn } from '@/lib/utils'

type AnyRow = Record<string, unknown>

type ProfileState = ReturnType<typeof studentDashboardProfileFromDetail>

const QUICK_LINKS = [
  { href: '/student-academics/student-my-attendance', label: 'My Attendance' },
  { href: '/student-academics/student-timetable', label: 'My TimeTable' },
  { href: '/student-academics/my-subjects', label: 'My Subjects' },
  { href: '/student-grievances', label: 'My Grievances' },
  { href: '/events/events-calendar', label: 'Events' },
] as const

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function photoSrc(path: string | undefined): string {
  if (!path) return defaultStudent.src
  if (/^(https?:\/\/|data:)/i.test(path)) return path
  return `${MINIO_URL}${path.replace(/^\/+/, '')}`
}

function subjectLabel(timing: TimetableDayTiming): string {
  const resources = timing.subjectResource ?? []
  if (resources.length > 0) {
    const name = String(
      resources[0].subjectName ?? resources[0].subject_name ?? '',
    ).trim()
    if (name) return name
  }
  if (timing.subBatches.length > 0 && timing.subBatches[0].subjectCode) {
    return timing.subBatches[0].subjectCode
  }
  return ''
}

function facultyLabel(timing: TimetableDayTiming): string {
  const resources = timing.subjectResource ?? []
  if (resources.length > 0) {
    const name = String(
      resources[0].staffName ?? resources[0].staff_name ?? '',
    ).trim()
    if (name) return name
  }
  if (timing.subBatches.length > 0 && timing.subBatches[0].staffName) {
    return timing.subBatches[0].staffName
  }
  return ''
}

/** Angular template line: `PERIOD I - Subject - Lunch Break (9:30 AM - 10:30 AM)` */
function timingPrimaryLine(stime: TimetableDayTiming): string {
  const subject = subjectLabel(stime)
  const parts = [stime.classTimingName || 'Period']
  if (subject) parts.push(subject)
  if (stime.isBreak) parts.push('Lunch Break')
  const label = parts.join(' - ')
  if (!stime.startTime && !stime.endTime) return label
  return `${label} (${formatStudentDashboardTime(stime.startTime)} - ${formatStudentDashboardTime(stime.endTime)})`
}

function eventDateLabel(ev: CollegeEventRow): string {
  const raw =
    (ev as AnyRow).startDate ??
    (ev as AnyRow).start_date ??
    (ev as AnyRow).eventDate
  if (!raw) return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function eventName(ev: CollegeEventRow): string {
  return String(
    (ev as AnyRow).eventName ??
      (ev as AnyRow).event_name ??
      (ev as AnyRow).title ??
      '',
  )
}

function notificationTitle(n: StudentDashboardNotification): string {
  return String(
    n.notificationTitle ??
      n.notification_title ??
      n.title ??
      n.subject ??
      n.notificationName ??
      'Notification',
  )
}

function notificationBody(n: StudentDashboardNotification): string {
  return String(
    n.notificationMessage ??
      n.notification_message ??
      n.message ??
      n.description ??
      '',
  )
}

function syncStudentLocalStorage(profile: ProfileState): void {
  if (typeof window === 'undefined') return
  const pairs: Array<[string, unknown]> = [
    ['studentId', profile.studentId],
    ['groupSectionId', profile.groupSectionId],
    ['photoPath', profile.photoPath],
    ['uNumber', profile.uNumber],
    ['uName', profile.uName],
    ['courseName', profile.courseName],
    ['academicYear', profile.academicYear],
    ['groupCode', profile.groupCode],
    ['courseYearName', profile.courseYearName],
    ['section', profile.section],
    ['studentStatusCode', profile.studentStatusCode],
  ]
  for (const [key, value] of pairs) {
    if (value == null || value === '') continue
    if (typeof value === 'number' && value <= 0) continue
    const next = String(value)
    if (window.localStorage.getItem(key) !== next) {
      window.localStorage.setItem(key, next)
    }
  }
}

/** Angular `.panel-hd` — navy bar; React uses brand `primary` so themes stay consistent. */
function PanelCard({
  title,
  children,
  className,
  bodyClassName,
  minBodyHeight,
}: {
  title: string
  children?: ReactNode
  className?: string
  bodyClassName?: string
  minBodyHeight?: string
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border bg-card shadow-sm',
        className,
      )}
    >
      <div className="bg-primary px-3.5 py-2">
        <h3 className="text-[13px] font-semibold text-primary-foreground">
          {title}
        </h3>
      </div>
      <div
        className={cn('bg-card', bodyClassName)}
        style={minBodyHeight ? { minHeight: minBodyHeight } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <PageContainer className="space-y-3">
      <Skeleton className="h-5 w-36" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,22%)_minmax(0,1fr)_minmax(0,22%)] lg:items-start">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-80 rounded-md" />
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-md" />
          <Skeleton className="h-28 rounded-md" />
        </div>
      </div>
    </PageContainer>
  )
}

export function StudentDashboardPage() {
  const { user, isLoading: sessionLoading } = useSessionContext()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [timings, setTimings] = useState<TimetableDayTiming[]>([])
  const [events, setEvents] = useState<CollegeEventRow[]>([])
  const [notifications, setNotifications] = useState<
    StudentDashboardNotification[]
  >([])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let detail: AnyRow | null = null
      const sid = positiveId(user.studentId)
      if (sid) {
        detail = (await fetchStudentDetail(sid)) as AnyRow | null
      }
      if (!detail && user.userId) {
        detail = (await fetchStudentDetailByUserId(user.userId)) as AnyRow | null
      }

      const nextProfile = studentDashboardProfileFromDetail(detail ?? {}, {
        firstName: user.firstName,
        academicYear: user.academicYear,
      })
      if (!nextProfile.studentId && sid) nextProfile.studentId = sid
      if (!nextProfile.collegeId) nextProfile.collegeId = positiveId(user.collegeId)
      if (!nextProfile.academicYearId) {
        nextProfile.academicYearId = positiveId(user.academicYearId)
      }
      if (!nextProfile.uName) {
        nextProfile.uName =
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.userName
      }
      if (!nextProfile.academicYear) nextProfile.academicYear = user.academicYear

      setProfile(nextProfile)
      syncStudentLocalStorage(nextProfile)

      const studentPayload: AnyRow = {
        ...(detail ?? {}),
        collegeId: nextProfile.collegeId,
        academicYearId: nextProfile.academicYearId,
        groupSectionId: nextProfile.groupSectionId,
      }

      const todayTimings = nextProfile.groupSectionId
        ? await loadStudentTodayTimetable(studentPayload).catch(() => [])
        : []
      setTimings(todayTimings)

      const status = (nextProfile.studentStatusCode || 'INCOLLEGE').toUpperCase()
      if (
        status === 'INCOLLEGE' &&
        nextProfile.collegeId &&
        nextProfile.academicYearId &&
        nextProfile.groupSectionId
      ) {
        const audienceId = await resolveStudentAudienceId().catch(() => 0)
        if (audienceId > 0) {
          const [evts, notes] = await Promise.all([
            listStudentDashboardEvents({
              collegeId: nextProfile.collegeId,
              academicYearId: nextProfile.academicYearId,
              groupSectionId: nextProfile.groupSectionId,
              audienceTypeId: audienceId,
            }).catch(() => [] as CollegeEventRow[]),
            nextProfile.studentId
              ? listStudentAudienceNotifications({
                  collegeId: nextProfile.collegeId,
                  academicYearId: nextProfile.academicYearId,
                  groupSectionId: nextProfile.groupSectionId,
                  notificationAudienceId: audienceId,
                  studentId: nextProfile.studentId,
                }).catch(() => [] as StudentDashboardNotification[])
              : Promise.resolve([] as StudentDashboardNotification[]),
          ])
          setEvents(evts)
          setNotifications(notes)
        } else {
          setEvents([])
          setNotifications([])
        }
      } else {
        setEvents([])
        setNotifications([])
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (sessionLoading || !user) return
    void load()
  }, [sessionLoading, user, load])

  if (sessionLoading || (loading && !profile)) return <DashboardSkeleton />
  if (!user || !profile) return null

  const displayName = (profile.uName || user.firstName || '').toUpperCase()
  const metaLine = [
    profile.courseName,
    profile.academicYear,
    profile.groupCode,
    profile.courseYearName,
    profile.section,
  ]
    .filter(Boolean)
    .join(' / ')

  return (
    <PageContainer className="space-y-3">
      {/* Angular: breadcrumb + widgets quick-links */}
      <div className="relative flex items-center justify-between gap-3">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/student-dashboard' },
            { label: 'Dashboard' },
          ]}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600"
              aria-label="Quick links"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {QUICK_LINKS.map((link) => (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href}>{link.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Angular: ~22% profile | ~56% timetable | ~22% events — match screenshot proportions */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,22%)_minmax(0,1fr)_minmax(0,22%)] lg:items-start">
        {/* Profile card — fills left column; passport ~118×145 like Angular */}
        <div className="min-w-0">
          <div className="rounded-md border border-border bg-card px-4 pb-5 pt-4 text-center shadow-sm">
            <div className="mx-auto mb-3 w-[118px]">
              <div className="overflow-hidden border-[3px] border-[#dedede] bg-white p-[3px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    photoFailed ? defaultStudent.src : photoSrc(profile.photoPath)
                  }
                  alt={displayName || 'Student'}
                  className="h-[145px] w-full object-cover object-top"
                  onError={() => setPhotoFailed(true)}
                />
              </div>
            </div>
            <div className="px-1 text-[16px] font-medium leading-snug text-slate-900">
              {displayName}
            </div>
            {profile.uNumber ? (
              <div className="mt-1 text-[13px] text-[#8f8f8f]">
                {profile.uNumber}
              </div>
            ) : null}
            {metaLine ? (
              <div className="mt-1 text-[12px] leading-relaxed text-[#8f8f8f]">
                {metaLine}
              </div>
            ) : null}
          </div>
        </div>

        {/* Today Timetable — widest card; flat period rows like Angular screenshot */}
        <div className="min-w-0">
          <PanelCard title="Today Timetable">
            {timings.length === 0 ? (
              <div className="min-h-[16rem]" aria-hidden />
            ) : (
              <ul>
                {timings.map((stime, idx) => {
                  const faculty = facultyLabel(stime)
                  return (
                    <li
                      key={`${stime.classTimingName}-${stime.startTime}-${idx}`}
                      className="border-b border-[#e8e8e8] px-4 py-2.5 last:border-b-0"
                    >
                      <p className="text-[13px] leading-relaxed text-slate-900">
                        {timingPrimaryLine(stime)}
                      </p>
                      {faculty ? (
                        <p className="mt-0.5 text-[12px] text-[#747474]">
                          Faculty : {faculty}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </PanelCard>
        </div>

        {/* Upcoming Events + Notifications — stacked, same column width as profile */}
        <div className="min-w-0 space-y-3">
          <PanelCard title="Upcoming Events" minBodyHeight="5.5rem">
            {events.length > 0 ? (
              <ul className="divide-y divide-[#e8e8e8]">
                {events.map((ev, idx) => (
                  <li
                    key={String(
                      (ev as AnyRow).eventId ??
                        (ev as AnyRow).event_id ??
                        idx,
                    )}
                    className="px-3 py-2"
                  >
                    <p className="text-[12px] text-[#a2a2a2]">
                      {eventDateLabel(ev)}
                    </p>
                    <p className="text-[13px] text-slate-800">{eventName(ev)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </PanelCard>

          <PanelCard title="Notifications" minBodyHeight="5.5rem">
            {notifications.length > 0 ? (
              <ul className="max-h-72 divide-y divide-[#e8e8e8] overflow-y-auto">
                {notifications.map((n, idx) => (
                  <li
                    key={String(n.notificationId ?? n.notification_id ?? idx)}
                    className="px-3 py-2"
                  >
                    <p className="text-[13px] font-medium text-slate-800">
                      {notificationTitle(n)}
                    </p>
                    {notificationBody(n) ? (
                      <p className="mt-0.5 line-clamp-3 text-[12px] text-[#747474]">
                        {notificationBody(n)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </PanelCard>
        </div>
      </div>
    </PageContainer>
  )
}
