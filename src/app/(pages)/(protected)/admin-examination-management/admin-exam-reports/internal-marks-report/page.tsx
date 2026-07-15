'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getGradeMemoIssueRestFilters,
  getInternalMarksEntryFilters,
  getInternalMarksReport,
} from '@/services'
import { toastError, toastInfo } from '@/lib/toast'
import {
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
import {
  printInternalMarksReport,
  type SubjectCol,
} from '../_components/printInternalMarksReport'

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

function findMarks(list: AnyRow[], subjectCode: string, markType: string): string | number {
  const subject = list.find((item) => String(item.subject_code ?? '') === subjectCode)
  if (!subject) return ' '
  const v = subject[markType]
  return v == null || String(v).trim() === '' ? ' ' : (v as string | number)
}

function rowTotal(list: AnyRow[], subjectCols: SubjectCol[]): number {
  return subjectCols.reduce((sum, col) => {
    const mark = Number(findMarks(list, col.subject_code, 'marks'))
    return sum + (Number.isFinite(mark) ? mark : 0)
  }, 0)
}

function buildSubjectCols(flat: AnyRow[]): SubjectCol[] {
  const seen = new Set<string>()
  const out: SubjectCol[] = []
  for (const row of flat) {
    const code = strFrom(row, ['subject_code'])
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push({ subject_code: code, subject_name: strFrom(row, ['subject_name']) })
  }
  return out
}

function buildMainList(flat: AnyRow[]): AnyRow[][] {
  const seen = new Set<string>()
  const students: AnyRow[] = []
  for (const row of flat) {
    const roll = strFrom(row, ['roll_number'])
    if (!roll || seen.has(roll)) continue
    seen.add(roll)
    students.push(row)
  }
  return students.map((stu) => {
    const roll = strFrom(stu, ['roll_number'])
    return flat.filter((r) => strFrom(r, ['roll_number']) === roll)
  })
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`
  const link = document.createElement('a')
  link.download = filename
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`
  link.click()
}

export default function InternalMarksReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number>(0)
  const [courseYearId, setCourseYearId] = useState<number>(0)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [flatRows, setFlatRows] = useState<AnyRow[]>([])
  const [filterSummary, setFilterSummary] = useState('')
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
          (r) => !collegeId || numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
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
            (!collegeId || numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)) &&
            (courseGroupId === 0 ||
              numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0)),
    [restRows, collegeId, courseGroupId],
  )

  const subjectCols = useMemo(() => buildSubjectCols(flatRows), [flatRows])
  const mainList = useMemo(() => buildMainList(flatRows), [flatRows])
  const maxMarksBySubject = useMemo(() => {
    const map: Record<string, string | number> = {}
    for (const col of subjectCols) {
      map[col.subject_code] = findMarks(flatRows, col.subject_code, 'max_marks')
    }
    return map
  }, [flatRows, subjectCols])

  const filteredMainList = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return mainList
    return mainList.filter((list) => {
      const roll = strFrom(list[0] ?? {}, ['roll_number']).toLowerCase()
      return roll.includes(q)
    })
  }, [mainList, searchText])

  function clearResults() {
    setFlatRows([])
    setFilterSummary('')
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const list = await getInternalMarksEntryFilters(employeeId)
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
        setCourseGroupId(0)
        setCourseYearId(0)
        return
      }
      setLoading(true)
      try {
        // Angular report selectedExam(): rest filters with in_flag_type ALL
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
          setCourseGroupId(0)
          setCourseYearId(0)
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
    if (skipAutoSelect) return
    if (!collegeId) {
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
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          (!collegeId || numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)) &&
          (courseGroupId === 0 ||
            numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
      ),
      ['fk_course_year_id', 'courseYearId'],
    ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0))
    setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
  }, [collegeId, courseGroupId, restRows, skipAutoSelect])

  async function handleGetReport() {
    if (!courseId || !academicYearId || !examId || !collegeId) {
      toastError('Please select Course, Exam Year, Exam, and College')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const rows = await getInternalMarksReport({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
      })
      if (rows.length === 0) {
        toastInfo('No records found')
        return
      }
      setFlatRows(rows)

      const collegeCode = strFrom(
        colleges.find((r) => numFrom(r, ['fk_college_id', 'collegeId']) === collegeId) ?? {},
        ['college_code', 'collegeCode'],
      )
      const courseCode = strFrom(
        courses.find((r) => numFrom(r, ['fk_course_id', 'courseId']) === courseId) ?? {},
        ['course_code', 'courseCode'],
      )
      const examName = strFrom(
        exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === examId) ?? {},
        ['exam_name', 'examName'],
      )
      const groupCode =
        courseGroupId === 0
          ? 'All'
          : strFrom(
              courseGroups.find(
                (r) => numFrom(r, ['fk_course_group_id', 'courseGroupId']) === courseGroupId,
              ) ?? {},
              ['group_code', 'groupCode'],
            )
      const yearCode =
        courseYearId === 0
          ? 'All'
          : strFrom(
              courseYears.find(
                (r) => numFrom(r, ['fk_course_year_id', 'courseYearId']) === courseYearId,
              ) ?? {},
              ['course_year_code', 'courseYearCode'],
            )
      setFilterSummary(
        [collegeCode, courseCode, groupCode, yearCode, examName].filter(Boolean).join(' / '),
      )
    } catch {
      toastError('Failed to load internal marks report')
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
    setCourseGroupId(0)
    setCourseYearId(0)
    setRestRows([])
  }

  function handleExport() {
    if (filteredMainList.length === 0) return
    const headerCells = [
      '<th>S.No</th>',
      '<th>Hall Ticket No.</th>',
      ...subjectCols.map(
        (col) =>
          `<th>${col.subject_code}<br/>(${col.subject_name})<br/>Max Marks(${maxMarksBySubject[col.subject_code] ?? ' '})</th>`,
      ),
      '<th>Total Marks Scored</th>',
      '<th>Total Maximum Marks</th>',
      '<th>Percentage (%)</th>',
    ].join('')
    const body = filteredMainList
      .map((list, i) => {
        const first = list[0] ?? {}
        const subjectCells = subjectCols
          .map((col) => `<td>${findMarks(list, col.subject_code, 'marks')}</td>`)
          .join('')
        return `<tr>
          <td>${i + 1}</td>
          <td>${strFrom(first, ['roll_number'])}</td>
          ${subjectCells}
          <td>${rowTotal(list, subjectCols)}</td>
          <td>${strFrom(first, ['total_max_marks'])}</td>
          <td>${strFrom(first, ['total_percentage'])}</td>
        </tr>`
      })
      .join('')
    exportHtmlTable(
      'Internal Marks Report.xls',
      `<caption>Internal Marks Report${filterSummary ? ` (${filterSummary})` : ''}</caption><thead><tr>${headerCells}</tr></thead>`,
      `<tbody>${body}</tbody>`,
    )
  }

  function handlePrint() {
    if (filteredMainList.length === 0) return
    const college = colleges.find((r) => numFrom(r, ['fk_college_id', 'collegeId']) === collegeId)
    printInternalMarksReport(filteredMainList, {
      title: 'Internal Marks Report',
      filterSummary,
      collegeName: strFrom(college ?? {}, ['college_name', 'collegeName']),
      subjectCols,
      maxMarksBySubject,
    })
  }

  return (
    <FilteredPage
      title="Internal Marks Report"
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
            <GlobalFilterField
              label="Course Group"
              icon={Layers}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
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
                    label: strFrom(r, ['group_code', 'groupCode', 'group_name']),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Course Year"
              icon={School}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setCourseYearId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...courseYears.map((r) => ({
                    value: String(numFrom(r, ['fk_course_year_id', 'courseYearId'])),
                    label: strFrom(r, ['course_year_code', 'courseYearCode', 'course_year']),
                  })),
                ]}
                placeholder="Course Year"
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
        flatRows.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Internal Marks Report</p>
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
                    <th className="px-2 py-2 font-semibold">Hall Ticket No.</th>
                    {subjectCols.map((col) => (
                      <th key={col.subject_code} className="px-2 py-2 text-center font-semibold">
                        <div>{col.subject_code}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          ({col.subject_name})
                        </div>
                        <div className="text-[11px] font-normal text-muted-foreground">
                          Max Marks({maxMarksBySubject[col.subject_code] ?? ' '})
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2 font-semibold">Total Marks Scored</th>
                    <th className="px-2 py-2 font-semibold">Total Maximum Marks</th>
                    <th className="px-2 py-2 font-semibold">Percentage (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMainList.map((list, i) => {
                    const first = list[0] ?? {}
                    return (
                      <tr
                        key={`${strFrom(first, ['roll_number'])}-${i}`}
                        className="border-t"
                      >
                        <td className="px-2 py-1.5 text-center">{i + 1}</td>
                        <td className="px-2 py-1.5 text-center">
                          {strFrom(first, ['roll_number'])}
                        </td>
                        {subjectCols.map((col) => (
                          <td key={col.subject_code} className="px-2 py-1.5 text-center">
                            {findMarks(list, col.subject_code, 'marks')}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-center">
                          {rowTotal(list, subjectCols)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {strFrom(first, ['total_max_marks'])}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {strFrom(first, ['total_percentage'])}
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
