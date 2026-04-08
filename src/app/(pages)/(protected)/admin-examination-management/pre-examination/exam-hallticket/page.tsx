'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getExamHalltickets,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listStudents,
} from '@/services/pre-examination'

type AnyRow = Record<string, any>

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function ExamHallticketPage() {
  const [mode, setMode] = useState<'student' | 'section'>('student')
  const [loading, setLoading] = useState(false)

  const [studentQuery, setStudentQuery] = useState('')
  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)
  const [studentExamId, setStudentExamId] = useState<number | null>(null)

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

  async function searchStudents() {
    const q = studentQuery.trim()
    if (q.length < 3) return
    const data = await listStudents(q).catch(() => [])
    setStudents(Array.isArray(data) ? data : [])
  }

  async function onGetList() {
    const targetExamId = mode === 'student' ? studentExamId : examId
    if (!targetExamId) return
    setLoading(true)
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

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Hallticket</h2>
        </div>

        <div className="p-4 space-y-4">
          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              const next = (v as 'student' | 'section') || 'student'
              setMode(next)
              setRows([])
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4 space-y-1">
                <Label>Student Search</Label>
                <div className="flex gap-2">
                  <Input
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search by student name / hallticket"
                    className="h-8 text-[12px]"
                  />
                  <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={searchStudents}>
                    Search
                  </Button>
                </div>
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Student</Label>
                <Select value={studentId ? String(studentId) : undefined} onValueChange={(v) => setStudentId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s, i) => (
                      <SelectItem key={`s-${s.studentId ?? i}`} value={String(s.studentId)}>
                        {(s.hallticketNumber ?? s.rollNo ?? '-')} - {s.firstName ?? s.studentName ?? '-'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Exam Id</Label>
                <Input
                  type="number"
                  value={studentExamId ?? ''}
                  onChange={(e) => setStudentExamId(e.target.value ? Number(e.target.value) : null)}
                  className="h-8 text-[12px]"
                  placeholder="Enter Exam ID"
                />
              </div>
              <div className="md:col-span-1">
                <Button type="button" className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loading}>
                  Get
                </Button>
              </div>
            </div>
          )}

          {mode === 'section' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Program</Label>
                <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Program" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c, i) => <SelectItem key={`c-${i}`} value={String(c.fk_course_id)}>{c.course_code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Year</Label>
                <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((a, i) => <SelectItem key={`ay-${i}`} value={String(a.fk_academic_year_id)}>{a.academic_year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam Master</Label>
                <Select
                  value={examId ? String(examId) : undefined}
                  onValueChange={async (v) => {
                    const next = Number(v)
                    setExamId(next)
                    if (!courseId || !academicYearId) return
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
                >
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Master" /></SelectTrigger>
                  <SelectContent>
                    {exams.map((e, i) => <SelectItem key={`e-${i}`} value={String(e.fk_exam_id)}>{e.exam_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label>College</Label>
                <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
                  <SelectContent>
                    {colleges.map((c, i) => <SelectItem key={`clg-${i}`} value={String(c.fk_college_id)}>{c.college_code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Group</Label>
                <Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger>
                  <SelectContent>
                    {groups.map((g, i) => <SelectItem key={`g-${i}`} value={String(g.fk_course_group_id)}>{g.group_code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Year</Label>
                <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
                  <SelectContent>
                    {years.map((y, i) => <SelectItem key={`y-${i}`} value={String(y.fk_course_year_id)}>{y.course_year_code}</SelectItem>)}
                  </SelectContent>
                </Select>
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

      {rows.length > 0 && (
        <div className="app-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-muted-foreground">{rows.length} records</div>
            <Button type="button" className="h-8 text-[12px]" onClick={() => window.print()}>
              Print
            </Button>
          </div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1">SI.No</th>
                  <th className="text-left px-2 py-1">Hallticket</th>
                  <th className="text-left px-2 py-1">Student</th>
                  <th className="text-left px-2 py-1">Exam Date</th>
                  <th className="text-left px-2 py-1">Subject Code</th>
                  <th className="text-left px-2 py-1">Subject Name</th>
                  <th className="text-left px-2 py-1">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`ht-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{r.hallticket_number ?? '-'}</td>
                    <td className="px-2 py-1">{r.first_name ?? r.student_name ?? '-'}</td>
                    <td className="px-2 py-1">{r.exam_date ? String(r.exam_date).slice(0, 10) : '-'}</td>
                    <td className="px-2 py-1">{r.subject_code ?? '-'}</td>
                    <td className="px-2 py-1">{r.subject_name ?? '-'}</td>
                    <td className="px-2 py-1">{r.subjecttype ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

