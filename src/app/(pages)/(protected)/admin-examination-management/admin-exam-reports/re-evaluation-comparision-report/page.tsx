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
  getReEvaluationComparisionReport,
} from '@/services'
import { toastError, toastInfo } from '@/lib/toast'
import {
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
} from 'lucide-react'
import { printReEvaluationComparisionReport } from '../_components/printReEvaluationComparisionReport'

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

export default function ReEvaluationComparisionReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number>(0)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [examLabel, setExamLabel] = useState('')
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
  const courseYears = useMemo(
    () =>
      dedupeBy(restRows, ['fk_course_year_id', 'courseYearId']).sort(
        (a, b) =>
          Number(a.year_order ?? a.cy_sort_order ?? 0) - Number(b.year_order ?? b.cy_sort_order ?? 0),
      ),
    [restRows],
  )

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const code = strFrom(r, ['Subject_Code', 'subject_code']).toLowerCase()
      const name = strFrom(r, ['Subject_Name', 'subject_name']).toLowerCase()
      return code.includes(q) || name.includes(q)
    })
  }, [rows, searchText])

  function clearResults() {
    setRows([])
    setExamLabel('')
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
        setCourseYearId(0)
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
          setCourseYearId(0)
          return
        }
        const years = dedupeBy(rest, ['fk_course_year_id', 'courseYearId']).sort(
          (a, b) =>
            Number(a.year_order ?? a.cy_sort_order ?? 0) -
            Number(b.year_order ?? b.cy_sort_order ?? 0),
        )
        setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
      } catch {
        if (!cancelled) toastError('Failed to load course year filters')
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
    if (!courseId || !examId) {
      toastError('Please select Course and Exam')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const data = await getReEvaluationComparisionReport({
        examId,
        courseYearId: courseYearId || 0,
      })
      if (data.length === 0) {
        toastInfo('No records found')
        return
      }
      setExamLabel(
        strFrom(
          exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === Number(examId)) ?? {},
          ['exam_name', 'examName'],
        ),
      )
      setRows(data)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setSkipAutoSelect(true)
    setCourseId(null)
    setAcademicYearId(null)
    setExamId(null)
    setCourseYearId(0)
    setRestRows([])
    setSearchText('')
    clearResults()
  }

  function handleExportExcel() {
    if (filteredRows.length === 0) return
    const head = `<tr>
      <th colspan="5"></th>
      <th colspan="2">Result Before RV</th>
      <th colspan="2"></th>
      <th colspan="2">After RV</th>
    </tr>
    <tr>
      <th>S.No</th><th>Subject Code</th><th>Subject Name</th><th>Registered</th><th>Appeared</th>
      <th>Passed</th><th>Pass %</th>
      <th>No.of Students Applied RV</th><th>No.of Students Benefited</th>
      <th>Passed</th><th>Pass %</th>
    </tr>`
    const body = filteredRows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${strFrom(r, ['Subject_Code', 'subject_code'])}</td>
        <td>${strFrom(r, ['Subject_Name', 'subject_name'])}</td>
        <td>${strFrom(r, ['Total_Registered', 'total_registered'])}</td>
        <td>${strFrom(r, ['Total_Appeared', 'total_appeared'])}</td>
        <td>${strFrom(r, ['Pass_Before_RV', 'pass_before_rv'])}</td>
        <td>${strFrom(r, ['Before_RV', 'before_rv'])}</td>
        <td>${strFrom(r, ['Students_Applied_RV', 'students_applied_rv'])}</td>
        <td>${strFrom(r, ['Students_Benefitted', 'students_benefitted'])}</td>
        <td>${strFrom(r, ['Pass_After_RV', 'pass_after_rv'])}</td>
        <td>${strFrom(r, ['Final_Pass', 'final_pass'])}</td>
      </tr>`,
      )
      .join('')
    const title = `<tr><th colspan="11" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Re-Evaluation Comparision Result Report</th></tr>`
    exportHtmlTable('Re-Evaluation Comparision Result Report.xls', title, `${head}${body}`)
  }

  function handlePrint() {
    if (filteredRows.length === 0) return
    const course = courses.find((r) => numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId))
    printReEvaluationComparisionReport(filteredRows, {
      title: 'Re-Evaluation Comparision Result Report',
      examLabel,
      universityName: strFrom(course ?? {}, ['university_name', 'universityName']),
    })
  }

  return (
    <FilteredPage
      title="Re-Evaluation Comparision Result Report"
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
              label="Exam"
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
                placeholder="Exam"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Year"
              icon={Layers}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
                  clearResults()
                  setCourseYearId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...courseYears.map((r) => ({
                    value: String(numFrom(r, ['fk_course_year_id', 'courseYearId'])),
                    label: strFrom(r, ['course_year_code', 'courseYearCode', 'course_year_name']),
                  })),
                ]}
                placeholder="Course Year"
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
              <p className="font-semibold text-foreground">Re-Evaluation Comparision Result Report</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={handleExportExcel}
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
                    <th className="px-2 py-2" colSpan={5} />
                    <th className="px-2 py-2 text-center font-semibold" colSpan={2}>
                      Result Before RV
                    </th>
                    <th className="px-2 py-2" colSpan={2} />
                    <th className="px-2 py-2 text-center font-semibold" colSpan={2}>
                      After RV
                    </th>
                  </tr>
                  <tr>
                    <th className="px-2 py-2 font-semibold">S.No</th>
                    <th className="px-2 py-2 font-semibold">Subject Code</th>
                    <th className="px-2 py-2 font-semibold">Subject Name</th>
                    <th className="px-2 py-2 font-semibold">Registered</th>
                    <th className="px-2 py-2 font-semibold">Appeared</th>
                    <th className="px-2 py-2 font-semibold">Passed</th>
                    <th className="px-2 py-2 font-semibold">Pass %</th>
                    <th className="px-2 py-2 font-semibold">No.of Students Applied RV</th>
                    <th className="px-2 py-2 font-semibold">No.of Students Benefited</th>
                    <th className="px-2 py-2 font-semibold">Passed</th>
                    <th className="px-2 py-2 font-semibold">Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr
                      key={`${strFrom(r, ['Subject_Code', 'subject_code'])}-${i}`}
                      className="border-t"
                    >
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{strFrom(r, ['Subject_Code', 'subject_code'])}</td>
                      <td className="px-2 py-1.5">{strFrom(r, ['Subject_Name', 'subject_name'])}</td>
                      <td className="px-2 py-1.5 text-center">
                        {strFrom(r, ['Total_Registered', 'total_registered'])}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {strFrom(r, ['Total_Appeared', 'total_appeared'])}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {strFrom(r, ['Pass_Before_RV', 'pass_before_rv'])}
                      </td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['Before_RV', 'before_rv'])}</td>
                      <td className="px-2 py-1.5 text-center">
                        {strFrom(r, ['Students_Applied_RV', 'students_applied_rv'])}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {strFrom(r, ['Students_Benefitted', 'students_benefitted'])}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {strFrom(r, ['Pass_After_RV', 'pass_after_rv'])}
                      </td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['Final_Pass', 'final_pass'])}</td>
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
