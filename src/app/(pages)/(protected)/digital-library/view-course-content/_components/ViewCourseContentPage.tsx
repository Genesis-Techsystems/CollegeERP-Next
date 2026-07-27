'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilteredPage } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { useSessionContext } from '@/context/SessionContext'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getOnlineCourseAcademicMap,
  listStudentAcademicBatches,
  type OnlineCourseAcademicMapRow,
  type StudentAcademicBatchRow,
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

function readStudentId(userStudentId: unknown): number {
  const fromUser = num(userStudentId)
  if (fromUser > 0) return fromUser
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return 0
  return num(globalThis.localStorage.getItem('studentId'))
}

export function ViewCourseContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()

  const [loading, setLoading] = useState(false)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [batches, setBatches] = useState<StudentAcademicBatchRow[]>([])
  const [batchId, setBatchId] = useState<number | null>(null)
  const [subjects, setSubjects] = useState<OnlineCourseAcademicMapRow[]>([])
  const [studentBatch, setStudentBatch] = useState<StudentAcademicBatchRow | null>(null)
  const loadGen = useRef(0)

  const batchOptions = useMemo<SelectOption[]>(
    () =>
      batches.map((b) => ({
        value: String(b.studentAcademicbatchId),
        label: [
          text(b.collegeCode),
          text(b.academicYear),
          text(b.courseName),
          text(b.groupCode),
          text(b.fromCourseYearName),
        ]
          .filter(Boolean)
          .join(' / '),
      })),
    [batches],
  )

  const loadSubjects = useCallback(async (batch: StudentAcademicBatchRow) => {
    setSubjects([])
    setLoadingSubjects(true)
    try {
      const result = await getOnlineCourseAcademicMap({
        collegeId: num(batch.collegeId),
        academicYearId: num(batch.academicYearId),
        courseGroupId: num(batch.courseGroupId),
        courseYearId: num(batch.fromCourseYearId),
      })
      setSubjects(applySubjectCardColors(result.rows, 6))
      if (!result.success || result.rows.length === 0) {
        toastSuccess(result.message || 'No Records(s) found.')
      }
    } catch (error) {
      toastError(error, 'Failed to load course content')
    } finally {
      setLoadingSubjects(false)
    }
  }, [])

  const onSelectBatch = useCallback(
    (id: number | null) => {
      setBatchId(id)
      setSubjects([])
      if (!id) {
        setStudentBatch(null)
        return
      }
      const batch = batches.find((b) => num(b.studentAcademicbatchId) === id) ?? null
      setStudentBatch(batch)
      if (batch) void loadSubjects(batch)
    },
    [batches, loadSubjects],
  )

  useEffect(() => {
    if (sessionLoading) return
    const studentId = readStudentId(user?.studentId)
    if (!studentId) return

    const id = ++loadGen.current
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const rows = await listStudentAcademicBatches(studentId)
        if (cancelled || id !== loadGen.current) return
        // Angular: only keep the last batch
        const last = rows.length > 0 ? [rows[rows.length - 1]!] : []
        setBatches(last)
        const qp = num(searchParams.get('studentAcademicbatchId'))
        if (qp && last.some((b) => num(b.studentAcademicbatchId) === qp)) {
          setBatchId(qp)
          const batch = last.find((b) => num(b.studentAcademicbatchId) === qp)!
          setStudentBatch(batch)
          void loadSubjects(batch)
        }
      } catch (error) {
        if (!cancelled && id === loadGen.current) {
          toastError(error, 'Failed to load student courses')
        }
      } finally {
        if (!cancelled && id === loadGen.current) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.studentId, sessionLoading, searchParams, loadSubjects])

  function assignUnits(data: OnlineCourseAcademicMapRow) {
    if (data.onlinecourseAcademicmapId == null || !studentBatch) return
    const qs = new URLSearchParams({
      collegeName: text(studentBatch.collegeCode),
      collegeId: String(studentBatch.collegeId ?? ''),
      studentAcademicbatchId: String(batchId ?? ''),
      regulationCode: text(studentBatch.regulationName),
      academicYearId: String(studentBatch.academicYearId ?? ''),
      courseYearId: String(studentBatch.fromCourseYearId ?? ''),
      courseGroupId: String(studentBatch.courseGroupId ?? ''),
      onlineCourseId: String(data.onlineCourseId ?? ''),
      courseId: String(studentBatch.courseId ?? ''),
      courseGroupName: text(studentBatch.groupCode),
      courseYearName: text(studentBatch.fromCourseYearName),
      courseCode: text(studentBatch.courseName),
      onlinecourseAcademicmapId: String(data.onlinecourseAcademicmapId),
      academicYear: text(studentBatch.academicYear),
      subjectName: text(data.subjectName ?? data.onlineCourseName),
      page: '/digital-library/view-course-content',
      pageno: '1',
      subjectCode: text(data.subjectCode ?? data.onlineCourseCode),
    })
    router.push(
      `/digital-library/manage-course-content/upload-subject-content?${qs.toString()}`,
    )
  }

  return (
    <FilteredPage
      title="View Course Content"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="Student Courses *">
            <Select
              value={batchId ? String(batchId) : null}
              onChange={(v) => onSelectBatch(v ? Number(v) : null)}
              options={batchOptions}
              placeholder="Student Courses"
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
