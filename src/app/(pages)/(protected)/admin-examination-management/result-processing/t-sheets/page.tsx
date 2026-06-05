'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'
import { getAllRecords } from '@/services/crud'
import { listStudents } from '@/services/pre-examination'
import { toastError } from '@/lib/toast'

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

function toTitle(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export default function TSheetsPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [mode, setMode] = useState<'course' | 'student'>('course')

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [isPass, setIsPass] = useState<-1 | 0 | 1>(-1)
  const [examMonthYear, setExamMonthYear] = useState<string>('')

  const [studentQuery, setStudentQuery] = useState('')
  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [searchingStudents, setSearchingStudents] = useState(false)

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
        const list = Array.isArray(picked) ? picked : []
        setFilters(list)
        if (list[0]) setCollegeId(numFrom(list[0], ['fk_college_id', 'collegeId']))
      } catch (error) {
        setFilters([])
        toastError(error, 'Failed to load filters')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId, organizationId])

  const colleges = useMemo(() => dedupeBy(filters, ['fk_college_id', 'collegeId']), [filters])
  const courses = useMemo(
    () =>
      dedupeBy(
        filters.filter((x) => numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['fk_course_id', 'courseId'],
      ),
    [filters, collegeId],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['fk_academic_year_id', 'academicYearId'],
      ),
    [filters, collegeId, courseId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['fk_course_group_id', 'courseGroupId'],
      ),
    [filters, collegeId, courseId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ),
    [filters, collegeId, courseId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['fk_regulation_id', 'regulationId'],
      ),
    [filters, collegeId, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId) &&
            (academicYearId ? numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId) : true),
        ),
        ['fk_exam_id', 'examId'],
      ),
    [filters, collegeId, courseId, academicYearId],
  )

  const monthYearOptions = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['exam_month_yr'],
      )
        .map((x) => ({
          value: strFrom(x, ['exam_month_yr']),
          label: strFrom(x, ['exam_month_yr']),
        }))
        .filter((o) => o.value),
    [filters, collegeId, courseId],
  )

  const collegeOptions = useMemo(
    () =>
      colleges.map((x) => ({
        value: String(numFrom(x, ['fk_college_id', 'collegeId'])),
        label: strFrom(x, ['college_code', 'collegeCode', 'college_name', 'collegeName']),
      })),
    [colleges],
  )
  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(numFrom(x, ['fk_course_id', 'courseId'])),
        label: strFrom(x, ['course_code', 'courseCode', 'course_name', 'courseName']),
      })),
    [courses],
  )
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((x) => ({
        value: String(numFrom(x, ['fk_academic_year_id', 'academicYearId'])),
        label: strFrom(x, ['academic_year', 'academicYear']),
      })),
    [academicYears],
  )
  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((x) => ({
        value: String(numFrom(x, ['fk_course_group_id', 'courseGroupId'])),
        label: strFrom(x, ['group_code', 'groupCode']),
      })),
    [courseGroups],
  )
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((x) => ({
        value: String(numFrom(x, ['fk_course_year_id', 'courseYearId'])),
        label: strFrom(x, ['course_year_name', 'courseYearName', 'courseYearCode']),
      })),
    [courseYears],
  )
  const regulationOptions = useMemo(
    () =>
      regulations.map((x) => ({
        value: String(numFrom(x, ['fk_regulation_id', 'regulationId'])),
        label: strFrom(x, ['regulation_code', 'regulationCode', 'regulation_name', 'regulationName']),
      })),
    [regulations],
  )
  const examOptions = useMemo(
    () =>
      exams
        .filter((x) => !x.is_internal_exam && !x.isInternalExam)
        .map((x) => ({
          value: String(numFrom(x, ['fk_exam_id', 'examId'])),
          label: strFrom(x, ['exam_name', 'examName']),
        })),
    [exams],
  )
  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        value: String(numFrom(s, ['studentId', 'id'])),
        label: `${s.rollNumber ?? s.hallticketNumber ?? '-'} (${s.firstName ?? s.studentName ?? '-'})`,
      })),
    [students],
  )

  async function onSearchStudents() {
    const q = studentQuery.trim()
    if (q.length < 3) return
    setSearchingStudents(true)
    try {
      const data = await listStudents(q).catch(() => [])
      setStudents(Array.isArray(data) ? data : [])
    } finally {
      setSearchingStudents(false)
    }
  }

  function resetFilters() {
    setAcademicYearId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setRegulationId(null)
    setExamId(null)
    setExamMonthYear('')
    setStudentId(null)
    setRows([])
  }

  async function getList() {
    if (!examId && !examMonthYear) return
    setLoading(true)
    try {
      let data: AnyRow[] = []
      if (examMonthYear && courseId) {
        const resp = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_result_memos', {
          in_flag: 'list_exam_tsheet',
          in_orgid: 1,
          in_fdate: '1990-01-01',
          in_tdate: '1990-01-01',
          in_exam_month_yr: examMonthYear,
          in_course_code: strFrom(courses.find((c) => numFrom(c, ['fk_course_id', 'courseId']) === Number(courseId)) ?? {}, ['course_code', 'courseCode']),
          in_course_year_code: '',
          in_subject_code: '',
          in_evalutor_profileid: 0,
          in_exam_date: '1990-01-01',
          in_regulation_code: '',
          in_emp_id: 0,
          in_questionpaper_id: 0,
        })
        data = Array.isArray(resp?.result?.[0]) ? resp.result[0] : []
      } else {
        const resp = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_result_memos', {
          in_flag: 'list_exam_tsheet',
          in_exam_id: examId ?? 0,
          in_course_id: courseId ?? 0,
          in_course_group_id: courseGroupId ?? 0,
          in_course_year_id: courseYearId ?? 0,
          in_std_id: mode === 'student' ? studentId ?? 0 : 0,
          in_regulation_id: regulationId ?? 0,
          in_ispass: isPass,
          in_subject_id: 0,
          in_above_fail_subjects: -1,
          in_below_credits: -1,
        })
        data = Array.isArray(resp?.result?.[0]) ? resp.result[0] : []
      }
      const normalized = (Array.isArray(data) ? data : []).map((r, i) => ({
        id: i + 1,
        ...r,
        internal_marks: r.internal_marks ?? ' - ',
        external_marks: r.external_marks ?? ' - ',
        grade: r.grade ?? ' - ',
        grade_points: r.grade_points ?? ' - ',
      }))
      setRows(normalized)
    } catch (error) {
      setRows([])
      toastError(error, 'Failed to fetch T-Sheets')
    } finally {
      setLoading(false)
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    if (!rows.length) return []
    const keys = Object.keys(rows[0])
    const preferred = [
      'id',
      'roll_number',
      'hallticket_number',
      'student_name',
      'studentName',
      'college_code',
      'exam_name',
      'examtype',
      'subject_name',
      'internal_marks',
      'external_marks',
      'grade',
      'grade_points',
      'result',
      'credits',
    ]
    const sortedKeys = [...keys].sort((a, b) => {
      const ia = preferred.indexOf(a)
      const ib = preferred.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    return sortedKeys.map((key) => ({
      field: key,
      headerName: toTitle(key),
      minWidth: key.length > 14 ? 180 : 120,
    }))
  }, [rows])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="T-Sheets" subtitle="Result Processing" />

      <div className="app-card p-3 space-y-3">
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'course' | 'student')} className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="course" id="mode-course" />
            Detailed Result By Course
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <RadioGroupItem value="student" id="mode-student" />
            Detailed Result By Student
          </label>
        </RadioGroup>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          {mode === 'course' && (
            <>
              <div className="space-y-1 md:col-span-2">
                <Label>College</Label>
                <Select value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={collegeOptions} placeholder="College" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Course</Label>
                <Select value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Exam Year</Label>
                <Select value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYearOptions} placeholder="Exam Year" />
              </div>
            </>
          )}

          {mode === 'student' && (
            <div className="space-y-1 md:col-span-4">
              <Label>Student</Label>
              <div className="flex gap-2">
                <Input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Search by student name or rollNo."
                  className="h-8 text-[12px]"
                />
                <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => void onSearchStudents()} disabled={searchingStudents}>
                  Search
                </Button>
              </div>
              <Select
                value={studentId ? String(studentId) : null}
                onChange={(v) => setStudentId(v ? Number(v) : null)}
                options={studentOptions}
                placeholder="Select Student"
                searchable
              />
            </div>
          )}

          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam" searchable />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Course Group</Label>
            <Select value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroupOptions} placeholder="Course Group" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year</Label>
            <Select value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Regulation</Label>
            <Select value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} placeholder="Regulation" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Result Status</Label>
            <Select
              value={String(isPass)}
              onChange={(v) => setIsPass(v === '1' ? 1 : v === '0' ? 0 : -1)}
              options={[
                { value: '-1', label: 'All' },
                { value: '1', label: 'Pass' },
                { value: '0', label: 'Fail' },
              ]}
              placeholder="Result Status"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Month Year</Label>
            <Select value={examMonthYear || null} onChange={(v) => setExamMonthYear(v ?? '')} options={monthYearOptions} placeholder="Exam Month Year" />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <Button className="h-8 text-[12px] flex-1" onClick={() => void getList()} disabled={loading}>
              Get List
            </Button>
            <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <TableCard>
          <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} pagination />
        </TableCard>
      )}
    </PageContainer>
  )
}

