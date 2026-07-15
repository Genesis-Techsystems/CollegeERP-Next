'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getGradeMemoIssueFilters,
  getLabRemunerationEvaluators,
  getLabRemunerationReport,
  getLabRemunerationRestFilters,
  getLabRemunerationSubjects,
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
  UserRound,
} from 'lucide-react'
import {
  groupLabRemunerationByProfile,
  printLabRemunerationReport,
} from '../_components/printLabRemunerationReport'

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

export default function LabRemunerationReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number>(0)
  const [courseYearId, setCourseYearId] = useState<number>(0)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number>(0)
  const [evaluatorProfileId, setEvaluatorProfileId] = useState<number>(0)
  const [isReevaluation, setIsReevaluation] = useState(false)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [examName, setExamName] = useState('')
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
  const regulations = useMemo(
    () => dedupeBy(regulationRows, ['fk_regulation_id', 'regulationId']),
    [regulationRows],
  )
  const subjects = useMemo(
    () => dedupeBy(subjectRows, ['fk_subject_id', 'subjectId']),
    [subjectRows],
  )
  const evaluators = useMemo(
    () => dedupeBy(evaluatorRows, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId']),
    [evaluatorRows],
  )

  const profiles = useMemo(() => groupLabRemunerationByProfile(rows), [rows])

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.evaluator_name,
        r.subject_code,
        r.subject_name,
        r.account_number,
        r.ifsc_code,
        r.user_name,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [rows, searchText])

  function clearResults() {
    setRows([])
    setExamName('')
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
        setRegulationRows([])
        setCollegeId(null)
        setCourseGroupId(0)
        setCourseYearId(0)
        setRegulationId(null)
        setSubjectRows([])
        setEvaluatorRows([])
        setSubjectId(0)
        setEvaluatorProfileId(0)
        return
      }
      setLoading(true)
      try {
        const { rest, regulations: regs } = await getLabRemunerationRestFilters({
          courseId,
          academicYearId,
          examId,
          employeeId,
        })
        if (cancelled) return
        setRestRows(rest)
        setRegulationRows(regs)
        if (skipAutoSelect) {
          setCollegeId(null)
          setCourseGroupId(0)
          setCourseYearId(0)
          setRegulationId(null)
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

  useEffect(() => {
    if (skipAutoSelect) return
    const regs = dedupeBy(regulationRows, ['fk_regulation_id', 'regulationId'])
    setRegulationId(regs[0] ? numFrom(regs[0], ['fk_regulation_id', 'regulationId']) : null)
  }, [regulationRows, skipAutoSelect])

  useEffect(() => {
    let cancelled = false
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId || !collegeId || !regulationId) {
        setSubjectRows([])
        setSubjectId(0)
        setEvaluatorRows([])
        setEvaluatorProfileId(0)
        return
      }
      setLoading(true)
      try {
        const list = await getLabRemunerationSubjects({
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          examId,
          academicYearId,
          regulationId,
          employeeId,
        })
        if (cancelled) return
        setSubjectRows(list)
        if (skipAutoSelect) {
          setSubjectId(0)
          return
        }
        const next = dedupeBy(list, ['fk_subject_id', 'subjectId'])
        setSubjectId(next[0] ? numFrom(next[0], ['fk_subject_id', 'subjectId']) : 0)
      } catch {
        if (!cancelled) toastError('Failed to load subjects')
      } finally {
        if (!cancelled) setLoading(false)
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

  useEffect(() => {
    let cancelled = false
    async function loadEvaluators() {
      if (!courseId || !academicYearId || !examId || !regulationId) {
        setEvaluatorRows([])
        setEvaluatorProfileId(0)
        return
      }
      setLoading(true)
      try {
        const list = await getLabRemunerationEvaluators({
          organizationId,
          employeeId,
          examId,
          courseYearId,
          subjectId,
          regulationId,
          courseId,
          academicYearId,
        })
        if (cancelled) return
        setEvaluatorRows(list)
        if (skipAutoSelect) {
          setEvaluatorProfileId(0)
          return
        }
        const next = dedupeBy(list, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
        setEvaluatorProfileId(
          next[0]
            ? numFrom(next[0], ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
            : 0,
        )
      } catch {
        if (!cancelled) toastError('Failed to load evaluators')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadEvaluators()
    return () => {
      cancelled = true
    }
  }, [
    courseId,
    academicYearId,
    examId,
    courseYearId,
    subjectId,
    regulationId,
    organizationId,
    employeeId,
    skipAutoSelect,
  ])

  async function handleGetReport() {
    if (!courseId || !academicYearId || !examId || !collegeId || !regulationId) {
      toastError('Please select required filters')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const list = await getLabRemunerationReport({
        examId,
        subjectId,
        evaluatorProfileId,
        isReevaluation,
      })
      if (list.length === 0) {
        toastInfo('No records found')
        return
      }
      setRows(list)
      setExamName(
        strFrom(
          exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === examId) ?? {},
          ['exam_name', 'examName'],
        ),
      )
    } catch {
      toastError('Failed to load lab remuneration report')
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
    setRegulationId(null)
    setSubjectId(0)
    setEvaluatorProfileId(0)
    setIsReevaluation(false)
    setRestRows([])
    setRegulationRows([])
    setSubjectRows([])
    setEvaluatorRows([])
  }

  function handleExport() {
    if (profiles.length === 0) return
    const headerCells = [
      '<th>Exam Name</th>',
      '<th>Evaluator Name</th>',
      '<th>Mobile</th>',
      '<th>Bank Name</th>',
      '<th>Bank Address</th>',
      '<th>Account Number</th>',
      '<th>IFSC Code</th>',
      '<th>Evaluation Count</th>',
      '<th>Total Subjects</th>',
      '<th>Amount Per Evaluation</th>',
      '<th>Final Amount</th>',
    ].join('')
    const body = profiles
      .map((report) => {
        const evalCount = report.subjects.reduce(
          (sum, s) => sum + (Number(s.evaluation_count) || 0),
          0,
        )
        return `<tr>
          <td>${examName}</td>
          <td>${report.evaluator_name ?? ''}</td>
          <td>${report.phonenumber ?? ''}</td>
          <td>${report.bank_name ?? ''}</td>
          <td>${report.bank_address ?? ''}</td>
          <td>${report.account_number ?? ''}</td>
          <td>${report.ifsc_code ?? ''}</td>
          <td>${evalCount}</td>
          <td>${report.subjects.length}</td>
          <td>${report.amount ?? ''}</td>
          <td>${report.total_final_amount}/-</td>
        </tr>`
      })
      .join('')
    exportHtmlTable(
      'Lab Remuneration Report.xls',
      `<caption>Lab Remuneration Report</caption><thead><tr>${headerCells}</tr></thead>`,
      `<tbody>${body}</tbody>`,
    )
  }

  function handlePrint() {
    if (profiles.length === 0) return
    printLabRemunerationReport(profiles, {
      title: 'Lab Remuneration Report',
      examName,
    })
  }

  return (
    <FilteredPage
      title="Lab Remuneration Report"
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
          </GlobalFilterBarRow>

          <GlobalFilterBarRow>
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
            <GlobalFilterField
              label="Regulation"
              icon={Layers}
              className="!flex-[0_1_8.5rem] !max-w-[9.5rem] !min-w-[7rem]"
            >
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setRegulationId(v ? Number(v) : null)
                }}
                options={regulations.map((r) => ({
                  value: String(numFrom(r, ['fk_regulation_id', 'regulationId'])),
                  label: strFrom(r, ['regulation_code', 'regulationCode']),
                }))}
                placeholder="Regulation"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField
              label="Subject"
              icon={ClipboardList}
              className="!flex-[1_1_16rem] !min-w-[12rem]"
            >
              <Select
                value={String(subjectId)}
                onChange={(v) => {
                  setSkipAutoSelect(false)
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
            <GlobalFilterField
              label="Evaluators"
              icon={UserRound}
              className="!flex-[1_1_16rem] !min-w-[12rem]"
            >
              <Select
                value={String(evaluatorProfileId)}
                onChange={(v) => {
                  clearResults()
                  setEvaluatorProfileId(v ? Number(v) : 0)
                }}
                options={[
                  { value: '0', label: 'All' },
                  ...evaluators.map((r) => ({
                    value: String(
                      numFrom(r, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId']),
                    ),
                    label: `${strFrom(r, ['evaluator_name', 'evaluatorName'])} (${strFrom(r, ['user_name', 'userName'])})`,
                  })),
                ]}
                placeholder="Evaluators"
                searchable
              />
            </GlobalFilterField>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 self-end pb-0.5">
              <label className="flex h-8 items-center gap-2 text-[12px] whitespace-nowrap">
                <Checkbox
                  checked={isReevaluation}
                  onCheckedChange={(v) => {
                    clearResults()
                    setIsReevaluation(v === true)
                  }}
                />
                <span>Is Re-Evaluation</span>
              </label>
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
              <p className="font-semibold text-foreground">Lab Remuneration Report</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 text-[12px]"
                  onClick={handleExport}
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Excel Export
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
                    <th className="px-2 py-2 font-semibold">SI.No</th>
                    <th className="px-2 py-2 font-semibold">Evaluator Name</th>
                    <th className="px-2 py-2 font-semibold">Subject Code</th>
                    <th className="px-2 py-2 font-semibold">Evaluation Count</th>
                    <th className="px-2 py-2 font-semibold">Amount</th>
                    <th className="px-2 py-2 font-semibold">Total Amount</th>
                    <th className="px-2 py-2 font-semibold">Account No.</th>
                    <th className="px-2 py-2 font-semibold">IFSC Code</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={`${row.pk_exam_evaluator_profile_id}-${row.subject_code}-${i}`} className="border-t border-border">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5">{strFrom(row, ['evaluator_name'])}</td>
                      <td className="px-2 py-1.5">{strFrom(row, ['subject_code'])}</td>
                      <td className="px-2 py-1.5">{row.evaluation_count ?? ''}</td>
                      <td className="px-2 py-1.5">{row.amount ?? ''}</td>
                      <td className="px-2 py-1.5">{row.final_amount ?? ''}</td>
                      <td className="px-2 py-1.5">{strFrom(row, ['account_number'])}</td>
                      <td className="px-2 py-1.5">{strFrom(row, ['ifsc_code'])}</td>
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
