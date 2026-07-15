'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  getGeneralDetails,
  getGroupWiseFinalResults,
  getRegSupBaseFilters,
  getRegSupRestFilters,
} from '@/services'
import { GM_CODES } from '@/config/constants/ui'
import { toastError, toastInfo } from '@/lib/toast'
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Layers,
  Printer,
  RotateCcw,
  School,
} from 'lucide-react'
import { printGroupWiseResultSheets } from './printGroupWiseResultSheets'

type AnyRow = Record<string, any>

type GroupBucket = {
  groupCode: string
  students: AnyRow[]
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

export function GroupWiseResultSheetsPage({
  resultStatus,
  title,
}: {
  // Angular: passed sheets use 'Passed'; failed sheets use 'Promoted' (not 'Failed')
  resultStatus: 'Passed' | 'Failed' | 'Promoted'
  title: string
}) {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  // Angular: JSON.parse(localStorage.getItem('isAdmin'))
  const isAdmin = (() => {
    try {
      const raw = globalThis?.localStorage?.getItem('isAdmin')
      if (raw == null || raw === '') return false
      return Boolean(JSON.parse(raw))
    } catch {
      return String(globalThis?.localStorage?.getItem('isAdmin') ?? '').toLowerCase() === 'true'
    }
  })()

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
  const [isReevaluation, setIsReevaluation] = useState(false)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [groupResults, setGroupResults] = useState<GroupBucket[]>([])
  const [searchText, setSearchText] = useState('')
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
        students: group.students.filter((s) =>
          strFrom(s, ['hallticket_number', 'hall_ticketno']).toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.students.length > 0)
  }, [groupResults, searchText])

  function clearResults() {
    setGroupResults([])
    setExamLabel('')
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        // Angular getFiltersList(): univ_exam_filters / REGSUP
        const rows = (await getRegSupBaseFilters(employeeId)) as AnyRow[]
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
        // Angular selectedExam(): univ_exam_rest_in_regexamstd / REGSUP
        // + listDetailsByTwoIds(generalDetails, EXMFEETYP)
        const [restRaw, feeTypes] = await Promise.all([
          getRegSupRestFilters({ courseId, academicYearId, examId, employeeId }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ])
        if (cancelled) return
        const rest = restRaw as AnyRow[]
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

        // Angular: auto-select first exam fee type when available
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

  // Angular selectedCollege(): always auto-select first course group (All is manual only for admin).
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
  }, [collegeId, restRows, skipAutoSelect])

  // Angular selectedGroup(): if group===0 use all college years; else filter by group; pick first year.
  useEffect(() => {
    if (!collegeId || skipAutoSelect) return
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          numFrom(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
          (courseGroupId === 0 ||
            numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
      ),
      ['fk_course_year_id', 'courseYearId'],
    ).sort(
      (a, b) =>
        Number(a.cy_sort_order ?? a.year_order ?? 0) - Number(b.cy_sort_order ?? b.year_order ?? 0),
    )
    setCourseYearId(years[0] ? numFrom(years[0], ['fk_course_year_id', 'courseYearId']) : 0)
  }, [courseGroupId, collegeId, restRows, skipAutoSelect])

  async function handleGetReport() {
    // Angular getDetails(): form.valid (course, AY, exam, examType, college, group, year)
    if (!courseId || !academicYearId || !examId || !collegeId) {
      toastError('Please select all required filters')
      return
    }
    if (!isAdmin && (!courseGroupId || !courseYearId)) {
      toastError('Please select Course Group and Course Year')
      return
    }
    setLoading(true)
    clearResults()
    try {
      const rows = await getGroupWiseFinalResults({
        isReevaluation,
        examId,
        collegeId,
        courseId,
        courseGroupId: courseGroupId || 0,
        courseYearId: courseYearId || 0,
        examTypeCatdetId: examTypeCatdetId || 0,
      })
      // Angular: result[0].filter(x => x.ResultStatus == 'Passed'|'Promoted')
      const filtered = rows.filter((r) => String(r.ResultStatus ?? '') === resultStatus)
      if (filtered.length === 0) {
        toastInfo('No records found')
        return
      }

      const examName =
        strFrom(filtered[0] ?? {}, ['exam_label_name', 'exam_name']) ||
        strFrom(
          exams.find((r) => numFrom(r, ['fk_exam_id', 'examId']) === Number(examId)) ?? {},
          ['exam_name', 'examName'],
        )
      setExamLabel(examName)

      if (courseGroupId === 0 && courseGroups.length > 0) {
        // Angular: one list per course group when group === All
        const buckets: GroupBucket[] = []
        for (const g of courseGroups) {
          const gid = numFrom(g, ['fk_course_group_id', 'courseGroupId'])
          const students = filtered.filter(
            (r) => numFrom(r, ['fk_course_group_id', 'courseGroupId']) === gid,
          )
          if (students.length === 0) continue
          buckets.push({
            groupCode:
              strFrom(g, ['group_code', 'groupCode']) ||
              strFrom(students[0] ?? {}, ['group_code']),
            students,
          })
        }
        setGroupResults(buckets)
      } else {
        // Angular selectedStatus(): filter by selected group
        const byGroup =
          courseGroupId === 0
            ? filtered
            : filtered.filter(
                (r) => numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
              )
        if (byGroup.length === 0) {
          toastInfo('No records found')
          return
        }
        setGroupResults([
          {
            groupCode:
              strFrom(byGroup[0] ?? {}, ['group_code', 'groupCode']) || resultStatus,
            students: byGroup,
          },
        ])
      }
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
    setIsReevaluation(false)
    setRestRows([])
    setExamFeeTypes([])
    setSearchText('')
    clearResults()
  }

  const pageTitle = isReevaluation ? `Re-Evaluation ${title}` : title
  const printGroupCode =
    courseGroupId > 0
      ? strFrom(
          courseGroups.find(
            (r) => numFrom(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
          ) ?? {},
          ['group_code', 'groupCode', 'course_group_code'],
        )
      : ''

  function handlePrint() {
    if (filteredGroups.length === 0) return
    printGroupWiseResultSheets(filteredGroups, {
      title: pageTitle,
      examLabel,
      courseGroupCode: printGroupCode,
      resultStatus,
    })
  }

  return (
    <FilteredPage
      title={pageTitle}
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
            <GlobalFilterField label="Exam" icon={ClipboardList} className="md:col-span-2">
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
                placeholder="Exam"
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
                  ...(isAdmin ? [{ value: '0', label: 'All' }] : []),
                  ...courseGroups.map((r) => ({
                    value: String(numFrom(r, ['fk_course_group_id', 'courseGroupId'])),
                    label: strFrom(r, ['group_code', 'groupCode', 'course_group_code']),
                  })),
                ]}
                placeholder="Course Group"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Year" icon={School}>
              <Select
                value={String(courseYearId)}
                onChange={(v) => {
                  clearResults()
                  setCourseYearId(v ? Number(v) : 0)
                }}
                options={[
                  ...(isAdmin ? [{ value: '0', label: 'All' }] : []),
                  ...courseYears.map((r) => ({
                    value: String(numFrom(r, ['fk_course_year_id', 'courseYearId'])),
                    label: strFrom(r, ['course_year_code', 'courseYearCode']),
                  })),
                ]}
                placeholder="Course Year"
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
              <p className="font-semibold text-foreground">{pageTitle}</p>
              <div className="flex flex-wrap items-center gap-2">
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
                <div key={group.groupCode} className="space-y-2">
                  <p className="text-sm font-semibold text-[#042956]">
                    {group.groupCode} / {resultStatus} ({group.students.length})
                  </p>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {group.students.map((student, i) => (
                      <div
                        key={`${strFrom(student, ['hallticket_number'])}-${i}`}
                        className="rounded border border-border px-2 py-1.5 text-center text-sm"
                      >
                        {strFrom(student, ['hallticket_number', 'hall_ticketno'])}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      }
    />
  )
}
