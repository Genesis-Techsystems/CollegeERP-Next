'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, type SelectOption } from '@/common/components/select'
import { format, parseISO } from 'date-fns'
import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import {
  getExamHalltickets,
  listExamMastersByCourseAndAy,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listStudents,
} from '@/services/pre-examination'

type AnyRow = Record<string, any>

// ── Column shape ─────────────────────────────────────────────────────────────
const HALLTICKET_COL_DEFS: ColDef[] = [
  { headerName: 'SI.No', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { field: 'hallticket_number', headerName: 'Hallticket', minWidth: 140 },
  {
    headerName: 'Student',
    minWidth: 160,
    valueGetter: (p: any) => p.data?.first_name ?? p.data?.student_name ?? '-',
  },
  {
    field: 'exam_date',
    headerName: 'Exam Date',
    width: 120,
    flex: 0,
    valueFormatter: (p: any) => {
      if (!p.value) return '-'
      try { return format(parseISO(String(p.value)), 'dd MMM yyyy') } catch { return String(p.value) }
    },
  },
  { field: 'subject_code', headerName: 'Subject Code', minWidth: 130 },
  { field: 'subject_name', headerName: 'Subject Name', flex: 1, minWidth: 160 },
  { field: 'subjecttype', headerName: 'Type', width: 90, flex: 0 },
]

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const tConvert = (time?: string) => {
  const raw = String(time ?? '').trim()
  const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/)
  if (!m) return ''
  const hour24 = Number(m[1])
  const mins = m[2]
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${mins} ${ampm}`
}

const formatRangeDate = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const pick = (row: AnyRow, keys: string[]) => {
  for (const k of keys) {
    const v = row?.[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return ''
}

const flattenRows = (input: unknown): AnyRow[] => {
  if (!Array.isArray(input)) return []
  const out: AnyRow[] = []
  for (const item of input) {
    if (Array.isArray(item)) out.push(...flattenRows(item))
    else if (item && typeof item === 'object') out.push(item as AnyRow)
  }
  return out
}

const normalizeHallticketRows = (input: unknown): AnyRow[] => {
  const flat = flattenRows(input)
  const out: AnyRow[] = []
  for (const row of flat) {
    const nested =
      row.subjectDTOList ??
      row.subjects ??
      row.examStudentDetailDTOs ??
      row.examStudentDetails ??
      row.examStudentDetailList
    if (Array.isArray(nested) && nested.length > 0) {
      for (const s of nested) {
        out.push({
          ...row,
          ...s,
          exam_date: s.exam_date ?? s.examDate ?? row.exam_date ?? row.examDate ?? row.fromDate,
          session_start_time:
            s.session_start_time ?? s.sessionStartTime ?? s.start_time ?? row.session_start_time ?? row.sessionStartTime ?? row.start_time,
          session_end_time:
            s.session_end_time ?? s.sessionEndTime ?? s.end_time ?? row.session_end_time ?? row.sessionEndTime ?? row.end_time,
          subject_code: s.subject_code ?? s.subjectCode ?? row.subject_code ?? row.subjectCode,
          subject_name: s.subject_name ?? s.subjectName ?? row.subject_name ?? row.subjectName,
          subjecttype: s.subjecttype ?? s.subjectType ?? row.subjecttype ?? row.subjectType,
        })
      }
      continue
    }
    out.push(row)
  }
  return out
}

export default function ExamHallticketPage() {
  const [mode, setMode] = useState<'student' | 'section'>('student')
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [studentExamId, setStudentExamId] = useState<number | null>(null)
  const [studentExams, setStudentExams] = useState<AnyRow[]>([])

  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const [rows, setRows] = useState<AnyRow[]>([])

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(
    () => dedupeBy(filterRows, (r) => Number(r.fk_course_id)).filter((r) => Number(r.fk_course_id) > 0),
    [filterRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ).filter((r) => Number(r.fk_academic_year_id) > 0),
    [filterRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ).filter((r) => Number(r.fk_exam_id) > 0),
    [filterRows, courseId, academicYearId],
  )
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => Number(r.fk_college_id)).filter((r) => Number(r.fk_college_id) > 0),
    [restRows],
  )
  const groups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => Number(r.fk_college_id) === Number(collegeId)),
        (r) => Number(r.fk_course_group_id),
      ).filter((r) => Number(r.fk_course_group_id) > 0),
    [restRows, collegeId],
  )
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            Number(r.fk_college_id) === Number(collegeId) &&
            Number(r.fk_course_group_id) === Number(courseGroupId),
        ),
        (r) => Number(r.fk_course_year_id),
      ).filter((r) => Number(r.fk_course_year_id) > 0),
    [restRows, collegeId, courseGroupId],
  )
  const studentOptions = useMemo<SelectOption[]>(
    () =>
      students.map((s, i) => ({
        value: String(s.studentId ?? s.id ?? i),
        label: `${s.hallticketNumber ?? s.rollNumber ?? s.rollNo ?? '-'} - ${s.firstName ?? s.studentName ?? '-'}`,
      })),
    [students],
  )
  const studentExamOptions = useMemo(
    () =>
      dedupeBy(studentExams, (r) => Number(r.fk_exam_id ?? r.examId ?? r.id))
        .filter((r) => Number(r.fk_exam_id ?? r.examId ?? r.id) > 0)
        .map((r) => ({
          id: Number(r.fk_exam_id ?? r.examId ?? r.id),
          label: `${String(r.exam_name ?? r.examName ?? `Exam ${r.fk_exam_id ?? r.examId ?? r.id}`)}${
            formatRangeDate(r.from_date ?? r.fromDate) && formatRangeDate(r.to_date ?? r.toDate)
              ? ` (${formatRangeDate(r.from_date ?? r.fromDate)} - ${formatRangeDate(r.to_date ?? r.toDate)})`
              : ''
          }${
            r.is_regular_exam || r.isRegularExam ? ' (Regular)' : ''
          }${
            r.is_supply_exam || r.isSupplyExam ? ' (Supple)' : ''
          }`,
        })),
    [studentExams],
  )
  const selectedStudent = useMemo(
    () => students.find((s) => Number(s.studentId ?? s.id ?? 0) === Number(studentId ?? 0)) ?? null,
    [students, studentId],
  )
  const displayRows = useMemo(
    () => normalizeHallticketRows(rows).filter((r) => r && Object.keys(r).length > 0),
    [rows],
  )

  useEffect(() => {
    async function loadExamOptions() {
      if (filterRows.length > 0) return
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      if (Array.isArray(rows) && rows.length > 0) setFilterRows(rows)
    }
    void loadExamOptions()
  }, [employeeId, filterRows.length])

  async function initSectionFilters() {
    setLoading(true)
    try {
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      setFilterRows(rows)
      const c = dedupeBy(rows, (r) => Number(r.fk_course_id)).filter((r) => Number(r.fk_course_id) > 0)
      const firstCourse = c[0]?.fk_course_id ? Number(c[0].fk_course_id) : null
      setCourseId(firstCourse)
      if (!firstCourse) return

      const ay = dedupeBy(
        rows.filter((r) => Number(r.fk_course_id) === firstCourse),
        (r) => Number(r.fk_academic_year_id),
      ).filter((r) => Number(r.fk_academic_year_id) > 0)
      const firstAy = ay[0]?.fk_academic_year_id ? Number(ay[0].fk_academic_year_id) : null
      setAcademicYearId(firstAy)
      if (!firstAy) return

      const ex = dedupeBy(
        rows.filter((r) => Number(r.fk_course_id) === firstCourse && Number(r.fk_academic_year_id) === firstAy),
        (r) => Number(r.fk_exam_id),
      ).filter((r) => Number(r.fk_exam_id) > 0)
      const firstExam = ex[0]?.fk_exam_id ? Number(ex[0].fk_exam_id) : null
      setExamId(firstExam)
      if (!firstExam) return

      const rest = await getUnivExamRestNoTt({
        courseId: firstCourse,
        examId: firstExam,
        academicYearId: firstAy,
        employeeId,
      }).catch(() => [])
      setRestRows(rest)
      const firstCollege = dedupeBy(rest, (r) => Number(r.fk_college_id))[0]?.fk_college_id
      if (firstCollege) setCollegeId(Number(firstCollege))
    } finally {
      setLoading(false)
    }
  }

  async function searchStudents(qRaw: string) {
    const q = qRaw.trim()
    if (q.length < 3) return
    const data = await listStudents(q).catch(() => [])
    setStudents(Array.isArray(data) ? data : [])
  }

  async function onStudentSelect(nextId: number | null) {
    setStudentId(nextId)
    setRows([])
    setStudentExamId(null)
    setStudentExams([])
    if (!nextId) return
    const selected = students.find((s) => Number(s.studentId ?? s.id ?? 0) === Number(nextId))
    if (!selected) return
    const selectedCourseId = Number(selected.courseId ?? selected.fk_course_id ?? 0)
    const selectedAyId = Number(selected.academicYearId ?? selected.fk_academic_year_id ?? 0)

    const fromFilters = dedupeBy(
      filterRows.filter(
        (r) =>
          Number(r.fk_course_id ?? r.courseId ?? 0) === selectedCourseId &&
          (!selectedAyId || Number(r.fk_academic_year_id ?? r.academicYearId ?? 0) === selectedAyId),
      ),
      (r) => Number(r.fk_exam_id ?? r.examId ?? r.id),
    )
      .filter((r) => !(r.is_internal_exam ?? r.isInternalExam))

    if (fromFilters.length > 0) {
      setStudentExams(fromFilters)
      return
    }

    const masters = await listExamMastersByCourseAndAy(selectedCourseId, selectedAyId || 0).catch(() => [])
    const filtered = (Array.isArray(masters) ? masters : []).filter((r) => !(r.isInternalExam ?? r.is_internal_exam))
    setStudentExams(filtered)
  }

  async function onGetList() {
    const targetExamId = mode === 'student' ? studentExamId : examId
    if (!targetExamId || (mode === 'student' && !studentId)) return
    setLoading(true)
    setHasFetched(true)
    try {
      const data = await getExamHalltickets({
        examId: targetExamId,
        studentId: mode === 'student' ? (studentId ?? 0) : 0,
        collegeId: mode === 'section' ? (collegeId ?? 0) : 0,
        academicYearId: mode === 'section' ? (academicYearId ?? 0) : 0,
        courseId: mode === 'section' ? (courseId ?? 0) : 0,
        courseGroupId: mode === 'section' ? (courseGroupId ?? 0) : 0,
        courseYearId: mode === 'section' ? (courseYearId ?? 0) : 0,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function autoLoadStudentHallticket() {
      if (mode !== 'student') return
      if (!studentId || !studentExamId) return
      setLoading(true)
      setHasFetched(true)
      try {
        const data = await getExamHalltickets({
          examId: studentExamId,
          studentId,
          collegeId: 0,
          academicYearId: 0,
          courseId: 0,
          courseGroupId: 0,
          courseYearId: 0,
        })
        setRows(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    }
    void autoLoadStudentHallticket()
  }, [mode, studentId, studentExamId])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Hall Tickets" subtitle="Generate and download hall tickets" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Hallticket</h2>
        </div>

        <div className="p-3 space-y-2">
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              const next = (v as 'student' | 'section') || 'student'
              setMode(next)
              setRows([])
              setHasFetched(false)
              if (next === 'section') initSectionFilters()
            }}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="student" id="by-student" />
              <Label htmlFor="by-student">Hallticket By Student</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="section" id="by-section" />
              <Label htmlFor="by-section">Hallticket By Section</Label>
            </div>
          </RadioGroup>

          {mode === 'student' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-4 space-y-1">
                  <Select
                    label="Student"
                    placeholder="Search by student name or rollno."
                    value={studentId ? String(studentId) : null}
                    options={studentOptions}
                    searchable
                    clearable
                    className="[&_label]:text-[12px] [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
                    onSearch={(term) => void searchStudents(term)}
                    onChange={(v) => void onStudentSelect(v ? Number(v) : null)}
                  />
                </div>
                <div className="md:col-span-7 space-y-1">
                  <Label>Exam</Label>
                  <Select
                    value={studentExamId ? String(studentExamId) : null}
                    onChange={(v) => setStudentExamId(v ? Number(v) : null)}
                    options={studentExamOptions.map((e) => ({ value: String(e.id), label: e.label }))}
                    placeholder="Exam"
                  />
                </div>
              </div>
              {!!selectedStudent && !!studentExamId && (
                <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-9 text-[12px] leading-6">
                      <div className="font-semibold">
                        {selectedStudent.firstName ?? selectedStudent.studentName ?? '-'} (
                        <span className="text-blue-700">{selectedStudent.isLateral ? 'LATERAL' : 'REGULAR'}</span>)
                      </div>
                      <div className="text-muted-foreground">{selectedStudent.hallticketNumber ?? selectedStudent.rollNumber ?? '-'}</div>
                      <div className="text-muted-foreground">
                        {selectedStudent.collegeCode ?? '-'} / {selectedStudent.academicYear ?? '-'} / {selectedStudent.courseCode ?? '-'} /{' '}
                        {selectedStudent.groupCode ?? '-'} / {selectedStudent.courseYearName ?? '-'} / Section {selectedStudent.section ?? '-'}
                      </div>
                      <div className="text-muted-foreground">{selectedStudent.mobile ?? '-'}</div>
                    </div>
                    <div className="md:col-span-3 text-[12px] leading-7">
                      <div>
                        Quota : <span className="text-blue-700">{selectedStudent.quotaDisplayName ?? '-'}</span>
                      </div>
                      <div>
                        Student Status : <span className="text-green-700 font-medium">{selectedStudent.studentStatusDisplayName ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'section' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Program</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({ value: String(c.fk_course_id), label: c.course_code }))}
                  placeholder="Program"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({ value: String(a.fk_academic_year_id), label: a.academic_year }))}
                  placeholder="Exam Year"
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam Master</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={async (v) => {
                    const next = v ? Number(v) : null
                    setExamId(next)
                    if (!next || !courseId || !academicYearId) return
                    const rest = await getUnivExamRestNoTt({
                      courseId,
                      examId: next,
                      academicYearId,
                      employeeId,
                    }).catch(() => [])
                    setRestRows(rest)
                    const firstCollege = dedupeBy(rest, (r) => Number(r.fk_college_id))[0]?.fk_college_id
                    setCollegeId(firstCollege ? Number(firstCollege) : null)
                  }}
                  options={exams.map((e) => ({ value: String(e.fk_exam_id), label: e.exam_name }))}
                  placeholder="Exam Master"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>College</Label>
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => setCollegeId(v ? Number(v) : null)}
                  options={colleges.map((c) => ({ value: String(c.fk_college_id), label: c.college_code }))}
                  placeholder="College"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Group</Label>
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
                  options={groups.map((g) => ({ value: String(g.fk_course_group_id), label: g.group_code }))}
                  placeholder="Course Group"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={years.map((y) => ({ value: String(y.fk_course_year_id), label: y.course_year_code }))}
                  placeholder="Course Year"
                />
              </div>
              <div className="md:col-span-2">
                <Button type="button" onClick={onGetList} disabled={loading} className="h-8 px-3 text-[12px] w-full">
                  Get List
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(hasFetched || displayRows.length > 0) && (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={displayRows}
            columnDefs={HALLTICKET_COL_DEFS}
            pagination
            toolbar={{
              pdfDocumentTitle: 'Exam hallticket list',
            }}
            toolbarLeading={(
              <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                {displayRows.length} records
              </span>
            )}
            toolbarTrailing={(
              <Button
                type="button"
                size="sm"
                className="h-[30px] px-3 text-[12px]"
                onClick={() => window.print()}
              >
                {mode === 'student' ? 'Print' : 'Print All'}
              </Button>
            )}
          />
        </TableCard>
      )}
    </PageContainer>
  )
}

