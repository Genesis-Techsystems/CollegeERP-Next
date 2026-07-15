'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getGeneralDetails,
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getReEvaluationExamReport,
} from '@/services'
import { GM_CODES } from '@/config/constants/ui'
import { toastError, toastInfo } from '@/lib/toast'
import {
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  Tags,
} from 'lucide-react'
import { printReEvaluationExamReport } from '../_components/printReEvaluationExamReport'

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

export default function ReEvaluationExamReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examTypeCatdetId, setExamTypeCatdetId] = useState<number>(0)
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
      const ht = strFrom(r, ['hallticket_number', 'hall_ticketno']).toLowerCase()
      const sub = strFrom(r, ['subject_name', 'subjectName']).toLowerCase()
      const group = strFrom(r, ['group_code', 'groupCode']).toLowerCase()
      return ht.includes(q) || sub.includes(q) || group.includes(q)
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
    async function loadRestAndTypes() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([])
        setExamFeeTypes([])
        setCourseYearId(0)
        setExamTypeCatdetId(0)
        return
      }
      setLoading(true)
      try {
        const [rest, feeTypes] = await Promise.all([
          getGradeMemoIssueRestFilters({ courseId, academicYearId, examId, employeeId }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ])
        if (cancelled) return
        setRestRows(rest)

        const examRow = exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === Number(examId))
        const allowed: AnyRow[] = []
        for (const ft of feeTypes) {
          const code = strFrom(ft, ['generalDetailCode', 'general_detail_code'])
          if (examRow?.is_regular_exam && code === 'Regular') allowed.push(ft)
          if (examRow?.is_supply_exam && code === 'Supple') allowed.push(ft)
          if (examRow?.is_internal_exam && code === 'Internal') allowed.push(ft)
        }
        setExamFeeTypes(allowed)

        if (skipAutoSelect) {
          setExamTypeCatdetId(0)
          setCourseYearId(0)
          return
        }

        setExamTypeCatdetId(
          allowed[0] ? numFrom(allowed[0], ['generalDetailId', 'general_detail_id']) : 0,
        )

        const years = dedupeBy(rest, ['fk_course_year_id', 'courseYearId']).sort(
          (a, b) =>
            Number(a.year_order ?? a.cy_sort_order ?? 0) -
            Number(b.year_order ?? b.cy_sort_order ?? 0),
        )
        setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
      } catch {
        if (!cancelled) toastError('Failed to load filters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadRestAndTypes()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect])

  async function handleGetReport() {
    if (!courseId || !examId) {
      toastError('Please select Course and Exam')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const data = await getReEvaluationExamReport({
        examId,
        examTypeCatdetId: examTypeCatdetId || 0,
        courseId,
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
    setExamTypeCatdetId(0)
    setCourseYearId(0)
    setRestRows([])
    setExamFeeTypes([])
    setSearchText('')
    clearResults()
  }

  function handleExportExcel() {
    if (filteredRows.length === 0) return
    const head = `<tr>
      <th>S.No</th><th>Hall Ticket No.</th><th>Course Year</th><th>Subject</th>
      <th>CIE</th><th>SEE</th><th>RV1</th><th>RV2</th><th>RV3</th>
      <th>Average of RV1,RV2,RV3</th><th>Moderation Marks</th><th>Final Marks</th>
      <th>Total Marks</th><th>Original Grade</th><th>Final Grade</th>
      <th>Marks Result</th><th>Grade Result</th><th>Branch</th>
    </tr>`
    const body = filteredRows
      .map(
        (r, i) => `<tr>
        <td>${i + 1}</td>
        <td>${strFrom(r, ['hallticket_number', 'hall_ticketno'])}</td>
        <td>${strFrom(r, ['course_year_code', 'courseYearCode'])}</td>
        <td>${strFrom(r, ['subject_name', 'subjectName'])}</td>
        <td>${strFrom(r, ['cie'])}</td>
        <td>${strFrom(r, ['see'])}</td>
        <td>${strFrom(r, ['rv1'])}</td>
        <td>${strFrom(r, ['rv2'])}</td>
        <td>${strFrom(r, ['rv3'])}</td>
        <td>${strFrom(r, ['avg_marks'])}</td>
        <td>${strFrom(r, ['moderation_marks'])}</td>
        <td>${strFrom(r, ['final_marks'])}</td>
        <td>${strFrom(r, ['final_total_marks'])}</td>
        <td>${strFrom(r, ['grade_old'])}</td>
        <td>${strFrom(r, ['grade'])}</td>
        <td>${strFrom(r, ['Result', 'result'])}</td>
        <td>${strFrom(r, ['Grade_Result', 'grade_result'])}</td>
        <td>${strFrom(r, ['group_code', 'groupCode'])}</td>
      </tr>`,
      )
      .join('')
    const title = `<tr><th colspan="18" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Re-Evaluation Exam Report</th></tr>`
    exportHtmlTable('Re-Evaluation Exam Report.xls', title, `${head}${body}`)
  }

  function handlePrint() {
    if (filteredRows.length === 0) return
    const course = courses.find((r) => numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId))
    printReEvaluationExamReport(filteredRows, {
      title: 'Re-Evaluation Exam Report',
      examLabel,
      universityName: strFrom(course ?? {}, ['university_name', 'universityName']),
    })
  }

  return (
    <FilteredPage
      title="Re-Evaluation Exam Report"
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
            <GlobalFilterField label="Exam" icon={ClipboardList} className="!flex-[1_1_22rem] !min-w-[16rem]">
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
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField label="Exam Type" icon={Tags}>
              <Select
                value={String(examTypeCatdetId)}
                onChange={(v) => {
                  clearResults()
                  setExamTypeCatdetId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...examFeeTypes.map((r) => ({
                    value: String(numFrom(r, ['generalDetailId', 'general_detail_id'])),
                    label: strFrom(r, ['generalDetailCode', 'general_detail_code']),
                  })),
                ]}
                placeholder="Exam Type"
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Year" icon={Layers}>
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
              <p className="font-semibold text-foreground">Re-Evaluation Exam Report</p>
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
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 font-semibold">S.No</th>
                    <th className="px-2 py-2 font-semibold">Hall Ticket No.</th>
                    <th className="px-2 py-2 font-semibold">Course Year</th>
                    <th className="px-2 py-2 font-semibold">Subject</th>
                    <th className="px-2 py-2 font-semibold">CIE</th>
                    <th className="px-2 py-2 font-semibold">SEE</th>
                    <th className="px-2 py-2 font-semibold">RV1</th>
                    <th className="px-2 py-2 font-semibold">RV2</th>
                    <th className="px-2 py-2 font-semibold">RV3</th>
                    <th className="px-2 py-2 font-semibold">Average of RV1,RV2,RV3</th>
                    <th className="px-2 py-2 font-semibold">Moderation Marks</th>
                    <th className="px-2 py-2 font-semibold">Final Marks</th>
                    <th className="px-2 py-2 font-semibold">Total Marks</th>
                    <th className="px-2 py-2 font-semibold">Original Grade</th>
                    <th className="px-2 py-2 font-semibold">Final Grade</th>
                    <th className="px-2 py-2 font-semibold">Marks Result</th>
                    <th className="px-2 py-2 font-semibold">Grade Result</th>
                    <th className="px-2 py-2 font-semibold">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr
                      key={`${strFrom(r, ['hallticket_number'])}-${strFrom(r, ['subject_name'])}-${i}`}
                      className="border-t"
                    >
                      <td className="px-2 py-1.5 text-center">{i + 1}</td>
                      <td className="px-2 py-1.5">{strFrom(r, ['hallticket_number', 'hall_ticketno'])}</td>
                      <td className="px-2 py-1.5">{strFrom(r, ['course_year_code', 'courseYearCode'])}</td>
                      <td className="px-2 py-1.5">{strFrom(r, ['subject_name', 'subjectName'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['cie'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['see'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['rv1'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['rv2'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['rv3'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['avg_marks'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['moderation_marks'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['final_marks'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['final_total_marks'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['grade_old'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['grade'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['Result', 'result'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['Grade_Result', 'grade_result'])}</td>
                      <td className="px-2 py-1.5 text-center">{strFrom(r, ['group_code', 'groupCode'])}</td>
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
