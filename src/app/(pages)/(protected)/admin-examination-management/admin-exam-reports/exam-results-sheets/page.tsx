'use client'

/**
 * Exam Result Sheets — Angular `exam_results_sheets`.
 * Groups hall tickets by ResultStatus (Passed / Promoted / Detained) in a 4-column grid.
 */

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Loader2, Printer, RefreshCw } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getExamFinalAnalysisReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  type AnyRow,
} from '@/services'

type Row = AnyRow

const STATUS_ORDER = ['Passed', 'Promoted', 'Detained'] as const

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const r of rows) {
    const k = keyFn(r)
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

export default function ExamResultsSheetsPage() {
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [searchText, setSearchText] = useState('')
  const [isReevaluation, setIsReevaluation] = useState(false)
  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [examTypeId, setExamTypeId] = useState('0')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')

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

  const filterSummary = useMemo(() => {
    const college = colleges.find((r) => num(r.fk_college_id) === Number(collegeId))
    const course = courses.find((r) => num(r.fk_course_id) === Number(courseId))
    const group = courseGroups.find((r) => num(r.fk_course_group_id) === Number(courseGroupId))
    const year = courseYears.find((r) => num(r.fk_course_year_id) === Number(courseYearId))
    return [
      txt(college?.college_code),
      txt(course?.course_code),
      txt(group?.group_code),
      txt(year?.course_year_code ?? year?.course_year_name),
    ]
      .filter(Boolean)
      .join(' / ')
  }, [colleges, courses, courseGroups, courseYears, collegeId, courseId, courseGroupId, courseYearId])

  const statusGroups = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    const filtered = q
      ? rows.filter((r) => txt(r.hallticket_number).toLowerCase().includes(q))
      : rows
    return STATUS_ORDER.map((status) => ({
      status,
      items: filtered.filter((r) => txt(r.ResultStatus ?? r.result_status) === status),
    })).filter((g) => g.items.length > 0)
  }, [rows, searchText])

  async function onGetReport() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getExamFinalAnalysisReport({
        flag: isReevaluation ? 'final_reeval_results_list' : 'final_results_list',
        examId: Number(examId),
        examTypeCatDetId: Number(examTypeId || 0),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
      })
      setRows(Array.isArray(list) ? list : [])
      if (!list?.length) toast.info('No Records Found.')
    } catch (e) {
      toastError(e, 'Failed to load report')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const showResults = hasFetched && rows.length > 0

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-semibold text-foreground">Exam Result Sheets</h1>
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
              <Label>Exam *</Label>
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
              <Label>Course Year *</Label>
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
            <div className="flex h-8 items-center gap-2 md:col-span-2">
              <Checkbox
                id="result-sheets-reeval"
                checked={isReevaluation}
                onCheckedChange={(v) => setIsReevaluation(v === true)}
              />
              <Label htmlFor="result-sheets-reeval" className="cursor-pointer font-normal">
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
                  setSearchText('')
                  setIsReevaluation(false)
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {showResults ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Exam Result Sheets</p>
                {filterSummary ? (
                  <p className="text-xs font-medium text-primary">{filterSummary}</p>
                ) : null}
              </div>
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search"
                className="h-9 w-full max-w-[220px] text-[12px]"
              />
              <Button type="button" size="sm" className="h-9 text-[12px]" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Report
              </Button>
            </div>
            <div className="space-y-4 p-4">
              {statusGroups.map((group) => (
                <section key={group.status} className="overflow-hidden rounded-md border border-border">
                  <div className="bg-sky-100 px-3 py-2 text-center text-sm font-semibold text-slate-800">
                    {group.status} ({group.items.length})
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-white px-3 py-3 sm:grid-cols-3 md:grid-cols-4">
                    {group.items.map((r, idx) => (
                      <div
                        key={`${group.status}-${txt(r.hallticket_number)}-${idx}`}
                        className="text-center text-[12px] tabular-nums text-slate-800"
                      >
                        {txt(r.hallticket_number) || '—'}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {statusGroups.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No matching hall tickets</p>
              ) : null}
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
