'use client'

/**
 * Shared final analysis report UI — Angular exam result sheets, gradewise,
 * final result analysis, and group-subjectwise reports.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { format, parseISO } from 'date-fns'
import { ChevronDown, Filter, Printer, RefreshCw } from 'lucide-react'
import { FilteredListPage, PageContainer } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { DataTableToolbar } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import {
  getExamFinalAnalysisReport,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  type AnyRow,
} from '@/services'

type Row = AnyRow
export type ExamFinalAnalysisKind = 'result-sheets' | 'gradewise' | 'final-analysis' | 'group-subjectwise'

const TITLES: Record<ExamFinalAnalysisKind, string> = {
  'result-sheets': 'Exam Result Sheets',
  gradewise: 'Gradewise Result Report',
  'final-analysis': 'Final Result Analysis Report',
  'group-subjectwise': 'Group & Subject Wise Result Report',
}

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

function dash(v: unknown): string {
  const s = txt(v)
  return !s || s === 'null' ? '—' : s
}

function headerLabel(key: string): string {
  if (key === 'Pass_percentage' || key === 'Passed_percent') return 'Pass %'
  return key.replace(/_/g, ' ')
}

function flagForKind(kind: ExamFinalAnalysisKind, isReevaluation: boolean): Parameters<typeof getExamFinalAnalysisReport>[0]['flag'] {
  switch (kind) {
    case 'result-sheets':
      return isReevaluation ? 'final_reeval_results_list' : 'final_results_list'
    case 'gradewise':
      return 'final_group_subject_grade_results'
    case 'final-analysis':
      return 'final_result_analysis'
    case 'group-subjectwise':
      return 'final_group_subject_wise_results'
  }
}

function buildGradewiseCols(firstRow: Row): ColDef<Row>[] {
  const keys = Object.keys(firstRow)
  keys.splice(0, 2)
  return [
    { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
    ...keys.map(
      (key): ColDef<Row> => ({
        headerName: headerLabel(key),
        minWidth: 110,
        flex: 1,
        valueGetter: (p) => dash(p.data?.[key]),
      }),
    ),
  ]
}

const resultSheetsCols: ColDef<Row>[] = [
  { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { headerName: 'Hall Ticket', minWidth: 120, flex: 0, valueGetter: (p) => dash(p.data?.hallticket_number ?? p.data?.hallticket_no) },
  { headerName: 'Result Status', minWidth: 120, flex: 0, valueGetter: (p) => dash(p.data?.ResultStatus ?? p.data?.result_status) },
  { headerName: 'College', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.college_code) },
  { headerName: 'Group Code', minWidth: 110, flex: 0, valueGetter: (p) => dash(p.data?.group_code ?? p.data?.course_group) },
  {
    headerName: 'Course Year',
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => dash(p.data?.course_year_name ?? p.data?.course_year_code),
  },
  { headerName: 'Student Name', minWidth: 180, flex: 1, valueGetter: (p) => dash(p.data?.student_name ?? p.data?.StudentName) },
  { headerName: 'Exam', minWidth: 160, flex: 1, valueGetter: (p) => dash(p.data?.exam_label_name ?? p.data?.exam_name) },
]

const groupSubjectwiseCols: ColDef<Row>[] = [
  { headerName: 'S.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
  { headerName: 'Course Group', minWidth: 120, flex: 0, valueGetter: (p) => dash(p.data?.course_group) },
  { headerName: 'Subject', minWidth: 200, flex: 1, valueGetter: (p) => dash(p.data?.SUBJECT ?? p.data?.subject_name ?? p.data?.subject) },
  { headerName: 'Registered', minWidth: 100, flex: 0, valueGetter: (p) => dash(p.data?.registered) },
  { headerName: 'Appeared', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.Appeared ?? p.data?.appeared) },
  { headerName: 'Passed', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.Passed ?? p.data?.passed) },
  { headerName: 'Failed', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.failed) },
  { headerName: 'Pass %', minWidth: 90, flex: 0, valueGetter: (p) => dash(p.data?.Pass_percentage ?? p.data?.Passed_percent) },
]

export function ExamFinalAnalysisReportPage({ kind }: { kind: ExamFinalAnalysisKind }) {
  const title = TITLES[kind]
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [baseRows, setBaseRows] = useState<Row[]>([])
  const [restRows, setRestRows] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [courseId, setCourseId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [examId, setExamId] = useState('')
  const [examTypeId, setExamTypeId] = useState('0')
  const [collegeId, setCollegeId] = useState('')
  const [courseGroupId, setCourseGroupId] = useState('')
  const [courseYearId, setCourseYearId] = useState('')
  const [isReevaluation, setIsReevaluation] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

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

  async function onGetList() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info('Please Select Valid Filters')
      return
    }
    setLoading(true)
    setHasFetched(true)
    try {
      const list = await getExamFinalAnalysisReport({
        flag: flagForKind(kind, isReevaluation),
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

  // Final analysis uses an HTML table (not AG Grid), so these defs are for other kinds only.
  const columnDefs = useMemo<ColDef<Row>[]>(() => {
    if (kind === 'final-analysis') return []
    if (kind === 'gradewise' && rows.length > 0) return buildGradewiseCols(rows[0])
    if (kind === 'result-sheets') return resultSheetsCols
    return groupSubjectwiseCols
  }, [kind, rows])

  const filteredFinalRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.course_name, r.course_group, r.course_year, r.Appeared, r.appeared, r.passed, r.Promoted, r.Detained]
        .map((v) => String(v ?? '').toLowerCase())
        .some((v) => v.includes(q)),
    )
  }, [rows, searchText])

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.hallticket_number)}-${txt(p.data?.SUBJECT)}-${txt(p.data?.course_group)}`,
    [],
  )

  const filterFields = (
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
        <Label>Exam Type</Label>
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
      {kind === 'result-sheets' ? (
        <div className="flex items-center gap-2 pb-1 md:col-span-2">
          <Checkbox
            id="is-reevaluation"
            checked={isReevaluation}
            onCheckedChange={(v) => setIsReevaluation(v === true)}
          />
          <Label htmlFor="is-reevaluation" className="cursor-pointer font-normal">
            Is Re-Evaluation
          </Label>
        </div>
      ) : null}
      <div className="flex items-end gap-2 md:col-span-2">
        <Button type="button" className="h-8 text-[12px]" onClick={() => void onGetList()} disabled={loading}>
          {kind === 'final-analysis' ? 'Get Report' : 'Get List'}
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
            setIsReevaluation(false)
            setSearchText('')
            const c = courses[0]
            if (c) setCourseId(String(num(c.fk_course_id)))
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  if (kind === 'final-analysis') {
    const th = 'border border-slate-300 bg-slate-100 px-2 py-2 text-center text-[12px] font-semibold text-slate-800'
    const thSub = 'border border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-[12px] font-medium text-slate-700'
    const td = 'border border-slate-200 px-2 py-2 text-[13px] text-slate-800'
    const tdNum = `${td} text-center tabular-nums`

    return (
      <PageContainer className="space-y-4">
        {/* Same shell as FilteredListPage / DataTable — title + collapsible filters + toolbar */}
        <div className="app-data-table app-data-table-card flex flex-col">
          <div className={cn('app-data-table-heading px-5', filtersOpen ? 'pt-5 pb-0' : 'pt-5 pb-3')}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-label="Toggle filters"
            >
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" aria-hidden />
                <ChevronDown
                  className={cn('h-3.5 w-3.5 transition-transform duration-300', filtersOpen && 'rotate-180')}
                  aria-hidden
                />
              </span>
            </button>
          </div>

          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-in-out',
              filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="global-filter-bar__inner px-5 pb-1 [&_.global-filter-bar__inner]:!pt-0">
                {filterFields}
              </div>
            </div>
          </div>

          {hasFetched ? (
            <>
              <div className="app-data-table-toolbar-wrap bg-card px-5 pb-3 pt-2">
                <DataTableToolbar
                  searchEnabled
                  searchQuery={searchText}
                  onSearchChange={setSearchText}
                  searchPlaceholder="Search…"
                  rowCount={filteredFinalRows.length}
                  columnPickerEnabled={false}
                  exportExcelEnabled={false}
                  exportPdfEnabled={false}
                  onExportExcel={() => {}}
                  onExportPdf={() => {}}
                  lockColumnIds={[]}
                  getColumns={() => null}
                  applyColumnVisible={() => {}}
                  endActions={
                    <Button type="button" size="sm" className="h-9 text-[12px]" onClick={() => window.print()}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Print Report
                    </Button>
                  }
                />
              </div>

              <div className="overflow-x-auto px-5 pb-5">
                {loading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
                ) : filteredFinalRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No Records Found.</p>
                ) : (
                  <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                      <tr>
                        <th rowSpan={2} className={th}>
                          SL.No
                        </th>
                        <th rowSpan={2} className={th}>
                          Course
                        </th>
                        <th rowSpan={2} className={th}>
                          Course Group
                        </th>
                        <th rowSpan={2} className={th}>
                          Course Year
                        </th>
                        <th colSpan={1} className={th}>
                          Appeared
                        </th>
                        <th colSpan={2} className={th}>
                          Passed
                        </th>
                        <th colSpan={2} className={th}>
                          Promoted
                        </th>
                        <th colSpan={2} className={th}>
                          Detained
                        </th>
                      </tr>
                      <tr>
                        <th className={thSub}>Count</th>
                        <th className={thSub}>Count</th>
                        <th className={thSub}>%</th>
                        <th className={thSub}>Count</th>
                        <th className={thSub}>%</th>
                        <th className={thSub}>Count</th>
                        <th className={thSub}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFinalRows.map((r, i) => (
                        <tr key={`fa-${i}-${txt(r.course_group)}-${txt(r.course_year)}`}>
                          <td className={tdNum}>{i + 1}</td>
                          <td className={td}>{dash(r.course_name)}</td>
                          <td className={`${td} text-center`}>{dash(r.course_group)}</td>
                          <td className={td}>{dash(r.course_year)}</td>
                          <td className={tdNum}>{dash(r.Appeared ?? r.appeared)}</td>
                          <td className={tdNum}>{dash(r.passed)}</td>
                          <td className={tdNum}>{dash(r.Pass_percentage ?? r.Passed_percent)}</td>
                          <td className={tdNum}>{dash(r.Promoted)}</td>
                          <td className={tdNum}>{dash(r.Promoted_Percentage)}</td>
                          <td className={tdNum}>{dash(r.Detained)}</td>
                          <td className={tdNum}>{dash(r.Detained_Percentage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      </PageContainer>
    )
  }

  return (
    <FilteredListPage
      title={title}
      filters={filterFields}
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      getRowId={getRowId}
      toolbar={{ search: true, searchPlaceholder: 'Search…', exportPdf: false }}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <Button type="button" size="sm" className="h-9 text-[12px]" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : undefined
      }
    />
  )
}
