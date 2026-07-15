'use client'

/**
 * Tabulation Register — Angular `tabulation_register` (non-SUK matrix layout).
 * One row per student; each subject is a colspan-9 group: CIE, SEE, Mod, Grc, 0.5%, Tot, Gr, Gp, Cr.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { FileSpreadsheet, Loader2, Printer, RefreshCw } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getTabulationRegisterRows,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  listStudents,
  type AnyRow,
} from '@/services'

type Row = AnyRow

const MARK_KEYS = [
  'internal_marks',
  'external_marks_secured',
  'moderation_marks',
  'grace_marks',
  'lastsem_marks_added',
  'subject_total',
  'grade',
  'grade_points',
  'credits',
] as const

const MARK_HEADERS = ['CIE', 'SEE', 'Mod', 'Grc', '0.5%', 'Tot', 'Gr', 'Gp', 'Cr'] as const

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function dash(v: unknown): string {
  const s = txt(v).trim()
  return !s || s === 'null' || s === 'undefined' ? '—' : s
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    const k = String(keyFn(r) ?? '')
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(r)
  }
  return out
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v)
  if (!s) return ''
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return format(parseISO(s.slice(0, 10)), 'dd MMM, yyyy')
    return format(new Date(s), 'dd MMM, yyyy')
  } catch {
    return s
  }
}

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || 'Exam'
  const from = parseMaybeDate(r.from_date ?? r.fromDate)
  const to = parseMaybeDate(r.to_date ?? r.toDate)
  const range = from && to ? ` (${from} - ${to})` : ''
  return `${name}${range}`
}

function findMarks(subjectList: Row[], subjectCode: string, markType: string): string {
  const subject = subjectList.find((item) => txt(item.subject_code) === subjectCode)
  if (!subject) return '—'
  let v = subject[markType]
  if ((v === null || v === undefined || v === '') && markType === 'external_marks_secured') {
    v = subject.external_marks
  }
  if ((v === null || v === undefined || v === '') && markType === 'subject_total') {
    v = subject.total_marks
  }
  if (v === null || v === undefined || v === '') return '—'
  return String(v)
}

/** Unique subjects in first-seen order (Angular subjectCodes). */
function collectSubjectCodes(rows: Row[]): string[] {
  const seen = new Set<string>()
  const codes: string[] = []
  for (const r of rows) {
    const code = txt(r.subject_code)
    if (!code || seen.has(code)) continue
    seen.add(code)
    codes.push(code)
  }
  return codes
}

/** Group flat subject rows by hall ticket (Angular mainList). */
function groupByHallticket(rows: Row[]): Row[][] {
  const order: string[] = []
  const map = new Map<string, Row[]>()
  for (const r of rows) {
    const ht = txt(r.hallticket_number ?? r.hallticket_no)
    if (!ht) continue
    if (!map.has(ht)) {
      map.set(ht, [])
      order.push(ht)
    }
    map.get(ht)!.push(r)
  }
  return order.map((ht) => map.get(ht)!)
}

