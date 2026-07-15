'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getInvigilatorsRemunerationReport,
} from '@/services'
import { toastError, toastInfo } from '@/lib/toast'
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { printInvigilatorsRemunerationReport } from '../_components/printInvigilatorsRemunerationReport'

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

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`
  const link = document.createElement('a')
  link.download = filename
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`
  link.click()
}

export default function InvigilatorsRemunerationReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [filterSummary, setFilterSummary] = useState('')
  const [collegeName, setCollegeName] = useState('')
  const [searchText, setSearchText] = useState('')

  const courses = useMemo(() => dedupeBy(baseRows, ['fk_course_id', 'courseId']), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        ['fk_academic_year_id', 'academicYearId'],
      ).sort(
        (a, b) =>
          Number(strFrom(b, ['academic_year', 'academicYear'])) -
          Number(strFrom(a, ['academic_year', 'academicYear'])),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            numFrom(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        ['fk_exam_id', 'examId'],
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, ['fk_college_id', 'collegeId']).sort(
        (a, b) =>
          Number(a.clg_sort_order ?? a.sort_order ?? 0) - Number(b.clg_sort_order ?? b.sort_order ?? 0),
      ),
    [restRows],
  )

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      columns.some((col) => String(r[col] ?? '').toLowerCase().includes(q)),
    )
  }, [rows, columns, searchText])

  function clearResults() {
    setRows([])
    setColumns([])
    setFilterSummary('')
    setCollegeName('')
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const list = await getGradeMemoIssueFilters(employeeId)
        if (cancelled) return
        setBaseRows(list)
        const firstCourse = dedupeBy(list, ['fk_course_id', 'courseId'])[0]
        setSkipAutoSelect(false)
        setCourseId(firstCourse ? numFrom(firstCourse, ['fk_course_id', 'courseId']) : null)
      } catch {
        if (!cancelled) toastError('Failed to load filters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  useEffect(() => {
    if (!courseId) {
      setAcademicYearId(null)
      return
    }
    if (skipAutoSelect) return
    const years = dedupeBy(
      baseRows.filter((r) => numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId)),
      ['fk_academic_year_id', 'academicYearId'],
    ).sort(
      (a, b) =>
        Number(strFrom(b, ['academic_year', 'academicYear'])) -
        Number(strFrom(a, ['academic_year', 'academicYear'])),
    )
    setAcademicYearId(years[0] ? numFrom(years[0], ['fk_academic_year_id', 'academicYearId']) : null)
  }, [courseId, baseRows, skipAutoSelect])

  useEffect(() => {
    if (!courseId || !academicYearId) {
      setExamId(null)
      return
    }
    if (skipAutoSelect) return
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
          numFrom(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
      ),
      ['fk_exam_id', 'examId'],
    )
    setExamId(list[0] ? numFrom(list[0], ['fk_exam_id', 'examId']) : null)
  }, [courseId, academicYearId, baseRows, skipAutoSelect])

  useEffect(() => {
    let cancelled = false
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([])
        setCollegeId(null)
        return
      }
      setLoading(true)
      try {
        const rest = await getGradeMemoIssueRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        })
        if (cancelled) return
        setRestRows(rest)
        if (skipAutoSelect) {
          setCollegeId(null)
          return
        }
        const nextColleges = dedupeBy(rest, ['fk_college_id', 'collegeId']).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? a.sort_order ?? 0) -
            Number(b.clg_sort_order ?? b.sort_order ?? 0),
        )
        setCollegeId(
          nextColleges[0] ? numFrom(nextColleges[0], ['fk_college_id', 'collegeId']) : null,
        )
      } catch {
        if (!cancelled) toastError('Failed to load college filters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadRest()
    return () => {
      cancelled = true
    }
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect])

  async function handleGetReport() {
    if (!courseId || !academicYearId || !examId || !collegeId) {
      toastError('Please select Course, Exam Year, Exam, and College')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const list = await getInvigilatorsRemunerationReport({ examId })
      if (list.length === 0) {
        toastInfo('No records found')
        return
      }
      const nextColumns = Object.keys(list[0] ?? {})
      setRows(list)
      setColumns(nextColumns)

      const college = colleges.find((r) => numFrom(r, ['fk_college_id', 'collegeId']) === collegeId)
      const courseCode = strFrom(
        courses.find((r) => numFrom(r, ['fk_course_id', 'courseId']) === courseId) ?? {},
        ['course_code', 'courseCode'],
      )
      const examName = strFrom(
        exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === examId) ?? {},
        ['exam_name', 'examName'],
      )
      const collegeCode = strFrom(college ?? {}, ['college_code', 'collegeCode'])
      setCollegeName(strFrom(college ?? {}, ['college_name', 'collegeName']))
      setFilterSummary([collegeCode, courseCode, examName].filter(Boolean).join(' / '))
    } catch {
      toastError('Failed to load invigilator remuneration report')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSkipAutoSelect(true)
    clearResults()
    setSearchText('')
    setCourseId(null)
    setAcademicYearId(null)
    setExamId(null)
    setCollegeId(null)
    setRestRows([])
  }

  function handleExport() {
    if (filteredRows.length === 0) return
    const headerCells = ['<th>S.No</th>', ...columns.map((col) => `<th>${col}</th>`)].join('')
    const body = filteredRows
      .map((row, i) => {
        const cells = columns.map((col) => `<td>${row[col] ?? ''}</td>`).join('')
        return `<tr><td>${i + 1}</td>${cells}</tr>`
      })
      .join('')
    exportHtmlTable(
      'Invigilator Remuneration Report.xls',
      `<caption>Invigilator Remuneration Report${filterSummary ? ` - ${filterSummary}` : ''}</caption><thead><tr>${headerCells}</tr></thead>`,
      `<tbody>${body}</tbody>`,
    )
  }

  function handlePrint() {
    if (filteredRows.length === 0) return
    printInvigilatorsRemunerationReport(filteredRows, {
      title: 'Invigilator Remuneration Report',
      collegeName,
      filterSummary,
      columns,
    })
  }

  return (
    <FilteredPage
      title="Invigilator Remuneration Report"
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow>
            <GlobalFilterField
              label="Course"
              icon={GraduationCap}
              className="!flex-[0_1_7.5rem] !max-w-[8.5rem] !min-w-[6.5rem]"
            >
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setCourseId(v ? Number(v) : null)
                }}
                options={courses.map((r) => ({
                  value: String(numFrom(r, ['fk_course_id', 'courseId'])),
                  label: strFrom(r, ['course_code', 'courseCode', 'course_name']),
                }))}
                placeholder="Course"
                searchable
                isLoading={loading && baseRows.length === 0}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Year"
              icon={CalendarDays}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setAcademicYearId(v ? Number(v) : null)
                }}
                options={academicYears.map((r) => ({
                  value: String(numFrom(r, ['fk_academic_year_id', 'academicYearId'])),
                  label: strFrom(r, ['academic_year', 'academicYear']),
                }))}
                placeholder="Exam Year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Exam Master"
              icon={ClipboardList}
              className="!flex-[1_1_22rem] !min-w-[16rem]"
            >
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setExamId(v ? Number(v) : null)
                }}
                options={exams.map((r) => ({
                  value: String(numFrom(r, ['fk_exam_id', 'examId'])),
                  label: strFrom(r, ['exam_name', 'examName']),
                }))}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="College"
              icon={Building2}
              className="!flex-[0_1_7.5rem] !max-w-[8.5rem] !min-w-[6.5rem]"
            >
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setCollegeId(v ? Number(v) : null)
                }}
                options={colleges.map((r) => ({
                  value: String(numFrom(r, ['fk_college_id', 'collegeId'])),
                  label: strFrom(r, ['college_code', 'collegeCode', 'college_name']),
                }))}
                placeholder="College"
                searchable
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Get Report'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 gap-1.5 text-[12px]"
                onClick={handleReset}
                title="Reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </GlobalFilterBarRow>
        </div>
      }
      body={
        rows.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Invigilator Remuneration Report</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={handleExport}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={handlePrint}
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Report
                </Button>
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search"
                  className="h-8 w-48 text-[12px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 font-semibold">S.No</th>
                    {columns.map((col) => (
                      <th key={col} className="px-2 py-2 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      {columns.map((col) => (
                        <td key={col} className="px-2 py-1.5 whitespace-nowrap">
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      }
    />
  )
}
