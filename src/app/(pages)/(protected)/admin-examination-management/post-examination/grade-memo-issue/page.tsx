'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select as CommonSelect } from '@/common/components/select'
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getGradeMemoIssueResult,
} from '@/services/post-examination'
import { toastError } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}
function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? '').trim()
    if (v) return v
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

export default function GradeMemoIssuePage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [mode, setMode] = useState<'section' | 'student'>('section')
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [resultRows, setResultRows] = useState<AnyRow[]>([])
  const [gradesRows, setGradesRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [studentId, setStudentId] = useState<number>(0)
  const [memoDate, setMemoDate] = useState<string>(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    async function run() {
      setLoading(true)
      try {
        const rows = await getGradeMemoIssueFilters(employeeId).catch(() => [])
        setFilters(rows)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [employeeId])

  const courses = useMemo(() => dedupeBy(filters, ['fk_course_id', 'courseId']), [filters])
  const years = useMemo(
    () => dedupeBy(filters.filter((x) => numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId)), ['fk_academic_year_id', 'academicYearId']),
    [filters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        ['fk_exam_id', 'examId'],
      ),
    [filters, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restFilters, ['fk_college_id', 'collegeId']), [restFilters])
  const groups = useMemo(
    () =>
      dedupeBy(
        restFilters.filter((x) => numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['fk_course_group_id', 'courseGroupId'],
      ),
    [restFilters, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ),
    [restFilters, collegeId, courseGroupId],
  )

  const students = useMemo(() => {
    const map = new Map<number, AnyRow>()
    for (const row of resultRows) {
      const sid = numFrom(row, ['student_id', 'studentId', 'fk_student_id'])
      if (!sid || map.has(sid)) continue
      map.set(sid, row)
    }
    return [...map.values()]
  }, [resultRows])
  const courseOptions = useMemo(
    () => courses.map((x) => ({ value: String(numFrom(x, ['fk_course_id', 'courseId'])), label: strFrom(x, ['course_code', 'courseCode']) })).filter((o) => o.value !== '0'),
    [courses],
  )
  const yearOptions = useMemo(
    () => years.map((x) => ({ value: String(numFrom(x, ['fk_academic_year_id', 'academicYearId'])), label: strFrom(x, ['academic_year', 'academicYear']) })).filter((o) => o.value !== '0'),
    [years],
  )
  const examOptions = useMemo(
    () => exams.map((x) => ({ value: String(numFrom(x, ['fk_exam_id', 'examId'])), label: strFrom(x, ['exam_name', 'examName']) })).filter((o) => o.value !== '0'),
    [exams],
  )
  const collegeOptions = useMemo(
    () => colleges.map((x) => ({ value: String(numFrom(x, ['fk_college_id', 'collegeId'])), label: strFrom(x, ['college_code', 'collegeCode']) })).filter((o) => o.value !== '0'),
    [colleges],
  )
  const groupOptions = useMemo(
    () => groups.map((x) => ({ value: String(numFrom(x, ['fk_course_group_id', 'courseGroupId'])), label: strFrom(x, ['group_code', 'groupCode']) })).filter((o) => o.value !== '0'),
    [groups],
  )
  const courseYearOptions = useMemo(
    () => courseYears.map((x) => ({ value: String(numFrom(x, ['fk_course_year_id', 'courseYearId'])), label: strFrom(x, ['course_year_code', 'courseYearName']) })).filter((o) => o.value !== '0'),
    [courseYears],
  )
  const studentOptions = useMemo(
    () => [{ value: '0', label: 'All' }, ...students.map((s) => ({ value: String(numFrom(s, ['student_id', 'studentId', 'fk_student_id'])), label: `${strFrom(s, ['first_name', 'student_name'])} (${strFrom(s, ['hallticket_number', 'roll_number'])})` })).filter((o) => o.value !== '0')],
    [students],
  )

  useEffect(() => {
    if (courses[0]) setCourseId(numFrom(courses[0], ['fk_course_id', 'courseId']))
  }, [courses])
  useEffect(() => {
    if (years[0]) setAcademicYearId(numFrom(years[0], ['fk_academic_year_id', 'academicYearId']))
  }, [years])
  useEffect(() => {
    if (exams[0]) setExamId(numFrom(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])

  useEffect(() => {
    async function run() {
      setRestFilters([])
      if (!courseId || !examId || !academicYearId) return
      const rows = await getGradeMemoIssueRestFilters({ courseId, examId, academicYearId, employeeId }).catch(() => [])
      setRestFilters(rows)
    }
    void run()
  }, [courseId, examId, academicYearId, employeeId])

  useEffect(() => {
    if (colleges[0]) setCollegeId(numFrom(colleges[0], ['fk_college_id', 'collegeId']))
  }, [colleges])
  useEffect(() => {
    if (groups[0]) setCourseGroupId(numFrom(groups[0], ['fk_course_group_id', 'courseGroupId']))
  }, [groups])
  useEffect(() => {
    if (courseYears[0]) setCourseYearId(numFrom(courseYears[0], ['fk_course_year_id', 'courseYearId']))
  }, [courseYears])

  async function getDetails(selectedStudentId?: number) {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) return
    setLoading(true)
    try {
      const data = await getGradeMemoIssueResult({
        organizationId,
        examId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        studentId: selectedStudentId ?? (mode === 'student' ? studentId : 0),
      })
      const groupCode = strFrom(groups.find((g) => numFrom(g, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)) ?? {}, [
        'group_code',
        'groupCode',
      ])
      const filtered = (data.resultRows ?? [])
        .filter((x) => (groupCode ? strFrom(x, ['group_code']) === groupCode : true))
        .sort((a, b) => Number(a.order_no ?? 0) - Number(b.order_no ?? 0))
      setResultRows(filtered)
      setGradesRows([...(data.gradesRows ?? [])].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)))
    } catch (e) {
      toastError(e, 'Failed to fetch result details')
    } finally {
      setLoading(false)
    }
  }

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, AnyRow[]>()
    for (const row of resultRows) {
      const key = strFrom(row, ['hallticket_number'])
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      const bucket = map.get(key)
      if (bucket) bucket.push(row)
    }
    return [...map.values()]
  }, [resultRows])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Student Exam Certificates" subtitle="Grade memo issue" />

      <div className="app-card p-3 space-y-3">
        <div className="flex items-center gap-6 text-[13px]">
          <label className="flex items-center gap-2"><input type="radio" checked={mode === 'section'} onChange={() => { setMode('section'); setStudentId(0) }} /> Certificates By Section</label>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === 'student'} onChange={() => setMode('student')} /> Certificates By Student</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course</Label><CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Year</Label><CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={yearOptions} placeholder="Exam Year" /></div>
          <div className="space-y-1 md:col-span-6"><Label>Exam Master</Label><CommonSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam Master" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>College</Label><CommonSelect value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={collegeOptions} placeholder="College" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group</Label><CommonSelect value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={groupOptions} placeholder="Course Group" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year</Label><CommonSelect value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" /></div>
          {mode === 'student' && <div className="space-y-1 md:col-span-3"><Label>Student</Label><CommonSelect value={String(studentId || 0)} onChange={(v) => setStudentId(Number(v || 0))} options={studentOptions} placeholder="Student" searchable /></div>}
          <div className="space-y-1 md:col-span-2"><Label>Memo Date</Label><Input type="date" className="h-8 text-[12px]" value={memoDate} onChange={(e) => setMemoDate(e.target.value)} /></div>
          <div className="md:col-span-1"><Button className="h-8 text-[12px] w-full" onClick={() => void getDetails()} disabled={loading}>{loading ? 'Loading...' : 'Get Details'}</Button></div>
        </div>
      </div>

      {mode === 'student' && resultRows.length > 0 && (
        <div className="app-card p-3 overflow-x-auto">
          <h3 className="text-[14px] font-semibold mb-2">Student Exam Subjects</h3>
          <table className="w-full min-w-[900px] border-collapse text-[12px]">
            <thead><tr><th className="border px-2 py-1">SI No.</th><th className="border px-2 py-1">Subject Code</th><th className="border px-2 py-1">Subject Title</th><th className="border px-2 py-1">Internal</th><th className="border px-2 py-1">External</th><th className="border px-2 py-1">Total</th><th className="border px-2 py-1">Result</th><th className="border px-2 py-1">Credits</th></tr></thead>
            <tbody>{resultRows.map((r, i) => <tr key={`${r.subject_code}-${i}`}><td className="border px-2 py-1 text-center">{i + 1}</td><td className="border px-2 py-1">{strFrom(r, ['subject_code'])}</td><td className="border px-2 py-1">{strFrom(r, ['subject_name'])}</td><td className="border px-2 py-1 text-center">{r.internal_marks ?? '-'}</td><td className="border px-2 py-1 text-center">{r.external_marks ?? '-'}</td><td className="border px-2 py-1 text-center">{r.totalMarks ?? '-'}</td><td className="border px-2 py-1 text-center">{strFrom(r, ['examresult'])}</td><td className="border px-2 py-1 text-center">{r.credits ?? '-'}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {mode === 'section' && groupedByStudent.length > 0 && (
        <div className="app-card p-3 overflow-x-auto">
          <div className="flex items-center justify-end gap-2 mb-2">
            <Button className="h-8 text-[12px]" onClick={() => globalThis?.print?.()}>Print Bulk Sample Grade Card</Button>
            <Button className="h-8 text-[12px]" onClick={() => globalThis?.print?.()}>Print Bulk Grade Card</Button>
            <Button className="h-8 text-[12px]" onClick={() => globalThis?.print?.()}>Print Bulk Mark Sheet</Button>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2">Memo Date: {memoDate}</p>
          <table className="w-full min-w-[1000px] border-collapse text-[12px]">
            <thead><tr><th className="border px-2 py-1">USN</th><th className="border px-2 py-1">Student</th><th className="border px-2 py-1">Subjects</th><th className="border px-2 py-1">SGPA</th><th className="border px-2 py-1">CGPA</th></tr></thead>
            <tbody>{groupedByStudent.map((rows) => <tr key={strFrom(rows[0] ?? {}, ['hallticket_number']) || strFrom(rows[0] ?? {}, ['student_name', 'first_name'])}><td className="border px-2 py-1">{strFrom(rows[0] ?? {}, ['hallticket_number'])}</td><td className="border px-2 py-1">{strFrom(rows[0] ?? {}, ['student_name', 'first_name'])}</td><td className="border px-2 py-1">{rows.length}</td><td className="border px-2 py-1">{rows[0]?.sgpa ?? '-'}</td><td className="border px-2 py-1">{rows[0]?.cgpa ?? '-'}</td></tr>)}</tbody>
          </table>
          {gradesRows.length > 0 && <p className="text-[12px] text-muted-foreground mt-2">Grade scale loaded for selected regulation.</p>}
        </div>
      )}
    </PageContainer>
  )
}

