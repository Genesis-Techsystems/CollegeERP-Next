'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getStudentWiseGradePointReport,
} from '@/services'
import { toastError, toastInfo } from '@/lib/toast'
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  School,
} from 'lucide-react'
import { printStudentWiseGradePointReport } from '../_components/printStudentWiseGradePointReport'

type AnyRow = Record<string, any>
type StudentSubjectRows = AnyRow[]

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

function groupByHallTicket(flatRows: AnyRow[]): StudentSubjectRows[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const r of flatRows) {
    const key = strFrom(r, ['hallticket_number', 'hall_ticketno'])
    if (!key || seen.has(key)) continue
    seen.add(key)
    order.push(key)
  }
  return order.map((ht) =>
    flatRows.filter((r) => strFrom(r, ['hallticket_number', 'hall_ticketno']) === ht),
  )
}

function uniqueSubjectCodes(flatRows: AnyRow[]): { subject_code: string }[] {
  const codes: string[] = []
  for (const r of flatRows) {
    const code = strFrom(r, ['subject_code'])
    if (code && !codes.includes(code)) codes.push(code)
  }
  return codes.map((subject_code) => ({ subject_code }))
}

function findMarks(list: AnyRow[], subjectCode: string, field: string): string {
  const item = list.find((x) => strFrom(x, ['subject_code']) === subjectCode)
  if (!item) return ' '
  const v = item[field]
  return v == null || String(v).trim() === '' ? ' ' : String(v)
}