function exportTableAsExcel(tableEl: HTMLTableElement | null, filename: string) {
  if (!tableEl) return
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8" /></head>
<body>${tableEl.outerHTML}</body>
</html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xls`
  a.click()
  URL.revokeObjectURL(url)
}

export default function TabulationRegisterPage() {
  const tableRef = useRef<HTMLTableElement>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [searchingStudent, setSearchingStudent] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([])
  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [examTypeId, setExamTypeId] = useState('0')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [hallticketNo, setHallticketNo] = useState('0')
  const [isReEvaluation, setIsReEvaluation] = useState(false)

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
  }, [])

  useEffect(() => {
    async function init() {
      if (!employeeId) return
      setLoadingFilters(true)
      try {
        const filters = await getUnivExamFiltersRegSup(employeeId)
        const list = Array.isArray(filters) ? filters : []
        setBaseRows(list)
        const courses = dedupeBy(list, (r) => num(r.fk_course_id))
        if (courses[0]) setCourseId(String(num(courses[0].fk_course_id)))
      } catch (e) {
        toastError(e, 'Failed to load filters')
      } finally {
        setLoadingFilters(false)
      }
    }
    void init()
  }, [employeeId])

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restRows, (r) => num(r.fk_college_id)), [restRows])
  const courseGroups = useMemo(() => {
    const source = restRows.filter((r) => !collegeId || num(r.fk_college_id) === Number(collegeId))
    return dedupeBy(source, (r) => num(r.fk_course_group_id))
  }, [restRows, collegeId])
  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId || num(r.fk_course_group_id) === Number(courseGroupId)),
    )
    return dedupeBy(source, (r) => num(r.fk_course_year_id))
  }, [restRows, collegeId, courseGroupId])

  const examTypeOptions: SelectOption[] = useMemo(() => {
    const types = dedupeBy(exams, (r) => num(r.fk_exam_type_id ?? r.exam_type_id ?? r.examTypeCatdetId))
    const opts = types
      .map((r) => ({
        value: String(num(r.fk_exam_type_id ?? r.exam_type_id ?? r.examTypeCatdetId)),
        label: txt(r.exam_type ?? r.examType ?? r.gd_display_name) || String(num(r.fk_exam_type_id)),
      }))
      .filter((o) => o.value !== '0')
    return [{ value: '0', label: 'All' }, ...opts]
  }, [exams])

  useEffect(() => {
    if (!courseId || !academicYears.length) return
    if (!academicYears.some((r) => num(r.fk_academic_year_id) === Number(academicYearId))) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)))
    }
  }, [courseId, academicYears, academicYearId])

  useEffect(() => {
    if (!academicYearId || !exams.length) return
    if (!exams.some((r) => num(r.fk_exam_id) === Number(examId))) {
      setExamId(String(num(exams[0].fk_exam_id)))
    }
  }, [academicYearId, exams, examId])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([])
        return
      }
      setLoadingFilters(true)
      try {
        const bundle = await getUnivExamRestInRegExamStd({
          courseId: Number(courseId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          employeeId,
        })
        setRestRows(Array.isArray(bundle.restFilters) ? bundle.restFilters : [])
        setCollegeId('')
        setCourseGroupId('')
        setCourseYearId('')
        setHallticketNo('0')
        setStudentOptions([])
        setRows([])
        setHasFetched(false)
      } catch (e) {
        toastError(e, 'Failed to load filters')
        setRestRows([])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (!colleges.length) return
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)))
    }
  }, [colleges, collegeId])

  useEffect(() => {
    if (!courseGroups.length) return
    if (!courseGroups.some((r) => num(r.fk_course_group_id) === Number(courseGroupId))) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)))
      setCourseYearId('')
    }
  }, [courseGroups, courseGroupId])

  useEffect(() => {
    if (!courseYears.length) return
    if (!courseYears.some((r) => num(r.fk_course_year_id) === Number(courseYearId))) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)))
    }
  }, [courseYears, courseYearId])

  const subjectCodes = useMemo(() => collectSubjectCodes(rows), [rows])
  const mainList = useMemo(() => groupByHallticket(rows), [rows])

  async function onSearchStudent(term: string) {
    const q = term.trim()
    if (q.length < 2) {
      setStudentOptions([])
      return
    }
    setSearchingStudent(true)
    try {
      const list = await listStudents(q)
      setStudentOptions(
        (Array.isArray(list) ? list : []).map((r) => {
          const roll = txt(r.hallticketNumber ?? r.rollNumber ?? r.roll_number ?? r.hallticketNo)
          const name = txt(r.firstName ?? r.studentName ?? r.student_name)
          return {
            value: roll || String(num(r.studentId)),
            label: name ? `${roll} (${name})` : roll || 'Student',
          }
        }),
      )
    } catch {
      setStudentOptions([])
    } finally {
      setSearchingStudent(false)
    }
  }

  async function onGetReport() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getTabulationRegisterRows({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        hallticketNo: hallticketNo && hallticketNo !== '0' ? hallticketNo : '',
        examType: Number(examTypeId || 0),
        isReEvaluation,
      })
      setRows(Array.isArray(list) ? list : [])
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load tabulation register')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const studentSelectOptions: SelectOption[] = useMemo(
    () => [{ value: '0', label: 'All' }, ...studentOptions.filter((o) => o.value && o.value !== '0')],
    [studentOptions],
  )

  const showMatrix = hasFetched && mainList.length > 0 && subjectCodes.length > 0

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-semibold text-foreground">Tabulation Register</h1>
        </div>
        <div className="space-y-2 border-b border-border p-4">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>Course *</Label>
              <Select
                value={courseId || null}
                onChange={(v) => {
                  setCourseId(v ?? '')
                  setAcademicYearId('')
                  setExamId('')
                }}
                options={courses.map((r) => ({
                  value: String(num(r.fk_course_id)),
                  label: txt(r.course_code) || String(num(r.fk_course_id)),
                }))}
                isLoading={loadingFilters}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Year *</Label>
              <Select
                value={academicYearId || null}
                onChange={(v) => {
                  setAcademicYearId(v ?? '')
                  setExamId('')
                }}
                options={academicYears.map((r) => ({
                  value: String(num(r.fk_academic_year_id)),
                  label: txt(r.academic_year) || String(num(r.fk_academic_year_id)),
                }))}
                disabled={!courseId}
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam Master *</Label>
              <Select
                value={examId || null}
                onChange={(v) => setExamId(v ?? '')}
                options={exams.map((r) => ({
                  value: String(num(r.fk_exam_id)),
                  label: examMasterLabel(r),
                }))}
                searchable
                wrapOptionLabels
                disabled={!academicYearId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Type *</Label>
              <Select value={examTypeId} onChange={(v) => setExamTypeId(v ?? '0')} options={examTypeOptions} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId || null}
                onChange={(v) => {
                  setCollegeId(v ?? '')
                  setCourseGroupId('')
                  setCourseYearId('')
                }}
                options={colleges.map((r) => ({
                  value: String(num(r.fk_college_id)),
                  label: txt(r.college_code) || String(num(r.fk_college_id)),
                }))}
                disabled={!examId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId || null}
                onChange={(v) => {
                  setCourseGroupId(v ?? '')
                  setCourseYearId('')
                }}
                options={courseGroups.map((r) => ({
                  value: String(num(r.fk_course_group_id)),
                  label: txt(r.group_code) || String(num(r.fk_course_group_id)),
                }))}
                disabled={!collegeId}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Years *</Label>
              <Select
                value={courseYearId || null}
                onChange={(v) => setCourseYearId(v ?? '')}
                options={courseYears.map((r) => ({
                  value: String(num(r.fk_course_year_id)),
                  label: txt(r.course_year_code) || String(num(r.fk_course_year_id)),
                }))}
                disabled={!courseGroupId}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Student</Label>
              <Select
                value={hallticketNo || '0'}
                onChange={(v) => setHallticketNo(v ?? '0')}
                options={studentSelectOptions}
                searchable
                isLoading={searchingStudent}
                onSearch={(term) => void onSearchStudent(term)}
                placeholder="Search by name or hallticket"
              />
            </div>
            <div className="flex h-8 items-center gap-2 md:col-span-2">
              <Checkbox
                id="tabulation-reeval"
                checked={isReEvaluation}
                onCheckedChange={(v) => setIsReEvaluation(v === true)}
              />
              <Label htmlFor="tabulation-reeval" className="cursor-pointer font-normal">
                Is Re-Evaluation
              </Label>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="button" className="h-8 text-[12px]" onClick={() => void onGetReport()} disabled={loading}>
                Get Report
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Reset"
                onClick={() => {
                  setRows([])
                  setHasFetched(false)
                  setHallticketNo('0')
                  setIsReEvaluation(false)
                  setStudentOptions([])
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {showMatrix ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 text-[12px]"
                onClick={() => exportTableAsExcel(tableRef.current, 'Tabulation Register Report')}
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Export Excel
              </Button>
              <Button type="button" size="sm" className="h-9 text-[12px]" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                {mainList.length} student{mainList.length === 1 ? '' : 's'} · {subjectCodes.length} subject
                {subjectCodes.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="max-h-[min(70vh,720px)] overflow-auto p-2">
              <table
                ref={tableRef}
                className="w-max min-w-full border-collapse text-[11px] leading-tight"
              >
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-20 border border-slate-300 bg-slate-100 px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                    >
                      Hall Ticket No.
                    </th>
                    {subjectCodes.map((code) => (
                      <th
                        key={`h-${code}`}
                        colSpan={9}
                        className="border border-slate-300 bg-slate-100 px-1 py-1.5 text-center font-semibold whitespace-nowrap"
                      >
                        {code}
                      </th>
                    ))}
                    <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                      Total Marks
                    </th>
                    <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                      Total Credits
                    </th>
                    <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                      Perc.%
                    </th>
                    <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                      Result
                    </th>
                    <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                      SGPA
                    </th>
                    <th rowSpan={2} className="border border-slate-300 bg-slate-100 px-2 py-1.5 font-semibold whitespace-nowrap">
                      CGPA
                    </th>
                  </tr>
                  <tr>
                    {subjectCodes.map((code) =>
                      MARK_HEADERS.map((h) => (
                        <th
                          key={`${code}-${h}`}
                          className="border border-slate-300 bg-slate-50 px-1 py-1 text-center font-medium"
                        >
                          {h}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mainList.map((list) => {
                    const ht = txt(list[0]?.hallticket_number ?? list[0]?.hallticket_no)
                    return (
                      <tr key={ht} className="odd:bg-white even:bg-slate-50/60">
                        <td className="sticky left-0 z-[1] border border-slate-200 bg-inherit px-2 py-1 whitespace-nowrap font-medium">
                          {dash(ht)}
                        </td>
                        {subjectCodes.map((code) =>
                          MARK_KEYS.map((key) => (
                            <td
                              key={`${ht}-${code}-${key}`}
                              className="border border-slate-200 px-1 py-1 text-center whitespace-nowrap"
                            >
                              {findMarks(list, code, key)}
                            </td>
                          )),
                        )}
                        <td className="border border-slate-200 px-2 py-1 text-center whitespace-nowrap">
                          {dash(list[0]?.final_sem_total_marks)}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center whitespace-nowrap">
                          {dash(list[0]?.total_credits)}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center whitespace-nowrap">
                          {dash(list[0]?.final_sem_percentage)}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center whitespace-nowrap">
                          {dash(list[0]?.final_sem_result)}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center whitespace-nowrap">
                          {dash(list[0]?.sgpa)}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center whitespace-nowrap">
                          {dash(list[0]?.cgpa)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center px-4 py-10 text-sm text-muted-foreground">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : hasFetched ? (
              'No rows to show'
            ) : (
              'Select filters and click Get Report'
            )}
          </div>
        )}
      </div>
    </PageContainer>
  )
}
