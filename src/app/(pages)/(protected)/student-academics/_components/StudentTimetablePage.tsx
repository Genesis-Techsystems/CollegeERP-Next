'use client'

/**
 * Angular `student-academics/student-timetable` → `StudentTimetableComponent`.
 * Student portal: session/localStorage studentId → studentdetail → timetablescurr → schedules.
 * Reuses existing TimetableWeeklyGrid + loadAngularStudentTimetable + printClassTimetable.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarRange, Printer } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'
import { toastError, toastInfo } from '@/lib/toast'
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  loadAngularStudentTimetable,
  type AngularStudentTimetable,
} from '@/services'
import { TimetableWeeklyGrid } from '@/app/(pages)/(protected)/time-table-management/_components/TimetableWeeklyGrid'
import { printClassTimetable } from '@/app/(pages)/(protected)/time-table-management/_print/timetable-print'

type AnyRow = Record<string, unknown>

type HeaderParams = {
  collegeCode: string
  academicYear: string
  groupName: string
  groupCode: string
  courseYearName: string
  section: string
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const v = row[key]
    if (v != null && v !== '' && Number.isFinite(Number(v))) return Number(v)
  }
  return 0
}

/** Angular ngOnInit localStorage header params. */
function headerFromStorage(): HeaderParams {
  return {
    collegeCode: readStorage('collegeCode'),
    academicYear: readStorage('academicYear'),
    groupName: readStorage('courseName'),
    groupCode: readStorage('groupCode'),
    courseYearName: readStorage('courseYearName'),
    section: readStorage('section'),
  }
}

function headerFromStudent(student: AnyRow, fallback: HeaderParams): HeaderParams {
  return {
    collegeCode:
      txt(student, ['collegeCode', 'college_code']) || fallback.collegeCode,
    academicYear:
      txt(student, ['academicYear', 'academicYearName', 'academic_year']) ||
      fallback.academicYear,
    groupName:
      txt(student, ['courseName', 'groupName', 'course_name']) ||
      fallback.groupName,
    groupCode:
      txt(student, ['groupCode', 'courseGroupCode', 'group_code']) ||
      fallback.groupCode,
    courseYearName:
      txt(student, ['courseYearName', 'fromCourseYearName', 'course_year_name']) ||
      fallback.courseYearName,
    section:
      txt(student, ['section', 'sectionName', 'groupSectionName']) ||
      fallback.section,
  }
}

function headerFromQuery(
  params: URLSearchParams,
  fallback: HeaderParams,
): HeaderParams {
  return {
    collegeCode: params.get('collegeCode')?.trim() || fallback.collegeCode,
    academicYear: params.get('academicYear')?.trim() || fallback.academicYear,
    groupName:
      params.get('groupName')?.trim() ||
      params.get('courseName')?.trim() ||
      fallback.groupName,
    groupCode: params.get('groupCode')?.trim() || fallback.groupCode,
    courseYearName:
      params.get('courseYearName')?.trim() || fallback.courseYearName,
    section: params.get('section')?.trim() || fallback.section,
  }
}

function buildHeaderLine(params: HeaderParams, dateRange: string): string {
  const parts = [
    params.collegeCode,
    params.academicYear,
    params.groupName,
    params.groupCode,
    params.courseYearName,
    params.section,
  ].filter(Boolean)
  const base = parts.join(' | ')
  if (!dateRange) return base
  return base ? `${base} | (${dateRange})` : `(${dateRange})`
}

function studentFromQuery(params: URLSearchParams): AnyRow | null {
  const collegeId = positiveId(params.get('collegeId'))
  const academicYearId = positiveId(params.get('academicYearId'))
  const groupSectionId = positiveId(params.get('groupSectionId'))
  if (!collegeId || !academicYearId || !groupSectionId) return null
  return {
    collegeId,
    academicYearId,
    groupSectionId,
    courseId: positiveId(params.get('courseId')),
    courseGroupId: positiveId(params.get('courseGroupId')),
    courseYearId: positiveId(params.get('courseYearId')),
    collegeCode: params.get('collegeCode') ?? '',
    academicYear: params.get('academicYear') ?? '',
    groupName: params.get('groupName') ?? params.get('courseName') ?? '',
    groupCode: params.get('groupCode') ?? '',
    courseYearName: params.get('courseYearName') ?? '',
    section: params.get('section') ?? '',
  }
}

