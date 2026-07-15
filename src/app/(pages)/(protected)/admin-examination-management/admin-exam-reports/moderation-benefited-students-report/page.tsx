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
  getModerationBenefitedStudents,
} from '@/services'
import { GM_CODES } from '@/config/constants/ui'
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
import { printModerationBenefitedStudents } from '../_components/printModerationBenefitedStudents'

type AnyRow = Record<string, any>

type SubjectBucket = {
  subjectId: string
  subjectName: string
  students: AnyRow[]
}

type GroupBucket = {
  groupCode: string
  subjects: SubjectBucket[]
}

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

/** Angular getDetails grouping: by group_id → subjectId → students. */
function groupModerationRows(rows: AnyRow[]): GroupBucket[] {
  const grouped: Record<
    string,
    { groupCode: string; subjects: Record<string, SubjectBucket> }
  > = {}

  for (const item of rows) {
    const groupKey =
      strFrom(item, ['group_id', 'fk_course_group_id', 'groupId']) ||
      strFrom(item, ['group_code', 'groupCode']) ||
      '—'
    const subjectKey =
      strFrom(item, ['subjectId', 'subject_id', 'fk_subject_id']) ||
      strFrom(item, ['subject_name', 'subject']) ||
      '—'

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        groupCode: strFrom(item, ['group_code', 'groupCode']) || groupKey,
        subjects: {},
      }
    }
    if (!grouped[groupKey].subjects[subjectKey]) {
      grouped[groupKey].subjects[subjectKey] = {
        subjectId: subjectKey,
        subjectName: strFrom(item, ['subject_name', 'subject']) || subjectKey,
        students: [],
      }
    }
    grouped[groupKey].subjects[subjectKey].students.push(item)
  }

  return Object.values(grouped).map((g) => ({
    groupCode: g.groupCode,
    subjects: Object.values(g.subjects),
  }))
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`
  const link = document.createElement('a')
  link.download = filename
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`
  link.click()
}

export default function ModerationBenefitedStudentsReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examTypeCatdetId, setExamTypeCatdetId] = useState<number>(0)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number>(0)
  const [courseYearId, setCourseYearId] = useState<number>(0)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [groupResults, setGroupResults] = useState<GroupBucket[]>([])
  const [searchText, setSearchText] = useState('')
  const [dataDetails, setDataDetails] = useState('')
  const [examLabel, setExamLabel] = useState('')

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
            (courseGroupId === 0 ||
              numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0)),
    [restRows, collegeId, courseGroupId],
  )

  const filteredGroups = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return groupResults
    return groupResults
      .map((group) => ({
        ...group,
        subjects: group.subjects
          .map((subj) => ({
            ...subj,
            students: subj.students.filter((s) => {
              const ht = strFrom(s, ['hall_ticketno', 'hallticket_number']).toLowerCase()
              const sub = strFrom(s, ['subject_name', 'subject']).toLowerCase()
              return ht.includes(q) || sub.includes(q)
            }),
          }))
          .filter((subj) => subj.students.length > 0),
      }))
      .filter((group) => group.subjects.length > 0)
  }, [groupResults, searchText])

  function clearResults() {
    setGroupResults([])
    setDataDetails('')
    setExamLabel('')
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
    async function loadRestAndTypes() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([])
        setExamFeeTypes([])
        setCollegeId(null)
        setCourseGroupId(0)
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
          setCollegeId(null)
          setCourseGroupId(0)
          setCourseYearId(0)
          return
        }

        setExamTypeCatdetId(
          allowed[0] ? numFrom(allowed[0], ['generalDetailId', 'general_detail_id']) : 0,
        )

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
    void loadRestAndTypes()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect])

  useEffect(() => {
    if (!collegeId) {
      setCourseGroupId(0)
      setCourseYearId(0)
      return
    }
    if (skipAutoSelect) return
    const groups = dedupeBy(
      restRows.filter((r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
      ['fk_course_group_id', 'courseGroupId'],
    )
    const nextGroupId = groups[0] ? numFrom(groups[0], ['fk_course_group_id', 'courseGroupId']) : 0
    setCourseGroupId(nextGroupId)
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
          numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(nextGroupId),
      ),
      ['fk_course_year_id', 'courseYearId'],
    ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0))
    setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
  }, [collegeId, restRows, skipAutoSelect])

  useEffect(() => {
    if (skipAutoSelect || !collegeId) return
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
          (courseGroupId === 0 ||
            numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
      ),
      ['fk_course_year_id', 'courseYearId'],
    ).sort((a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0))
    setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
  }, [courseGroupId, collegeId, restRows, skipAutoSelect])

  async function handleGetReport() {
    if (!courseId || !collegeId || !examId) {
      toastError('Please select Course, Exam, and College')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const rows = await getModerationBenefitedStudents({
        examId,
        examTypeCatdetId: examTypeCatdetId || 0,
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
      })
      if (rows.length === 0) {
        toastInfo('No records found')
        return
      }

      const course = courses.find((r) => numFrom(r, ['fk_course_id', 'courseId']) === Number(courseId))
      const college = colleges.find(
        (r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
      )
      const group = courseGroups.find(
        (r) => numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
      )
      const year = courseYears.find(
        (r) => numFrom(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId),
      )
      const examName =
        strFrom(rows[0] ?? {}, ['exam_label_name', 'exam_name']) ||
        strFrom(
          exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === Number(examId)) ?? {},
          ['exam_name', 'examName'],
        )
      setExamLabel(examName)
      setDataDetails(
        [
          strFrom(college ?? {}, ['college_code', 'collegeCode']),
          strFrom(course ?? {}, ['course_code', 'courseCode']),
          courseGroupId
            ? strFrom(group ?? {}, ['group_code', 'groupCode', 'course_group_code'])
            : '',
          courseYearId
            ? strFrom(year ?? {}, ['course_year_code', 'courseYearCode', 'course_year_name'])
            : '',
          examName,
        ]
          .filter(Boolean)
          .join(' / '),
      )
      setGroupResults(groupModerationRows(rows))
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
    setCollegeId(null)
    setCourseGroupId(0)
    setCourseYearId(0)
    setRestRows([])
    setExamFeeTypes([])
    setSearchText('')
    clearResults()
  }

  function handleExportExcel() {
    if (filteredGroups.length === 0) return
    const rowsHtml = filteredGroups
      .map((group) => {
        const groupHeader = `<tr><td colspan="5"><b>Course Group: ${group.groupCode}</b></td></tr>`
        const subjects = group.subjects
          .map((subj) => {
            const subHeader = `<tr><td colspan="5"><b>Subject : ${subj.subjectName}</b></td></tr>`
            const head = `<tr><th>S.No</th><th>Hall Ticket No.</th><th>Original Marks</th><th>Moderation Marks</th><th>Final Marks</th></tr>`
            const body = subj.students
              .map(
                (s, i) =>
                  `<tr><td>${i + 1}</td><td>${strFrom(s, ['hall_ticketno', 'hallticket_number'])}</td><td>${strFrom(s, ['ext_marks'])}</td><td>${strFrom(s, ['moderation_marks_added'])}</td><td>${strFrom(s, ['moderated_ext_marks'])}</td></tr>`,
              )
              .join('')
            return `${subHeader}${head}${body}`
          })
          .join('')
        return `${groupHeader}${subjects}`
      })
      .join('')
    const title = `<tr><th colspan="5" style="text-align:center;font-size:18px;font-weight:bold;background:#f2f2f2;">Moderation Benefited Students Data${dataDetails ? ` (${dataDetails})` : ''}</th></tr>`
    exportHtmlTable('Moderation Benefited Students Data.xls', title, rowsHtml)
  }

  function handlePrint() {
    if (filteredGroups.length === 0) return
    const college = colleges.find(
      (r) => numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
    )
    printModerationBenefitedStudents(filteredGroups, {
      title: 'Moderation Benefited Students Data',
      examLabel,
      collegeName: strFrom(college ?? {}, ['college_name', 'collegeName']),
    })
  }

  return (
    <FilteredPage
      title="Moderation Benefited Students Data"
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
            <GlobalFilterField label="Exam Master" icon={ClipboardList} className="md:col-span-2">
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  setSkipAutoSelect(false)
                  clearResults()
                  setExamId(v ? Number(v) : null)
                }}
                options={exams.map((r) => {
                  const tags = [
                    r.is_internal_exam ? 'Internal' : '',
                    r.is_regular_exam ? 'Regular' : '',
                    r.is_supply_exam ? 'Supple' : '',
                  ]
                    .filter(Boolean)
                    .join(', ')
                  const name = strFrom(r, ['exam_name', 'examName'])
                  return {
                    value: String(numFrom(r, ['fk_exam_id', 'examId'])),
                    label: tags ? `${name} (${tags})` : name,
                  }
                })}
                placeholder="Exam Master"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Type" icon={BookOpen}>
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
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Group" icon={Layers}>
              <Select
                value={String(courseGroupId)}
                onChange={(v) => {
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
            <GlobalFilterField label="Course Years" icon={School}>
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
                    label: strFrom(r, ['course_year_code', 'courseYearCode']),
                  })),
                ]}
                placeholder="Course Years"
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
        groupResults.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Moderation Benefited Students Data</p>
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

            <div className="space-y-5">
              {filteredGroups.map((group) => (
                <div key={group.groupCode} className="space-y-3">
                  <p className="text-sm font-semibold text-[#042956]">
                    Course Group: {group.groupCode}
                  </p>
                  {group.subjects.map((subj) => (
                    <div key={`${group.groupCode}-${subj.subjectId}`} className="space-y-2">
                      <p className="text-sm font-medium text-[#042956]">
                        Subject : {subj.subjectName}
                      </p>
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 font-semibold">S.No</th>
                              <th className="px-3 py-2 font-semibold">Hall Ticket No.</th>
                              <th className="px-3 py-2 font-semibold">Original Marks</th>
                              <th className="px-3 py-2 font-semibold">Moderation Marks</th>
                              <th className="px-3 py-2 font-semibold">Final Marks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subj.students.map((student, i) => (
                              <tr
                                key={`${strFrom(student, ['hall_ticketno', 'hallticket_number'])}-${i}`}
                                className="border-t"
                              >
                                <td className="px-3 py-1.5 text-center">{i + 1}</td>
                                <td className="px-3 py-1.5">
                                  {strFrom(student, ['hall_ticketno', 'hallticket_number'])}
                                </td>
                                <td className="px-3 py-1.5">{strFrom(student, ['ext_marks'])}</td>
                                <td className="px-3 py-1.5">
                                  {strFrom(student, ['moderation_marks_added'])}
                                </td>
                                <td className="px-3 py-1.5">
                                  {strFrom(student, ['moderated_ext_marks'])}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
    />
  )
}