export default function StudentWiseGradePointReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [hallTicketNo, setHallTicketNo] = useState('')
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [mainList, setMainList] = useState<StudentSubjectRows[]>([])
  const [subjectCodes, setSubjectCodes] = useState<{ subject_code: string }[]>([])
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
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['fk_course_group_id', 'courseGroupId'],
      ),
    [restRows, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0)),
    [restRows, collegeId, courseGroupId],
  )

  const filteredList = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return mainList
    return mainList.filter((list) => {
      const ht = strFrom(list[0] ?? {}, ['hallticket_number', 'hall_ticketno']).toLowerCase()
      return ht.includes(q)
    })
  }, [mainList, searchText])

  function clearResults() {
    setMainList([])
    setSubjectCodes([])
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const rows = await getGradeMemoIssueFilters(employeeId)
        if (cancelled) return
        setBaseRows(rows)
        const firstCourse = dedupeBy(rows, ['fk_course_id', 'courseId'])[0]
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
        setCourseGroupId(null)
        setCourseYearId(null)
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
          setCourseGroupId(null)
          setCourseYearId(null)
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

  useEffect(() => {
    if (!collegeId) {
      setCourseGroupId(null)
      setCourseYearId(null)
      return
    }
    if (skipAutoSelect) return
    const groups = dedupeBy(
      restRows.filter((r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
      ['fk_course_group_id', 'courseGroupId'],
    )
    const nextGroupId = groups[0] ? numFrom(groups[0], ['fk_course_group_id', 'courseGroupId']) : null
    setCourseGroupId(nextGroupId)
  }, [collegeId, restRows, skipAutoSelect])

  useEffect(() => {
    if (!collegeId || !courseGroupId) {
      setCourseYearId(null)
      return
    }
    if (skipAutoSelect) return
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
          numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
      ),
      ['fk_course_year_id', 'courseYearId'],
    ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0))
    setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : null)
  }, [courseGroupId, collegeId, restRows, skipAutoSelect])

  async function handleGetReport() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toastError('Please select Course, Exam, College, Group, and Year')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const flatRows = await getStudentWiseGradePointReport({
        examId,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        hallTicketNo: hallTicketNo.trim() || undefined,
      })
      if (flatRows.length === 0) {
        toastInfo('No records found')
        return
      }

      setSubjectCodes(uniqueSubjectCodes(flatRows))
      setMainList(groupByHallTicket(flatRows))
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
    setCollegeId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setRestRows([])
    setHallTicketNo('')
    setSearchText('')
    clearResults()
  }

  function handleExportExcel() {
    if (filteredList.length === 0) return
    const codes = subjectCodes.map((s) => s.subject_code)
    const topHeads = codes.map((c) => `<th colspan="2">${c}</th>`).join('')
    const subHeads = codes.map(() => '<th>Points</th><th>Grade</th>').join('')
    const head = `
      <tr>
        <th rowspan="2">ROLL NO</th>
        ${topHeads}
        <th rowspan="2">SGPA</th>
        <th rowspan="2">Fail Count</th>
        <th rowspan="2">Failed Subjects</th>
      </tr>
      <tr>${subHeads}</tr>`
    const body = filteredList
      .map((list) => {
        const first = list[0] ?? {}
        const subjectCells = codes
          .map(
            (code) =>
              `<td>${findMarks(list, code, 'grade_points')}</td><td>${findMarks(list, code, 'grade')}</td>`,
          )
          .join('')
        return `<tr>
          <td>${strFrom(first, ['hallticket_number', 'hall_ticketno'])}</td>
          ${subjectCells}
          <td>${strFrom(first, ['sgpa'])}</td>
          <td>${strFrom(first, ['total_fail_subjects'])}</td>
          <td>${strFrom(first, ['failed_subjects'])}</td>
        </tr>`
      })
      .join('')
    const title = `<tr><th colspan="${3 + codes.length * 2}" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Grade And Grade Points Report</th></tr>`
    exportHtmlTable('Grade And Grade Points Report.xls', title, `${head}${body}`)
  }

  function handlePrint() {
    if (filteredList.length === 0) return
    const college = colleges.find(
      (r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
    )
    printStudentWiseGradePointReport(filteredList, {
      title: 'Grade And Grade Points Report',
      collegeName: strFrom(college ?? {}, ['college_name', 'collegeName']),
      subjectCodes: subjectCodes.map((s) => s.subject_code),
    })
  }

  return (
    <FilteredPage
      title="Grade And Grade Points Report"
      filters={
        <div className="space-y-3">
          <GlobalFilterBarRow>
            <GlobalFilterField label="Course" icon={GraduationCap}>
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
            <GlobalFilterField label="Exam Year" icon={CalendarDays}>
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
            <GlobalFilterField label="Exam" icon={ClipboardList}>
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
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField label="College" icon={Building2}>
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
            <GlobalFilterField label="Group" icon={School}>
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setCourseGroupId(v ? Number(v) : null)
                }}
                options={courseGroups.map((r) => ({
                  value: String(numFrom(r, ['fk_course_group_id', 'courseGroupId'])),
                  label: strFrom(r, ['group_code', 'groupCode', 'course_group_code']),
                }))}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Year" icon={Layers}>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  clearResults()
                  setCourseYearId(v ? Number(v) : null)
                }}
                options={courseYears.map((r) => ({
                  value: String(numFrom(r, ['fk_course_year_id', 'courseYearId'])),
                  label: strFrom(r, ['course_year_code', 'courseYearCode', 'course_year_name']),
                }))}
                placeholder="Course Year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Hall Ticket" icon={BookOpen}>
              <Input
                value={hallTicketNo}
                onChange={(e) => setHallTicketNo(e.target.value)}
                placeholder="All students (optional)"
                className="h-8 text-[12px]"
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
        mainList.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Grade And Grade Points Report</p>
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
                  placeholder="Search roll no"
                  className="h-8 w-48 text-[12px]"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold" rowSpan={2}>
                      ROLL NO
                    </th>
                    {subjectCodes.map((subj) => (
                      <th
                        key={`h-${subj.subject_code}`}
                        className="px-3 py-2 text-center font-semibold"
                        colSpan={2}
                      >
                        {subj.subject_code}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold" rowSpan={2}>
                      SGPA
                    </th>
                    <th className="px-3 py-2 font-semibold" rowSpan={2}>
                      Fail Count
                    </th>
                    <th className="px-3 py-2 font-semibold" rowSpan={2}>
                      Failed Subjects
                    </th>
                  </tr>
                  <tr>
                    {subjectCodes.map((subj) => (
                      <Fragment key={`s-${subj.subject_code}`}>
                        <th className="px-3 py-2 font-semibold">Points</th>
                        <th className="px-3 py-2 font-semibold">Grade</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((list, i) => {
                    const first = list[0] ?? {}
                    return (
                      <tr
                        key={`${strFrom(first, ['hallticket_number', 'hall_ticketno'])}-${i}`}
                        className="border-t"
                      >
                        <td className="px-3 py-1.5">
                          {strFrom(first, ['hallticket_number', 'hall_ticketno'])}
                        </td>
                        {subjectCodes.map((subj) => (
                          <Fragment key={`${subj.subject_code}-${i}`}>
                            <td className="px-3 py-1.5 text-center">
                              {findMarks(list, subj.subject_code, 'grade_points')}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {findMarks(list, subj.subject_code, 'grade')}
                            </td>
                          </Fragment>
                        ))}
                        <td className="px-3 py-1.5 text-center">{strFrom(first, ['sgpa']) || ' '}</td>
                        <td className="px-3 py-1.5 text-center">
                          {strFrom(first, ['total_fail_subjects']) || ' '}
                        </td>
                        <td className="px-3 py-1.5">
                          {strFrom(first, ['failed_subjects']) || ' '}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      }
    />
  )
}
