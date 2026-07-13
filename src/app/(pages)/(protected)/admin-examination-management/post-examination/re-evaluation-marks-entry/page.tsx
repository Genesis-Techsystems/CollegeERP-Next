'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  getExamRevisionMarksBundle,
  getReevaluationMarksFilters,
  updateExamRevisedMarks,
} from '@/services/re-evaluation'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function textFrom(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = String(row[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isPassByMarks(marks: number, maxMarks: number, passPercent: number): boolean | null {
  if (!Number.isFinite(marks)) return null
  const passCutoff = (maxMarks * passPercent) / 100
  return marks >= passCutoff
}

function passBadge(value: boolean | null) {
  if (value === null) return <span className="text-muted-foreground">Not Posted</span>
  if (value) return <span className="text-emerald-700 font-medium">P</span>
  return <span className="text-rose-700 font-medium">F</span>
}

function ReEvalMarksInputRenderer(
  params: ICellRendererParams<AnyRow> & {
    maxMarks: number
    onChange: (row: AnyRow, value: number) => void
  },
) {
  const val = Number(params.data?.reevaluation_marks ?? 0)
  const max = params.maxMarks > 0 ? params.maxMarks : undefined
  return (
    <Input
      type="number"
      min={0}
      max={max}
      className="h-8 text-right text-[12px]"
      value={Number.isFinite(val) ? String(val) : '0'}
      onChange={(e) => params.data && params.onChange(params.data, Number(e.target.value || 0))}
    />
  )
}

export default function ReEvaluationMarksEntryPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const userName = globalThis?.localStorage?.getItem('uName') ?? ''

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])
  const [marksSetupRows, setMarksSetupRows] = useState<AnyRow[]>([])
  const [maxMarks, setMaxMarks] = useState(0)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null)
  const [examTimetableDetId, setExamTimetableDetId] = useState<number | null>(null)

  const colleges = useMemo(
    () => dedupeBy(allFilters, (r) => numFrom(r, ['fk_college_id'])),
    [allFilters],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        allFilters.filter((r) => numFrom(r, ['fk_college_id']) === Number(collegeId)),
        (r) => numFrom(r, ['fk_academic_year_id']),
      ),
    [allFilters, collegeId],
  )
  const courses = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (r) =>
            numFrom(r, ['fk_college_id']) === Number(collegeId) &&
            numFrom(r, ['fk_academic_year_id']) === Number(academicYearId),
        ),
        (r) => numFrom(r, ['fk_course_id']),
      ),
    [allFilters, collegeId, academicYearId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (r) =>
            numFrom(r, ['fk_college_id']) === Number(collegeId) &&
            numFrom(r, ['fk_academic_year_id']) === Number(academicYearId) &&
            numFrom(r, ['fk_course_id']) === Number(courseId),
        ),
        (r) => numFrom(r, ['fk_exam_id']),
      ),
    [allFilters, collegeId, academicYearId, courseId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (r) =>
            numFrom(r, ['fk_college_id']) === Number(collegeId) &&
            numFrom(r, ['fk_academic_year_id']) === Number(academicYearId) &&
            numFrom(r, ['fk_course_id']) === Number(courseId) &&
            numFrom(r, ['fk_exam_id']) === Number(examId),
        ),
        (r) => numFrom(r, ['fk_course_group_id']),
      ),
    [allFilters, collegeId, academicYearId, courseId, examId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (r) =>
            numFrom(r, ['fk_college_id']) === Number(collegeId) &&
            numFrom(r, ['fk_academic_year_id']) === Number(academicYearId) &&
            numFrom(r, ['fk_course_id']) === Number(courseId) &&
            numFrom(r, ['fk_exam_id']) === Number(examId) &&
            numFrom(r, ['fk_course_group_id']) === Number(courseGroupId),
        ),
        (r) => numFrom(r, ['fk_course_year_id']),
      ),
    [allFilters, collegeId, academicYearId, courseId, examId, courseGroupId],
  )
  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (r) =>
            numFrom(r, ['fk_college_id']) === Number(collegeId) &&
            numFrom(r, ['fk_academic_year_id']) === Number(academicYearId) &&
            numFrom(r, ['fk_course_id']) === Number(courseId) &&
            numFrom(r, ['fk_exam_id']) === Number(examId) &&
            numFrom(r, ['fk_course_group_id']) === Number(courseGroupId) &&
            numFrom(r, ['fk_course_year_id']) === Number(courseYearId),
        ),
        (r) => numFrom(r, ['fk_subjecttype_catdet_id']),
      ),
    [allFilters, collegeId, academicYearId, courseId, examId, courseGroupId, courseYearId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (r) =>
            numFrom(r, ['fk_college_id']) === Number(collegeId) &&
            numFrom(r, ['fk_academic_year_id']) === Number(academicYearId) &&
            numFrom(r, ['fk_course_id']) === Number(courseId) &&
            numFrom(r, ['fk_exam_id']) === Number(examId) &&
            numFrom(r, ['fk_course_group_id']) === Number(courseGroupId) &&
            numFrom(r, ['fk_course_year_id']) === Number(courseYearId) &&
            numFrom(r, ['fk_subjecttype_catdet_id']) === Number(subjectTypeId),
        ),
        (r) => numFrom(r, ['fk_exam_timetable_det_id']),
      ),
    [allFilters, collegeId, academicYearId, courseId, examId, courseGroupId, courseYearId, subjectTypeId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const rows = await getReevaluationMarksFilters({ organizationId, employeeId })
        setAllFilters(Array.isArray(rows) ? rows : [])
      } catch (error) {
        toastError(error, 'Failed to load filters')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [organizationId, employeeId])

  useEffect(() => {
    if (colleges[0]) setCollegeId(numFrom(colleges[0], ['fk_college_id']))
  }, [colleges])
  useEffect(() => {
    if (academicYears[0]) setAcademicYearId(numFrom(academicYears[0], ['fk_academic_year_id']))
  }, [academicYears])
  useEffect(() => {
    if (courses[0]) setCourseId(numFrom(courses[0], ['fk_course_id']))
  }, [courses])
  useEffect(() => {
    if (exams[0]) setExamId(numFrom(exams[0], ['fk_exam_id']))
  }, [exams])
  useEffect(() => {
    if (courseGroups[0]) setCourseGroupId(numFrom(courseGroups[0], ['fk_course_group_id']))
  }, [courseGroups])
  useEffect(() => {
    if (courseYears[0]) setCourseYearId(numFrom(courseYears[0], ['fk_course_year_id']))
  }, [courseYears])
  useEffect(() => {
    if (subjectTypes[0]) setSubjectTypeId(numFrom(subjectTypes[0], ['fk_subjecttype_catdet_id']))
  }, [subjectTypes])
  useEffect(() => {
    if (subjects[0]) setExamTimetableDetId(numFrom(subjects[0], ['fk_exam_timetable_det_id']))
  }, [subjects])

  useEffect(() => {
    setStudentRows([])
    setMarksSetupRows([])
    setMaxMarks(0)
  }, [examId, examTimetableDetId])

  const selectedSubject = useMemo(
    () => subjects.find((r) => numFrom(r, ['fk_exam_timetable_det_id']) === Number(examTimetableDetId)) ?? null,
    [subjects, examTimetableDetId],
  )

  async function getList() {
    const selectedExamId = Number(examId ?? 0)
    const selectedSubjectId = numFrom(selectedSubject, ['fk_subject_id'])
    if (!selectedExamId || !selectedSubjectId) {
      toastError('Please select exam and subject.')
      return
    }
    setLoading(true)
    try {
      const bundle = await getExamRevisionMarksBundle({ examId: selectedExamId, subjectId: selectedSubjectId })
      const setup = Array.isArray(bundle.marksSetupRows) ? bundle.marksSetupRows : []
      const students = Array.isArray(bundle.studentRows) ? bundle.studentRows : []
      const max = Number(setup?.[0]?.external_marks ?? 0)
      const passPct = Number(setup?.[0]?.external_pass_percentage ?? 0)
      const normalized = students.map((row) => {
        const marks = Number(row.reevaluation_marks ?? 0)
        return {
          ...row,
          reevaluation_marks: Number.isFinite(marks) ? marks : 0,
          isPass: isPassByMarks(Number.isFinite(marks) ? marks : 0, max, passPct),
        }
      })
      setMarksSetupRows(setup)
      setStudentRows(normalized)
      setMaxMarks(max)
    } catch (error) {
      toastError(error, 'Failed to load revised marks list')
      setStudentRows([])
      setMarksSetupRows([])
      setMaxMarks(0)
    } finally {
      setLoading(false)
    }
  }

  const onMarksChange = useCallback(
    (row: AnyRow, raw: number) => {
      const id = numFrom(row, ['pk_exam_revision_sub_id'])
      const setup = marksSetupRows?.[0] ?? {}
      const minMarks = 0
      const maxAllowed = Number(setup.external_marks ?? 0)
      const passPct = Number(setup.external_pass_percentage ?? 0)
      let parsed = Number(raw)
      if (!Number.isFinite(parsed)) parsed = 0
      if (parsed < minMarks) parsed = minMarks
      if (maxAllowed > 0 && parsed > maxAllowed) {
        parsed = maxAllowed
        toastError(`Entered marks should be less than ${maxAllowed}.`)
      }
      setStudentRows((prev) =>
        prev.map((r) =>
          numFrom(r, ['pk_exam_revision_sub_id']) === id
            ? { ...r, reevaluation_marks: parsed, isPass: isPassByMarks(parsed, maxAllowed, passPct) }
            : r,
        ),
      )
    },
    [marksSetupRows],
  )

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        colId: 'siNo',
        headerName: 'SI No',
        width: 72,
        flex: 0,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      },
      {
        field: 'hallticket_number',
        headerName: 'Hallticket Number',
        minWidth: 140,
        valueGetter: (p) => textFrom(p.data, ['hallticket_number']) || '-',
      },
      {
        field: 'student_name',
        headerName: 'Student',
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => textFrom(p.data, ['student_name']) || '-',
      },
      {
        field: 'omr_serial_no',
        headerName: 'Omr Serial Number',
        minWidth: 140,
        valueGetter: (p) => textFrom(p.data, ['omr_serial_no']) || '-',
      },
      {
        headerName: 'Marks',
        minWidth: 120,
        cellRenderer: ReEvalMarksInputRenderer,
        cellRendererParams: { maxMarks, onChange: onMarksChange },
      },
      {
        colId: 'result',
        headerName: 'Result',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => passBadge(p.data?.isPass ?? null),
      },
    ],
    [maxMarks, onMarksChange],
  )

  async function saveMarks() {
    if (studentRows.length === 0) return
    const payload = studentRows.map((row) => ({
      examRevisionSubId: numFrom(row, ['pk_exam_revision_sub_id']),
      revisedMarks: Number(row.reevaluation_marks ?? 0),
      revisedByEmpId: employeeId || 0,
      revisedByEmpName: userName,
    }))
    if (payload.some((x) => x.examRevisionSubId <= 0)) {
      toastError('Some rows are missing exam revision id.')
      return
    }
    setSaving(true)
    try {
      await updateExamRevisedMarks(payload)
      toastSuccess('Revised marks saved successfully.')
      await getList()
    } catch (error) {
      toastError(error, 'Failed to save revised marks')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FilteredListPage
      title="Exam revised marks"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((r) => ({
                value: String(numFrom(r, ['fk_college_id'])),
                label: textFrom(r, ['college_code']),
              }))}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year</Label>
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((r) => ({
                value: String(numFrom(r, ['fk_academic_year_id'])),
                label: textFrom(r, ['academic_year']),
              }))}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select
              value={courseId ? String(courseId) : null}
              onChange={(v) => setCourseId(v ? Number(v) : null)}
              options={courses.map((r) => ({
                value: String(numFrom(r, ['fk_course_id'])),
                label: textFrom(r, ['course_code']),
              }))}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-6">
            <Label>Exam</Label>
            <Select
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={exams.map((r) => ({
                value: String(numFrom(r, ['fk_exam_id'])),
                label: textFrom(r, ['exam_name']),
              }))}
              searchable
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Course Group</Label>
            <Select
              value={courseGroupId ? String(courseGroupId) : null}
              onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
              options={courseGroups.map((r) => ({
                value: String(numFrom(r, ['fk_course_group_id'])),
                label: textFrom(r, ['group_code']),
              }))}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year</Label>
            <Select
              value={courseYearId ? String(courseYearId) : null}
              onChange={(v) => setCourseYearId(v ? Number(v) : null)}
              options={courseYears.map((r) => ({
                value: String(numFrom(r, ['fk_course_year_id'])),
                label: textFrom(r, ['course_year_name']),
              }))}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Subject Type</Label>
            <Select
              value={subjectTypeId ? String(subjectTypeId) : null}
              onChange={(v) => setSubjectTypeId(v ? Number(v) : null)}
              options={subjectTypes.map((r) => ({
                value: String(numFrom(r, ['fk_subjecttype_catdet_id'])),
                label: textFrom(r, ['subject_type']),
              }))}
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-5">
            <Label>Subject</Label>
            <Select
              value={examTimetableDetId ? String(examTimetableDetId) : null}
              onChange={(v) => setExamTimetableDetId(v ? Number(v) : null)}
              options={subjects.map((r) => {
                const subject = textFrom(r, ['subject_name'])
                const code = textFrom(r, ['subject_code'])
                const regulation = textFrom(r, ['regulation_code'])
                const examType = textFrom(r, ['ttd_exam_type'])
                const labelParts = [subject]
                if (code) labelParts.push(`- ${code}`)
                if (regulation) labelParts.push(`(${regulation})`)
                if (examType) labelParts.push(`(${examType})`)
                return {
                  value: String(numFrom(r, ['fk_exam_timetable_det_id'])),
                  label: labelParts.join(' '),
                }
              })}
              searchable
            />
          </div>
          <div className="md:col-span-1">
            <Button className="h-9 w-full" onClick={() => void getList()} disabled={loading}>
              Get
            </Button>
          </div>
        </div>
      )}
      rowData={studentRows}
      columnDefs={columnDefs}
      loading={loading}
      getRowId={(p) => String(numFrom(p.data, ['pk_exam_revision_sub_id']))}
      pagination
      paginationPageSize={50}
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Re-evaluation Marks Entry',
        lockColumnIds: ['siNo', 'result'],
      }}
      toolbarLeading={(
        <div className="text-[12px] text-slate-600 whitespace-nowrap shrink-0">
          Entered marks should be less than: <span className="font-semibold">{maxMarks || '-'}</span>
        </div>
      )}
      toolbarTrailing={(
        <Button size="sm" className="h-[30px] px-3 text-[12px]" onClick={() => void saveMarks()} disabled={saving || loading}>
          Save
        </Button>
      )}
    />
  )
}
