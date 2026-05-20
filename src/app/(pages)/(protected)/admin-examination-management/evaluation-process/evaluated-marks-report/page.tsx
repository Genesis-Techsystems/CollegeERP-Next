'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Select as SearchableSelect } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import {
  getEvaluatedMarksReport,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, unknown>

export default function EvaluatedMarksReportPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [isReevaluation, setIsReevaluation] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () => dedupeBy(baseRows.filter((r) => num(r.fk_course_id) === num(courseId)), (r) => num(r.fk_academic_year_id)),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId) && num(r.fk_academic_year_id) === num(academicYearId)),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const examOptions = useMemo<SelectOption[]>(
    () => exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: txt(r.exam_name) })),
    [exams],
  )
  const courseYears = useMemo(() => dedupeBy(restRows, (r) => num(r.fk_course_year_id)), [restRows])
  const regulations = useMemo(
    () => dedupeBy(restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)), (r) => num(r.fk_regulation_id)),
    [restRows, courseYearId],
  )
  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)), [subjectRows])
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getRegSupBaseFilters(employeeId)
        setBaseRows(list)
        setCourseId(num(list[0]?.fk_course_id) || null)
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null), [academicYears])
  useEffect(() => setExamId(num(exams[0]?.fk_exam_id) || null), [exams])
  useEffect(() => setRegulationId(num(regulations[0]?.fk_regulation_id) || null), [regulations])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const rest = await getRegSupRestFilters({ courseId, academicYearId, examId, employeeId })
      setRestRows(rest)
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null)
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId) return
      const sub = await getRegSupSubjectFilters({
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
        employeeId,
      })
      setSubjectRows(sub)
      setSubjectId(num(sub[0]?.fk_subject_id) || null)
    }
    void loadSubjects()
  }, [courseId, academicYearId, examId, courseYearId, regulationId, employeeId])

  async function getList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    setLoading(true)
    try {
      const data = await getEvaluatedMarksReport({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
        isReevaluation,
      })
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  const uniqueRows = useMemo(() => {
    const byOmr = new Map<string, AnyRow>()
    for (const row of rows) {
      const key = txt(row.omr_serial_no)
      if (key && !byOmr.has(key)) byOmr.set(key, row)
    }
    return Array.from(byOmr.values())
  }, [rows])

  function getMarks(serialNo: string, evaluatorNumber: number): string {
    const row = rows.find((r) => txt(r.omr_serial_no) === serialNo && num(r.evaluator_number) === evaluatorNumber)
    return txt(row?.evaluated_totalmarks)
  }

  function getProfileName(serialNo: string, evaluatorNumber: number): string {
    const row = rows.find((r) => txt(r.omr_serial_no) === serialNo && num(r.evaluator_number) === evaluatorNumber)
    return txt(row?.evaluator_name)
  }

  function getProfileNumber(serialNo: string, evaluatorNumber: number): string {
    const row = rows.find((r) => txt(r.omr_serial_no) === serialNo && num(r.evaluator_number) === evaluatorNumber)
    return txt(row?.user_name)
  }

  function getFinalMarks(serialNo: string): string {
    const row = rows.find((r) => txt(r.omr_serial_no) === serialNo)
    return txt(row?.final_marks)
  }

  const selectedCourse = courses.find((r) => num(r.fk_course_id) === num(courseId))
  const selectedCourseYear = courseYears.find((r) => num(r.fk_course_year_id) === num(courseYearId))
  const selectedSubject = subjects.find((r) => num(r.fk_subject_id) === num(subjectId))
  const selectedExam = exams.find((r) => num(r.fk_exam_id) === num(examId))

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Evaluated Marks Report" subtitle="Evaluator-wise marks and final marks report" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Evaluated Marks Report</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((r) => <SelectItem key={String(num(r.fk_course_id))} value={String(num(r.fk_course_id))}>{txt(r.course_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Academic Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((r) => <SelectItem key={String(num(r.fk_academic_year_id))} value={String(num(r.fk_academic_year_id))}>{txt(r.academic_year)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam</Label>
                <SearchableSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(num(v) || null)} options={examOptions} placeholder="Search exam…" searchable />
              </div>
              <div className="md:col-span-2 space-y-1"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((r) => <SelectItem key={String(num(r.fk_course_year_id))} value={String(num(r.fk_course_year_id))}>{txt(r.course_year_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((r) => <SelectItem key={String(num(r.fk_regulation_id))} value={String(num(r.fk_regulation_id))}>{txt(r.regulation_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-5 space-y-1">
                <Label>Subject</Label>
                <SearchableSelect value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(num(v) || null)} options={subjectOptions} placeholder="Search subjects…" searchable />
              </div>
              <div className="md:col-span-3">
                <label className="inline-flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={isReevaluation} onChange={(e) => setIsReevaluation(e.target.checked)} />
                  <span>Is Re-Evaluation</span>
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      {uniqueRows.length > 0 && (
        <div className="app-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-blue-700">Evaluated Marks Report</h3>
            <span className="text-[12px] text-blue-700 font-medium">
              {txt(selectedCourse?.course_code)} / {txt(selectedCourseYear?.course_year_code)} / {txt(selectedSubject?.subject_code)} / {txt(selectedExam?.exam_name)}
            </span>
          </div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">S No</th>
                  <th className="px-2 py-1 text-left">Omr Serial No</th>
                  <th className="px-2 py-1 text-left">Evaluator 1</th>
                  <th className="px-2 py-1 text-left">Evaluator 2</th>
                  <th className="px-2 py-1 text-left">Evaluator 3</th>
                  <th className="px-2 py-1 text-left">Final Marks</th>
                </tr>
              </thead>
              <tbody>
                {uniqueRows.map((row, i) => {
                  const serialNo = txt(row.omr_serial_no)
                  const e1 = getMarks(serialNo, 1)
                  const e2 = getMarks(serialNo, 2)
                  const e3 = getMarks(serialNo, 3)
                  return (
                    <tr key={`${serialNo}-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{serialNo}</td>
                      <td className="px-2 py-1">
                        <span title={`${getProfileName(serialNo, 1)} (${getProfileNumber(serialNo, 1)})`} className="text-blue-700 font-medium">
                          {e1 || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <span title={`${getProfileName(serialNo, 2)} (${getProfileNumber(serialNo, 2)})`} className="text-blue-700 font-medium">
                          {e2 || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <span title={`${getProfileName(serialNo, 3)} (${getProfileNumber(serialNo, 3)})`} className="text-blue-700 font-medium">
                          {e3 || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-1">{getFinalMarks(serialNo) || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

