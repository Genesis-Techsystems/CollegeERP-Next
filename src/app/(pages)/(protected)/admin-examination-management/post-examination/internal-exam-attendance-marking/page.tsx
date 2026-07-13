'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import { Select as CommonSelect } from '@/common/components/select'
import {
  getInternalAttendanceFilters,
  getInternalAttendanceRestFilters,
  getInternalAttendanceStudents,
  getInternalAttendanceSubjects,
  saveInternalAttendance,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

type AttendanceRow = {
  examStdDetId: number
  examId: number
  studentId: number
  hallticketNumber: string
  groupCode: string
  firstName: string
  subjectCode: string
  subjectName: string
  courseYearCode: string
  examTypeCode: string
  isPresent: boolean
  isufm: boolean
  attendanceTakenEmpId: number
  attendanceTakenDate: string
}

function numFrom(row: AnyRow, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function dedupeBy<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const val = String(item?.[key] ?? '')
    if (!val || seen.has(val)) continue
    seen.add(val)
    out.push(item)
  }
  return out
}

function normalizeAttendanceRows(rows: AnyRow[]): AttendanceRow[] {
  return rows.map((r, i) => ({
    examStdDetId: Number(r.pk_exam_std_det_id ?? r.examStdDetId ?? i + 1),
    examId: Number(r.fk_exam_id ?? r.examId ?? 0),
    studentId: Number(r.fk_student_id ?? r.studentId ?? 0),
    hallticketNumber: String(r.hallticketNumber ?? r.roll_number ?? r.rollNumber ?? '-'),
    groupCode: String(r.groupCode ?? r.group_code ?? '-'),
    firstName: String(r.firstName ?? r.studentName ?? '-'),
    subjectCode: String(r.subjectCode ?? r.subject_code ?? '-'),
    subjectName: String(r.subjectName ?? r.subject_name ?? '-'),
    courseYearCode: String(r.course_year_code ?? r.courseYearCode ?? ''),
    examTypeCode: String(r.exam_type ?? r.examtypeCatCode ?? ''),
    isPresent: r.isPresent == null ? true : Boolean(r.isPresent),
    isufm: Boolean(r.isufm),
    attendanceTakenEmpId: Number(r.fk_attendance_taken_emp_id ?? r.attendanceTakenEmpId ?? 0),
    attendanceTakenDate: String(r.attendance_taken_date ?? r.attendanceTakenDate ?? ''),
  }))
}

export default function InternalExamAttendanceMarkingPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AttendanceRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [labBatchId, setLabBatchId] = useState<number | null>(0)
  const [examDate, setExamDate] = useState('')

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () =>
      dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id'),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (x) =>
            Number(x.fk_course_id) === Number(courseId) &&
            Number(x.fk_academic_year_id) === Number(academicYearId),
        ),
        'fk_exam_id',
      ),
    [allFilters, courseId, academicYearId],
  )

  const colleges = useMemo(() => dedupeBy(restFilters.filter((x) => x.fk_college_id), 'fk_college_id'), [restFilters])
  const courseGroups = useMemo(
    () => dedupeBy(restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId)), 'fk_course_group_id'),
    [restFilters, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId),
        ),
        'fk_course_year_id',
      ),
    [restFilters, collegeId, courseGroupId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        restFilters.filter((x) => (x.flag ?? '') === 'regulations' || Number(x.fk_regulation_id) > 0),
        'fk_regulation_id',
      ),
    [restFilters],
  )
  const subjects = useMemo(() => {
    const filtered = subjectRows.filter((x) => {
      const collegeOk = numFrom(x, 'fk_college_id', 'collegeId') === Number(collegeId)
      const groupOk = numFrom(x, 'fk_course_group_id', 'courseGroupId') === Number(courseGroupId)
      const yearOk = numFrom(x, 'fk_course_year_id', 'courseYearId') === Number(courseYearId)
      const regVal = numFrom(x, 'fk_regulation_id', 'regulationId')
      const regulationOk = regVal === 0 || regVal === Number(regulationId)
      return collegeOk && groupOk && yearOk && regulationOk
    })

    // If strict matching yields no rows, keep a relaxed fallback to prevent
    // empty subjects due to backend key-shape differences.
    const source = filtered.length > 0 ? filtered : subjectRows

    const seen = new Set<number>()
    const out: AnyRow[] = []
    for (const row of source) {
      const sid = numFrom(row, 'fk_subject_id', 'subjectId', 'fk_sub_id')
      if (sid <= 0 || seen.has(sid)) continue
      seen.add(sid)
      out.push(row)
    }
    return out
  }, [subjectRows, collegeId, courseGroupId, courseYearId, regulationId])
  const labBatches = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId) &&
            Number(x.fk_course_year_id) === Number(courseYearId) &&
            Number(x.fk_regulation_id) === Number(regulationId) &&
            Number(x.fk_subject_id) === Number(subjectId) &&
            Number(x.fk_stdbatch_id ?? 0) > 0,
        ),
        'fk_stdbatch_id',
      ),
    [subjectRows, collegeId, courseGroupId, courseYearId, regulationId, subjectId],
  )
  const courseOptions = useMemo(
    () => courses.map((x) => ({ value: String(x.fk_course_id), label: String(x.course_code ?? '-') })),
    [courses],
  )
  const academicYearOptions = useMemo(
    () => academicYears.map((x) => ({ value: String(x.fk_academic_year_id), label: String(x.academic_year ?? '-') })),
    [academicYears],
  )
  const examOptions = useMemo(
    () => exams.map((x) => ({ value: String(x.fk_exam_id), label: String(x.exam_name ?? '-') })),
    [exams],
  )
  const collegeOptions = useMemo(
    () => colleges.map((x) => ({ value: String(x.fk_college_id), label: String(x.college_code ?? '-') })),
    [colleges],
  )
  const courseGroupOptions = useMemo(
    () => courseGroups.map((x) => ({ value: String(x.fk_course_group_id), label: String(x.group_code ?? '-') })),
    [courseGroups],
  )
  const courseYearOptions = useMemo(
    () => courseYears.map((x) => ({ value: String(x.fk_course_year_id), label: String(x.course_year_code ?? '-') })),
    [courseYears],
  )
  const regulationOptions = useMemo(
    () => regulations.map((x) => ({ value: String(x.fk_regulation_id), label: String(x.regulation_code ?? '-') })),
    [regulations],
  )
  const subjectOptions = useMemo(
    () =>
      subjects
        .map((x) => {
          const sid = numFrom(x, 'fk_subject_id', 'subjectId', 'fk_sub_id')
          if (!sid) return null
          return {
            value: String(sid),
            label: `${String(x.subject_name ?? x.subjectName ?? '-')} (${String(x.subject_code ?? x.subjectCode ?? '-')})`,
          }
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [subjects],
  )
  const labBatchOptions = useMemo(
    () => [{ value: '0', label: 'All' }, ...labBatches.map((x) => ({ value: String(x.fk_stdbatch_id), label: String(x.labbatch_name ?? x.lab_batch_name ?? '-') }))],
    [labBatches],
  )

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      try {
        const data = await getInternalAttendanceFilters(employeeId).catch(() => [])
        setAllFilters(Array.isArray(data) ? data : [])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadFilters()
  }, [employeeId])

  useEffect(() => {
    async function loadRest() {
      setRestFilters([])
      setSubjectRows([])
      if (!courseId || !examId || !academicYearId) return
      const data = await getInternalAttendanceRestFilters({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => [])
      setRestFilters(Array.isArray(data) ? data : [])
    }
    void loadRest()
  }, [courseId, examId, academicYearId, employeeId])

  useEffect(() => {
    async function loadSubjects() {
      setSubjectRows([])
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId || !regulationId) return
      const data = await getInternalAttendanceSubjects({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      setSubjectRows(Array.isArray(data) ? data : [])
    }
    void loadSubjects()
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId, employeeId])

  useEffect(() => {
    if (courses[0]?.fk_course_id) setCourseId(Number(courses[0].fk_course_id))
  }, [courses])
  useEffect(() => {
    if (academicYears[0]?.fk_academic_year_id) setAcademicYearId(Number(academicYears[0].fk_academic_year_id))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]?.fk_exam_id) setExamId(Number(exams[0].fk_exam_id))
  }, [exams])
  useEffect(() => {
    if (colleges[0]?.fk_college_id) setCollegeId(Number(colleges[0].fk_college_id))
  }, [colleges])
  useEffect(() => {
    if (courseGroups[0]?.fk_course_group_id) setCourseGroupId(Number(courseGroups[0].fk_course_group_id))
  }, [courseGroups])
  useEffect(() => {
    if (courseYears[0]?.fk_course_year_id) setCourseYearId(Number(courseYears[0].fk_course_year_id))
  }, [courseYears])
  useEffect(() => {
    if (regulations[0]?.fk_regulation_id) setRegulationId(Number(regulations[0].fk_regulation_id))
  }, [regulations])
  useEffect(() => {
    const firstId = Number(subjects[0]?.fk_subject_id ?? subjects[0]?.subjectId ?? subjects[0]?.fk_sub_id ?? 0)
    if (firstId > 0) setSubjectId(firstId)
  }, [subjects])
  useEffect(() => {
    const first = subjects[0]
    const dateRaw = String(first?.exam_date ?? first?.examDate ?? '').trim()
    setExamDate(dateRaw ? dateRaw.slice(0, 10) : '')
  }, [subjects])

  const updateRow = useCallback((examStdDetId: number, patch: Partial<AttendanceRow>) => {
    setRows((prev) => prev.map((r) => (r.examStdDetId === examStdDetId ? { ...r, ...patch } : r)))
  }, [])

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !collegeId || !courseGroupId || !courseYearId || !regulationId || !subjectId) {
      return
    }
    setLoadingList(true)
    setHasFetched(true)
    try {
      const data = await getInternalAttendanceStudents({
        courseId,
        examId,
        academicYearId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        sectionId: 0,
        labBatchId: labBatchId ?? 0,
      }).catch(() => [])
      setRows(normalizeAttendanceRows(Array.isArray(data) ? data : []))
    } finally {
      setLoadingList(false)
    }
  }

  async function onSaveAttendance() {
    if (rows.length === 0) return
    setSaving(true)
    try {
      const payload = rows.map((r) => ({
        examStdDetId: r.examStdDetId,
        examId: r.examId,
        studentId: r.studentId,
        hallticketNo: r.hallticketNumber,
        attendanceTakenEmpId: r.attendanceTakenEmpId,
        attendanceTakenDate: r.attendanceTakenDate,
        subjectName: r.subjectName,
        isPresent: r.isPresent,
        isufm: r.isufm,
        isActive: true,
      }))
      await saveInternalAttendance(payload)
      toastSuccess('Attendance saved successfully')
    } catch (err) {
      toastError(err, 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const allMarkedPresent = useMemo(() => rows.length > 0 && rows.every((r) => r.isPresent), [rows])
  const absentees = useMemo(() => rows.filter((r) => !r.isPresent), [rows])

  const columnDefs = useMemo<ColDef<AttendanceRow>[]>(
    () => [
      { headerName: 'SI.No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hall Ticket No', minWidth: 150 },
      { field: 'groupCode', headerName: 'Group', minWidth: 90, flex: 0 },
      { field: 'firstName', headerName: 'Student Name', minWidth: 180, flex: 1 },
      {
        field: 'subjectCode',
        headerName: 'Subject',
        minWidth: 120,
        valueGetter: (p: any) => {
          const code = p.data?.subjectCode ?? '-'
          const name = p.data?.subjectName
          return name ? `${code} - ${name}` : code
        },
      },
      {
        headerName: 'Status',
        minWidth: 110,
        flex: 0,
        valueGetter: (p: any) => (p.data?.isPresent ? 'Present' : 'Absent'),
      },
      {
        headerName: 'Mark',
        minWidth: 140,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AttendanceRow>) => (
          <label className="inline-flex items-center gap-2 text-[12px]">
            <Checkbox
              checked={Boolean(p.data?.isPresent)}
              onCheckedChange={(v) => p.data && updateRow(p.data.examStdDetId, { isPresent: Boolean(v) })}
            />
            <span>{p.data?.isPresent ? 'Present' : 'Absent'}</span>
          </label>
        ),
      },
      {
        headerName: 'MalPractice',
        minWidth: 120,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AttendanceRow>) => (
          <Checkbox
            checked={Boolean(p.data?.isufm)}
            onCheckedChange={(v) => p.data && updateRow(p.data.examStdDetId, { isufm: Boolean(v) })}
          />
        ),
      },
    ],
    [updateRow],
  )

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-[18px] font-semibold leading-tight text-foreground">Internal Exam Attendance Marking</h1>

      <FilterCard title={<span className="text-[14px] font-semibold leading-tight">Internal Exam Attendance Marking</span>}>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course</Label><CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Year</Label><CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYearOptions} placeholder="Exam Year" searchable /></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam</Label><CommonSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>College</Label><CommonSelect value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={collegeOptions} placeholder="College" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group</Label><CommonSelect value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroupOptions} placeholder="Course Group" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year</Label><CommonSelect value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><CommonSelect value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} placeholder="Regulation" searchable /></div>
          <div className="space-y-1 md:col-span-6">
            <Label>Subject</Label>
            <CommonSelect value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(v ? Number(v) : null)} options={subjectOptions} placeholder="Subject" searchable />
          </div>
          {labBatches.length > 0 && (
            <div className="space-y-1 md:col-span-2"><Label>Lab Batch</Label><CommonSelect value={String(labBatchId ?? 0)} onChange={(v) => setLabBatchId(Number(v || 0))} options={labBatchOptions} placeholder="Lab Batch" searchable /></div>
          )}
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Date</Label>
            <Input
              className="h-8 text-[12px]"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-2"><Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loadingList}>{loadingList ? 'Loading...' : 'Get List'}</Button></div>
        </div>
      </FilterCard>

      {hasFetched && (
        <div className="space-y-3">
          <div className="app-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40">
              <h3 className="app-card-title">Mark Exam Attendance</h3>
            </div>
            <div className="p-3 text-[12px] text-slate-700">
              <p>{exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.exam_name ?? '-'}</p>
              <p>{colleges.find((c) => Number(c.fk_college_id) === Number(collegeId))?.college_code ?? '-'} / {courses.find((c) => Number(c.fk_course_id) === Number(courseId))?.course_code ?? '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-9 min-w-0">
              <TableCard withHeaderBorder={false}>
                <DataTable
                  rowData={rows}
                  columnDefs={columnDefs}
                  loading={loadingList}
                  pagination
                  toolbar={{
                    search: true,
                    searchPlaceholder: 'Search…',
                    pdfDocumentTitle: 'Internal Exam Attendance',
                  }}
                  toolbarTrailing={
                    <>
                      <label className="inline-flex items-center gap-2 text-[12px] shrink-0">
                        <Checkbox
                          checked={allMarkedPresent}
                          onCheckedChange={(v) =>
                            setRows((prev) => prev.map((r) => ({ ...r, isPresent: Boolean(v) })))
                          }
                        />
                        <span>{allMarkedPresent ? 'Unmark All' : 'Mark All'}</span>
                      </label>
                      <Button
                        className="h-[30px] text-[12px]"
                        onClick={onSaveAttendance}
                        disabled={saving || rows.length === 0}
                      >
                        {saving ? 'Saving...' : 'Save Attendance'}
                      </Button>
                    </>
                  }
                />
              </TableCard>
            </div>

            <aside className="space-y-3 lg:col-span-3 min-w-0">
              <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
                <h3 className="bg-[#ecf3ff] px-3 py-2 text-center text-[14px] font-semibold uppercase text-slate-700">
                  Absentees :{' '}
                  <span className="rounded-full bg-cyan-300 px-2 py-0.5">{absentees.length}</span>
                </h3>
                <div className="max-h-[320px] overflow-auto p-3 text-[12px]">
                  {absentees.length === 0 ? (
                    <p className="text-muted-foreground">No absents found.</p>
                  ) : (
                    absentees.map((r) => (
                      <p key={`abs-${r.examStdDetId}`} className="mb-1">
                        {r.firstName} (<span className="text-blue-700">{r.hallticketNumber}</span>)
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <Button
                  className="h-8 px-5 text-[12px]"
                  onClick={onSaveAttendance}
                  disabled={saving || rows.length === 0}
                >
                  {saving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

