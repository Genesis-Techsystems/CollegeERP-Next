'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getExamAbsenteesReport,
  getGradeMemoIssueFilters,
  getGradeMemoIssueRestFilters,
  getUnivExamSubjectUc,
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
  Scale,
  School,
} from 'lucide-react'
import { printExamAbsenteesReport } from '../_components/printExamAbsenteesReport'

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

export default function ExamAbsenteesReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number>(0)
  const [courseGroupId, setCourseGroupId] = useState<number>(0)
  const [courseYearId, setCourseYearId] = useState<number>(0)
  const [regulationId, setRegulationId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number>(0)
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
        restRows.filter(
          (r) =>
            collegeId === 0 || numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
        ),
        ['fk_course_group_id', 'courseGroupId'],
      ),
    [restRows, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            (collegeId === 0 || numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)) &&
            (courseGroupId === 0 ||
              numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0)),
    [restRows, collegeId, courseGroupId],
  )
  const regulations = useMemo(() => {
    const filtered = restRows.filter(
      (r) => !courseId || numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId),
    )
    return dedupeBy(filtered.length > 0 ? filtered : restRows, ['fk_regulation_id', 'regulationId'])
  }, [restRows, courseId])
  const subjects = useMemo(
    () => dedupeBy(subjectRows, ['fk_subject_id', 'subjectId']),
    [subjectRows],
  )

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const ht = strFrom(r, ['hallticket_number', 'hall_ticketno']).toLowerCase()
      const sub = strFrom(r, ['subject_name', 'subject_code']).toLowerCase()
      const group = strFrom(r, ['group_code', 'college_code']).toLowerCase()
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
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([])
        setCollegeId(0)
        setCourseGroupId(0)
        setCourseYearId(0)
        setRegulationId(0)
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
          setCollegeId(0)
          setCourseGroupId(0)
          setCourseYearId(0)
          setRegulationId(0)
          return
        }
        const nextColleges = dedupeBy(rest, ['fk_college_id', 'collegeId']).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? a.sort_order ?? 0) -
            Number(b.clg_sort_order ?? b.sort_order ?? 0),
        )
        setCollegeId(
          nextColleges[0] ? numFrom(nextColleges[0], ['fk_college_id', 'collegeId']) : 0,
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
    if (skipAutoSelect) return
    if (collegeId === 0) {
      setCourseGroupId(0)
      return
    }
    const groups = dedupeBy(
      restRows.filter((r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
      ['fk_course_group_id', 'courseGroupId'],
    )
    setCourseGroupId(groups[0] ? numFrom(groups[0], ['fk_course_group_id', 'courseGroupId']) : 0)
  }, [collegeId, restRows, skipAutoSelect])

  useEffect(() => {
    if (skipAutoSelect) return
    if (courseGroupId === 0) {
      setCourseYearId(0)
      return
    }
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          (collegeId === 0 || numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)) &&
          numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
      ),
      ['fk_course_year_id', 'courseYearId'],
    ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0))
    setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
  }, [courseGroupId, collegeId, restRows, skipAutoSelect])

  useEffect(() => {
    if (skipAutoSelect) return
    const regs = dedupeBy(
      restRows.filter(
        (r) => !courseId || numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId),
      ),
      ['fk_regulation_id', 'regulationId'],
    )
    setRegulationId(regs[0] ? numFrom(regs[0], ['fk_regulation_id', 'regulationId']) : 0)
  }, [courseYearId, restRows, courseId, skipAutoSelect])

  useEffect(() => {
    let cancelled = false
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId) {
        setSubjectRows([])
        setSubjectId(0)
        return
      }
      try {
        const list = await getUnivExamSubjectUc({
          collegeId: collegeId || 0,
          courseId,
          courseGroupId: courseGroupId || 0,
          courseYearId: courseYearId || 0,
          examId,
          academicYearId,
          regulationId: regulationId || 0,
          employeeId,
        })
        if (cancelled) return
        setSubjectRows(list)
        const next = dedupeBy(list, ['fk_subject_id', 'subjectId'])
        if (skipAutoSelect) {
          setSubjectId(0)
          return
        }
        setSubjectId(next[0] ? numFrom(next[0], ['fk_subject_id', 'subjectId']) : 0)
      } catch {
        if (!cancelled) {
          setSubjectRows([])
          setSubjectId(0)
        }
      }
    }
    void loadSubjects()
    return () => {
      cancelled = true
    }
  }, [
    courseId,
    academicYearId,
    examId,
    collegeId,
    courseGroupId,
    courseYearId,
    regulationId,
    employeeId,
    skipAutoSelect,
  ])

  async function handleGetReport() {
    if (!courseId || !examId) {
      toastError('Please select Course and Exam')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const data = await getExamAbsenteesReport({
        collegeId: collegeId || 0,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
        regulationId: regulationId || 0,
        examId,
        subjectId: subjectId || 0,
      })
      if (data.length === 0) {
        toastInfo('No records found')
        return
      }
      setExamLabel(
        strFrom(data[0] ?? {}, ['exam_label_name', 'exam_name']) ||
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
    setCollegeId(0)
    setCourseGroupId(0)
    setCourseYearId(0)
    setRegulationId(0)
    setSubjectId(0)
    setRestRows([])
    setSubjectRows([])
    setSearchText('')
    clearResults()
  }

  function handleExportExcel() {
    if (filteredRows.length === 0) return
    const head = `<tr><th>SI.No</th><th>College Code</th><th>Group Code</th><th>Course Year Code</th><th>Exam Date</th><th>Subject Name (Subject Code)</th><th>Hallticket Number</th></tr>`
    const body = filteredRows
      .map((r, i) => {
        const name = strFrom(r, ['subject_name', 'subjectName'])
        const code = strFrom(r, ['subject_code', 'subjectCode'])
        const subject = name && code ? `${name} (${code})` : name || code
        return `<tr>
          <td>${i + 1}</td>
          <td>${strFrom(r, ['college_code', 'collegeCode'])}</td>
          <td>${strFrom(r, ['group_code', 'groupCode'])}</td>
          <td>${strFrom(r, ['course_year_code', 'courseYearCode'])}</td>
          <td>${strFrom(r, ['exam_date', 'examDate'])}</td>
          <td>${subject}</td>
          <td>${strFrom(r, ['hallticket_number', 'hall_ticketno'])}</td>
        </tr>`
      })
      .join('')
    const title = `<tr><th colspan="7" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Exam Absentees Report</th></tr>`
    exportHtmlTable('Exam Absentees Report.xls', title, `${head}${body}`)
  }

  function handlePrint() {
    if (filteredRows.length === 0) return
    const college = colleges.find(
      (r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
    )
    printExamAbsenteesReport(filteredRows, {
      title: 'Exam Absentees Report',
      examLabel,
      collegeName: strFrom(college ?? {}, ['college_name', 'collegeName']),
    })
  }

  return (
    <FilteredPage
      title="Exam Absentees Report"
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
                value={String(collegeId)}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setCollegeId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...colleges.map((r) => ({
                    value: String(numFrom(r, ['fk_college_id', 'collegeId'])),
                    label: strFrom(r, ['college_code', 'collegeCode', 'college_name']),
                  })),
                ]}
                placeholder="College"
                searchable
                isLoading={Boolean(examId) && loading}
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Group"
              icon={School}
              className="!flex-[0_1_7.5rem] !max-w-[8.5rem] !min-w-[6.5rem]"
            >
              <Select
                value={String(courseGroupId)}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setCourseGroupId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...courseGroups.map((r) => ({
                    value: String(numFrom(r, ['fk_course_group_id', 'courseGroupId'])),
                    label: strFrom(r, ['group_code', 'groupCode', 'course_group_code']),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
            <GlobalFilterField label="Year" icon={Layers}>
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
              />
            </GlobalFilterField>
            <GlobalFilterField label="Regulation" icon={Scale}>
              <Select
                value={String(regulationId)}
                onChange={(v) => {
                  clearResults()
                  setRegulationId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...regulations.map((r) => ({
                    value: String(numFrom(r, ['fk_regulation_id', 'regulationId'])),
                    label: strFrom(r, ['regulation_code', 'regulationCode']),
                  })),
                ]}
                placeholder="Regulation"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Subject" icon={BookOpen}>
              <Select
                value={String(subjectId)}
                onChange={(v) => {
                  clearResults()
                  setSubjectId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...subjects.map((r) => ({
                    value: String(numFrom(r, ['fk_subject_id', 'subjectId'])),
                    label: `${strFrom(r, ['subject_name', 'subjectName'])} (${strFrom(r, ['subject_code', 'subjectCode'])})`,
                  })),
                ]}
                placeholder="Subject"
                searchable
              />
            </GlobalFilterField>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Get List'}
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
              <p className="font-semibold text-foreground">Exam Absentees Report</p>
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
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">SI.No</th>
                    <th className="px-3 py-2 font-semibold">College Code</th>
                    <th className="px-3 py-2 font-semibold">Group Code</th>
                    <th className="px-3 py-2 font-semibold">Course Year Code</th>
                    <th className="px-3 py-2 font-semibold">Exam Date</th>
                    <th className="px-3 py-2 font-semibold">Subject Name (Subject Code)</th>
                    <th className="px-3 py-2 font-semibold">Hallticket Number</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => {
                    const name = strFrom(r, ['subject_name', 'subjectName'])
                    const code = strFrom(r, ['subject_code', 'subjectCode'])
                    return (
                      <tr
                        key={`${strFrom(r, ['hallticket_number'])}-${strFrom(r, ['subject_code'])}-${i}`}
                        className="border-t"
                      >
                        <td className="px-3 py-1.5 text-center">{i + 1}</td>
                        <td className="px-3 py-1.5">{strFrom(r, ['college_code', 'collegeCode'])}</td>
                        <td className="px-3 py-1.5">{strFrom(r, ['group_code', 'groupCode'])}</td>
                        <td className="px-3 py-1.5">
                          {strFrom(r, ['course_year_code', 'courseYearCode'])}
                        </td>
                        <td className="px-3 py-1.5">{strFrom(r, ['exam_date', 'examDate'])}</td>
                        <td className="px-3 py-1.5">
                          {name && code ? `${name} (${code})` : name || code}
                        </td>
                        <td className="px-3 py-1.5">
                          {strFrom(r, ['hallticket_number', 'hall_ticketno'])}
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
