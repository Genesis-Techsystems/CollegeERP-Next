'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilteredPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getOnlineCourseAcademicMapBySubject,
  listStaffSubjectsForUpload,
  type OnlineCourseAcademicMapRow,
  type StaffSubjectClassRow,
} from '@/services'
import {
  applySubjectCardColors,
  OnlineCourseSubjectCards,
} from '../../_components/OnlineCourseSubjectCards'

function num(val: unknown): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

function text(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

/** Angular `moment().format('YYYY/MM/DD')`. */
function todayClassDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

export function UploadCourseContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading)

  const [loading, setLoading] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [myClasses, setMyClasses] = useState<StaffSubjectClassRow[]>([])
  const [subjectRegulationId, setSubjectRegulationId] = useState<number | null>(null)
  const [subjects, setSubjects] = useState<OnlineCourseAcademicMapRow[]>([])
  const [studentBatch, setStudentBatch] = useState<StaffSubjectClassRow | null>(null)
  const loadGen = useRef(0)

  const classOptions = useMemo<SelectOption[]>(
    () =>
      myClasses.map((c) => ({
        value: String(c.subjectRegulationId),
        label: [
          text(c.collegeCode),
          text(c.courseCode),
          text(c.groupCode),
          text(c.courseYearName),
          text(c.section),
          text(c.subjectName),
        ]
          .filter(Boolean)
          .join(' / '),
      })),
    [myClasses],
  )

  const loadSubjects = useCallback(async (row: StaffSubjectClassRow) => {
    setSubjects([])
    setLoadingSubjects(true)
    try {
      const result = await getOnlineCourseAcademicMapBySubject({
        collegeId: num(row.collegeId),
        academicYearId: num(row.academicYearId),
        courseGroupId: num(row.courseGroupId),
        courseYearId: num(row.courseYearId),
        subjectId: num(row.subjectId),
      })
      setSubjects(applySubjectCardColors(result.rows, 5))
      if (!result.success || result.rows.length === 0) {
        toastSuccess(result.message || 'No Records(s) found.')
      }
    } catch (error) {
      toastError(error, 'Failed to load course content')
    } finally {
      setLoadingSubjects(false)
    }
  }, [])

  const onSelectClass = useCallback(
    (id: number | null) => {
      setSubjectRegulationId(id)
      setSubjects([])
      if (!id) {
        setStudentBatch(null)
        return
      }
      const row = myClasses.find((c) => num(c.subjectRegulationId) === id) ?? null
      setStudentBatch(row)
      if (row) void loadSubjects(row)
    },
    [myClasses, loadSubjects],
  )

  useEffect(() => {
    if (sessionLoading || isResolving) return
    if (!employeeId) return

    const id = ++loadGen.current
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const rows = await listStaffSubjectsForUpload({
          employeeId,
          classDate: todayClassDate(),
        })
        if (cancelled || id !== loadGen.current) return
        setMyClasses(rows)
        const qp = num(searchParams.get('subjectRegulationId'))
        if (qp && rows.some((r) => num(r.subjectRegulationId) === qp)) {
          setSubjectRegulationId(qp)
          const row = rows.find((r) => num(r.subjectRegulationId) === qp)!
          setStudentBatch(row)
          void loadSubjects(row)
        }
      } catch (error) {
        if (!cancelled && id === loadGen.current) {
          toastError(error, 'Failed to load my courses')
        }
      } finally {
        if (!cancelled && id === loadGen.current) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [employeeId, sessionLoading, isResolving, searchParams, loadSubjects])

  function assignUnits(data: OnlineCourseAcademicMapRow) {
    if (data.onlinecourseAcademicmapId == null || !studentBatch) return
    const qs = new URLSearchParams({
      collegeName: text(data.collegeCode),
      collegeId: String(data.collegeId ?? studentBatch.collegeId ?? ''),
      subjectRegulationId: String(subjectRegulationId ?? ''),
      regulationCode: text(data.regulationCode),
      academicYearId: String(data.academicYearId ?? studentBatch.academicYearId ?? ''),
      courseYearId: String(data.courseYearId ?? studentBatch.courseYearId ?? ''),
      courseGroupId: String(data.courseGroupId ?? studentBatch.courseGroupId ?? ''),
      subjectId: String(data.subjectId ?? studentBatch.subjectId ?? ''),
      courseId: String(studentBatch.courseId ?? ''),
      courseGroupName: text(data.courseGroupCode),
      onlineCourseId: String(data.onlineCourseId ?? ''),
      courseYearName: text(data.courseYearName),
      courseCode: text(studentBatch.courseCode),
      onlinecourseAcademicmapId: String(data.onlinecourseAcademicmapId),
      academicYear: text(data.academicYear),
      subjectName: text(data.subjectName ?? data.onlineCourseName),
      page: '/digital-library/upload-course-content',
      pageno: '3',
      subjectCode: text(data.subjectCode ?? data.onlineCourseCode),
    })
    router.push(
      `/digital-library/manage-course-content/upload-subject-content?${qs.toString()}`,
    )
  }

  return (
    <FilteredPage
      title="Upload Course Content"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="My Courses *">
            <Select
              value={subjectRegulationId ? String(subjectRegulationId) : null}
              onChange={(v) => onSelectClass(v ? Number(v) : null)}
              options={classOptions}
              placeholder="My Courses"
              searchable
              isLoading={loading || loadingSubjects}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
      {subjects.length > 0 ? (
        <OnlineCourseSubjectCards
          subjects={subjects}
          onSelect={assignUnits}
          titleKey="subjectName"
        />
      ) : null}
    </FilteredPage>
  )
}
