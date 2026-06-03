'use client'

import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { getAllRecords } from '@/services/crud'
import {
  runCompleteExamResultProcessing,
  runCompleteExamResultProcessingPublish,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = String(row?.[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = numFrom(row, keys)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

export default function CompleteExamFeeRegistrationPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)

  const colleges = useMemo(() => dedupeBy(filters, ['fk_college_id', 'collegeId']), [filters])

  const years = useMemo(
    () =>
      dedupeBy(
        filters.filter((x) => numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['fk_academic_year_id', 'academicYearId'],
      ),
    [filters, collegeId],
  )

  const courses = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        ['fk_course_id', 'courseId'],
      ),
    [filters, collegeId, academicYearId],
  )

  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['fk_exam_id', 'examId'],
      ).filter((x) => Boolean(x?.is_regular_exam)),
    [filters, collegeId, academicYearId, courseId],
  )

  const collegeOptions = useMemo(
    () =>
      colleges
        .map((x) => ({
          value: String(numFrom(x, ['fk_college_id', 'collegeId'])),
          label: strFrom(x, ['college_code', 'collegeCode', 'college_name', 'collegeName']),
        }))
        .filter((o) => o.value !== '0'),
    [colleges],
  )

  const yearOptions = useMemo(
    () =>
      years
        .map((x) => ({
          value: String(numFrom(x, ['fk_academic_year_id', 'academicYearId'])),
          label: strFrom(x, ['academic_year', 'academicYear']),
        }))
        .filter((o) => o.value !== '0'),
    [years],
  )

  const courseOptions = useMemo(
    () =>
      courses
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_id', 'courseId'])),
          label: strFrom(x, ['course_code', 'courseCode', 'course_name', 'courseName']),
        }))
        .filter((o) => o.value !== '0'),
    [courses],
  )

  const examOptions = useMemo(
    () =>
      exams
        .map((x) => ({
          value: String(numFrom(x, ['fk_exam_id', 'examId'])),
          label: strFrom(x, ['exam_name', 'examName']),
        }))
        .filter((o) => o.value !== '0'),
    [exams],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_collegewisedetails_bycode', {
          in_flag: 'clg_exam_timetable_filters',
          in_org_id: organizationId || 0,
          in_college_id: 0,
          in_course_id: 0,
          in_course_group_id: 0,
          in_course_year_id: 0,
          in_group_section_id: 0,
          in_academic_year_id: 0,
          in_dept_id: 0,
          in_isadmin: 0,
          in_loginuser_empid: employeeId || 0,
          in_loginuser_roleid: 0,
          in_employee: '',
          in_subject: '',
          in_gm_codes: 'SUBTYPE',
        })

        const groups = data?.result ?? []
        const picked =
          groups.find((g) => (g?.[0]?.flag ?? '') === 'clg_exam_timetable_filters') ??
          groups.find((g) => Array.isArray(g) && g.length > 0) ??
          []
        setFilters(Array.isArray(picked) ? picked : [])
      } catch {
        setFilters([])
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [employeeId, organizationId])

  useEffect(() => {
    setAcademicYearId(null)
    setCourseId(null)
    setExamId(null)
  }, [collegeId])

  useEffect(() => {
    setCourseId(null)
    setExamId(null)
  }, [academicYearId])

  useEffect(() => {
    setExamId(null)
  }, [courseId])

  async function runAction(action: () => Promise<void>, successMessage: string) {
    if (!examId) return
    setLoading(true)
    try {
      await action()
      toastSuccess(successMessage)
    } catch (error) {
      toastError(error, 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const selectedExamId = examId ?? 0

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Complete Exam Fee Registration" subtitle="Result processing and publish workflow" />

      <div className="app-card p-3 space-y-3">
        <h2 className="app-card-title">
          Result Processing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v: string | null) => setCollegeId(v ? Number(v) : null)}
              options={collegeOptions}
              placeholder="College"
              searchable
              clearable
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v: string | null) => setAcademicYearId(v ? Number(v) : null)}
              options={yearOptions}
              placeholder="Exam Year"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v: string | null) => setCourseId(v ? Number(v) : null)}
              options={courseOptions}
              placeholder="Course"
            />
          </div>

          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v: string | null) => setExamId(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Exam"
              searchable
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            className="h-8 text-[12px]"
            disabled={!examId || loading}
            onClick={() =>
              void runAction(
                () => runCompleteExamResultProcessing(selectedExamId),
                'Result processing completed',
              )
            }
          >
            Result Processing
          </Button>
          <Button
            className="h-8 text-[12px]"
            disabled={!examId || loading}
            onClick={() =>
              void runAction(
                () => runCompleteExamResultProcessingPublish(selectedExamId),
                'Result publishing completed',
              )
            }
          >
            Publish Result Processing
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}

