'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getExamLabTimetableFilters,
  getExamLabTimetableGrid,
  getExamLabTimetableRestFilters,
} from '@/services/exam-lab-timetable'
import { useRouter } from 'next/navigation'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Building2, Calendar, GraduationCap, ScrollText } from 'lucide-react'
import { useSessionContext } from '@/context/SessionContext'

type AnyRow = Record<string, any>

export default function ExamLabTimetablePage() {
  const router = useRouter()
  const { user } = useSessionContext()
  const empId = Number(user?.employeeId ?? 31754)
  const orgId = useMemo(() => {
    const fromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
    const fromSession = Number(user?.organizationId ?? 0)
    return fromStorage || fromSession || 1
  }, [user?.organizationId])
  const orgIdRef = useRef(orgId)
  const empIdRef = useRef(empId)
  orgIdRef.current = orgId
  empIdRef.current = empId

  const [base, setBase] = useState<AnyRow[]>([])
  const [rest, setRest] = useState<AnyRow[]>([])
  const [gridRows, setGridRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const rows = await getExamLabTimetableFilters(empId).catch(() => [])
      const list = rows.filter((x) => x.flag === 'univ_exam_filters')
      setBase(list)
      const firstCourse = dedupe(list, 'fk_course_id')[0]
      if (firstCourse?.fk_course_id) setCourseId(Number(firstCourse.fk_course_id))
      setLoading(false)
    }
    load()
  }, [])

  const courses = useMemo(() => dedupe(base, 'fk_course_id'), [base])
  const years = useMemo(
    () =>
      dedupe(base.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id').sort(
        (a, b) => Number(String(b.academic_year).split('-')[0]) - Number(String(a.academic_year).split('-')[0]),
      ),
    [base, courseId],
  )
  const exams = useMemo(
    () =>
      dedupe(
        base.filter(
          (x) =>
            Number(x.fk_course_id) === Number(courseId) &&
            Number(x.fk_academic_year_id) === Number(academicYearId),
        ),
        'fk_exam_id',
      ),
    [base, courseId, academicYearId],
  )

  useEffect(() => {
    if (years[0]?.fk_academic_year_id) setAcademicYearId(Number(years[0].fk_academic_year_id))
  }, [years])
  useEffect(() => {
    if (exams[0]?.fk_exam_id) setExamId(Number(exams[0].fk_exam_id))
  }, [exams])

  useEffect(() => {
    async function loadRest() {
      setRest([])
      setCollegeId(null)
      setCourseYearId(null)
      if (!courseId || !examId || !academicYearId) return
      const rows = await getExamLabTimetableRestFilters({
        courseId,
        examId,
        academicYearId,
        empId,
      }).catch(() => [])
      const list = rows.filter((x) => x.flag === 'univ_exam_rest_filters')
      setRest(list)
      const c = dedupe(list, 'fk_college_id')[0]
      if (c?.fk_college_id) setCollegeId(Number(c.fk_college_id))
    }
    loadRest()
  }, [courseId, examId, academicYearId])

  const colleges = useMemo(() => dedupe(rest, 'fk_college_id'), [rest])
  const courseYears = useMemo(
    () => dedupe(rest.filter((x) => Number(x.fk_college_id) === Number(collegeId)), 'fk_course_year_id'),
    [rest, collegeId],
  )
  const courseGroups = useMemo(
    () => dedupe(rest.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_course_group_id'),
    [rest, courseId],
  )

  useEffect(() => {
    async function loadGrid() {
      setGridRows([])
      if (!collegeId || !courseId || !courseYearId || !examId) return
      const rows = await getExamLabTimetableGrid({
        orgId: orgIdRef.current,
        collegeId,
        courseId,
        courseYearId,
        examId,
        empId: empIdRef.current,
      }).catch(() => [])
      setGridRows(Array.isArray(rows) ? rows : [])
    }
    loadGrid()
  }, [collegeId, courseId, courseYearId, examId])

  const examDetails = useMemo(
    () => exams.find((e) => Number(e.fk_exam_id) === Number(examId)),
    [exams, examId],
  )
  const examTypeLabel = useMemo(() => {
    if (!examDetails) return ''
    const tags: string[] = []
    if (examDetails.is_internal_exam) tags.push('[Internal]')
    if (examDetails.is_regular_exam) tags.push('[Regular]')
    if (examDetails.is_supply_exam) tags.push('[Supple]')
    return tags.join(' ')
  }, [examDetails])
  const dateColumns = useMemo(() => {
    if (!examDetails?.from_date || !examDetails?.to_date) return []
    const out: Date[] = []
    const cur = new Date(examDetails.from_date)
    const end = new Date(examDetails.to_date)
    while (cur <= end) {
      out.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return out
  }, [examDetails])

  const matrix = useMemo(() => {
    const byGroup: Record<string, AnyRow[]> = {}
    for (const row of gridRows) {
      const g = String(row.group_code ?? row.groupCode ?? '')
      if (!byGroup[g]) byGroup[g] = []
      byGroup[g].push(row)
    }
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return courseGroups.map((g) => {
      const code = String(g.group_code ?? '')
      const cells = dateColumns.map((d) => {
        const ymd = format(d, 'yyyy-MM-dd')
        const rows = (byGroup[code] ?? []).filter((r) => {
          try { return format(parseISO(String(r.examDate)), 'yyyy-MM-dd') === ymd } catch { return false }
        })
        return { date: d, day: days[d.getDay()], rows }
      })
      return { code, cells }
    })
  }, [gridRows, courseGroups, dateColumns])

  return (
    <PageContainer className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Lab Timetable</h2>
      <GlobalFilterBar>
        <GlobalFilterBarRow columns={3}>
          <GlobalFilterField label="Course" icon={GraduationCap}>
            <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))} disabled={loading}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>{c.course_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Exam Year" icon={Calendar}>
            <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y.fk_academic_year_id} value={String(y.fk_academic_year_id)}>{y.academic_year}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Exam Master" icon={ScrollText}>
            <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Exam Master" /></SelectTrigger>
              <SelectContent>{exams.map((e) => <SelectItem key={e.fk_exam_id} value={String(e.fk_exam_id)}>{e.exam_name}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
        </GlobalFilterBarRow>
        <GlobalFilterBarRow columns={2}>
          <GlobalFilterField label="College" icon={Building2}>
            <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="College" /></SelectTrigger>
              <SelectContent>{colleges.map((c) => <SelectItem key={c.fk_college_id} value={String(c.fk_college_id)}>{c.college_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Course Year" icon={GraduationCap}>
            <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
              <SelectContent>{courseYears.map((y) => <SelectItem key={y.fk_course_year_id} value={String(y.fk_course_year_id)}>{y.course_year_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {courseYearId && (
        <>
          <div className="app-card p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[12px] text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                {(colleges.find((c) => Number(c.fk_college_id) === Number(collegeId))?.college_code ?? '')} /{' '}
                {(courses.find((c) => Number(c.fk_course_id) === Number(courseId))?.course_code ?? '')} /{' '}
                {(years.find((y) => Number(y.fk_academic_year_id) === Number(academicYearId))?.academic_year ?? '')} /{' '}
                {(courseYears.find((y) => Number(y.fk_course_year_id) === Number(courseYearId))?.course_year_code ?? '')}
                {' | '}
                <span className="font-medium text-slate-900">{examDetails?.exam_name ?? ''}</span>{' '}
                {examDetails?.from_date
                  ? (() => {
                      try {
                        return `(${format(parseISO(String(examDetails.from_date)), 'dd MMM yyyy')} – ${format(parseISO(String(examDetails.to_date ?? '')), 'dd MMM yyyy')})`
                      } catch { return '' }
                    })()
                  : ''}{' '}
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] bg-[hsl(var(--primary))] text-white">{examTypeLabel}</span>
              </div>
              <Button
                className="h-8 text-[12px]"
                onClick={() =>
                  router.push(
                    `/admin-examination-management/admin-exam-masters/exam-lab-timetable/add-exam-timetables?collegeId=${collegeId}&courseId=${courseId}&courseYearId=${courseYearId}&academicYearId=${academicYearId}&examId=${examId}&courseYearName=${encodeURIComponent(
                      courseYears.find((y) => Number(y.fk_course_year_id) === Number(courseYearId))?.course_year_code ?? '',
                    )}`,
                  )
                }
              >
                + Create Schedule
              </Button>
            </div>
            <p className="text-right text-[12px] mb-2"><span className="px-1 border bg-sky-200">M</span> MORNING <span className="px-1 border bg-yellow-200 ml-2">A</span> AFTERNOON</p>
            <div className="overflow-auto">
              <table className="w-full text-[12px] border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="border px-2 py-1">Branch</th>
                    {dateColumns.map((d) => (
                      <th className="border px-2 py-1" key={d.toISOString()}>
                        {d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        <div className="text-blue-600">({['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()]})</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((g) => (
                    <tr key={g.code}>
                      <td className="border px-2 py-1 text-center text-blue-700">{g.code}</td>
                      {g.cells.map((c) => (
                        <td className="border px-2 py-1 align-top" key={`${g.code}-${c.date.toISOString()}`}>
                          {c.rows.length === 0 ? <span>-</span> : c.rows.map((r: AnyRow, i: number) => (
                            <p key={`r-${i}`} className={`mb-1 p-1 rounded ${String(r.examsessioninCatCode).toUpperCase() === 'AFTERNOON' ? 'bg-yellow-100' : 'bg-sky-100'}`}>
                              {r.subjectCode} {r.examLabBatchName ? `(${r.examLabBatchName})` : ''}
                              <span className="ml-1 text-[10px]">
                                {String(r.examTypeCatCode ?? '').toLowerCase() === 'regular'
                                  ? 'R'
                                  : String(r.examTypeCatCode ?? '').toLowerCase() === 'supple'
                                  ? 'S'
                                  : String(r.examTypeCatCode ?? '').toLowerCase() === 'internal'
                                  ? 'I'
                                  : String(r.examTypeCatCode ?? '').slice(0, 1)}
                              </span>
                            </p>
                          ))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-end">
              <Button className="h-8 text-[12px]" onClick={() => alert('Check Conflicts flow will be wired next.')}>Check Conflicts</Button>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  )
}

function dedupe<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const v = String(item?.[key] ?? '')
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(item)
  }
  return out
}