export function StudentTimetablePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSession()

  const [loading, setLoading] = useState(true)
  const [header, setHeader] = useState<HeaderParams>(() => headerFromStorage())
  const [timetable, setTimetable] = useState<AngularStudentTimetable | null>(
    null,
  )

  const load = useCallback(async () => {
    setLoading(true)
    setTimetable(null)
    try {
      const storageHeader = headerFromStorage()
      const queryStudent = studentFromQuery(searchParams)
      const storageStudentId = positiveId(readStorage('studentId'))
      const sessionStudentId = positiveId(user?.studentId)
      const studentId = sessionStudentId || storageStudentId

      let student: AnyRow | null = null

      // Angular: localStorage.studentId → getStudentDetails → getTimetable
      if (studentId) {
        student = (await fetchStudentDetail(studentId)) as AnyRow | null
      }
      if (!student && user?.userId) {
        student = (await fetchStudentDetailByUserId(
          user.userId,
        )) as AnyRow | null
      }

      // Angular else: queryParams used as student payload for getTimetable
      if (!student && queryStudent) {
        student = queryStudent
      }

      if (!student) {
        toastInfo('Could not load your student profile.')
        setHeader(headerFromQuery(searchParams, storageHeader))
        return
      }

      const nextHeader = headerFromQuery(
        searchParams,
        headerFromStudent(student, storageHeader),
      )
      setHeader(nextHeader)

      const collegeId = num(student, ['collegeId', 'fk_college_id'])
      const academicYearId = num(student, [
        'academicYearId',
        'fk_academic_year_id',
      ])
      const groupSectionId = num(student, [
        'groupSectionId',
        'fk_group_section_id',
        'group_section_id',
      ])

      if (!collegeId || !academicYearId || !groupSectionId) {
        toastInfo('Student section details are incomplete for timetable.')
        return
      }

      const angular = await loadAngularStudentTimetable(student)
      if (!angular?.weekdays?.length) {
        toastInfo('No timetable found.')
        return
      }
      setTimetable(angular)
    } catch (e) {
      toastError(e, 'Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [searchParams, user])

  useEffect(() => {
    if (sessionLoading) return
    void load()
  }, [sessionLoading, load])

  const dateRange = timetable?.dateRangeLabel ?? ''
  const headerLine = useMemo(
    () => buildHeaderLine(header, dateRange),
    [header, dateRange],
  )

  const printHeaderLine = useMemo(() => {
    const parts = [
      header.collegeCode,
      header.academicYear,
      header.groupName,
      header.groupCode,
      header.courseYearName,
      header.section,
    ].filter(Boolean)
    const base = parts.join(' / ')
    return dateRange ? `${base} -(${dateRange})` : base
  }, [header, dateRange])

  function handlePrint() {
    if (!timetable) return
    printClassTimetable(timetable, printHeaderLine)
  }

  const hasGrid = Boolean(timetable?.weekdays?.length)

  return (
    <PageContainer className="student-timetable-page space-y-4">
      {hasGrid ? (
        <div className="screen-only app-card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#002b5c]">
              <CalendarRange className="h-4 w-4 shrink-0" aria-hidden />
              <span>{headerLine || 'Timetable'}</span>
            </h2>
            <Button type="button" size="sm" onClick={handlePrint}>
              <Printer className="mr-1 h-3.5 w-3.5" aria-hidden />
              Print
            </Button>
          </div>
          <TimetableWeeklyGrid timetable={timetable!} variant="screen" />
        </div>
      ) : loading || sessionLoading ? (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          Loading timetable…
        </p>
      ) : (
        <p className="screen-only py-12 text-center text-sm text-muted-foreground">
          No timetable found.
        </p>
      )}

      <div className="screen-only flex justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </PageContainer>
  )
}
