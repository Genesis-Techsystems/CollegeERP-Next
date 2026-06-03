'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { getExamTimetableDetails } from '@/services/examination'
import { getUnivExamFiltersByType, getUnivExamRestNoTtBundle } from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const toYmd = (value: string | Date) => {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}
const dayLabel = (ymd: string) => new Date(ymd).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
const longDate = (ymd: string) => new Date(ymd).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })

export default function CollegeExamTimetableViewPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [timeRows, setTimeRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])),
    [baseRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => pickNum(r, ['fk_college_id', 'collegeId'])),
    [restRows],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId']),
      ),
    [restRows, collegeId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId),
        ),
        (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId']),
      ),
    [restRows, collegeId, courseYearId],
  )
  const selectedExam = useMemo(
    () => exams.find((e) => pickNum(e, ['fk_exam_id', 'examId']) === Number(examId)) ?? null,
    [exams, examId],
  )

  const dateArray = useMemo(() => {
    const fromRaw = pickText(selectedExam, ['from_date', 'fromDate'])
    const toRaw = pickText(selectedExam, ['to_date', 'toDate'])
    if (!fromRaw || !toRaw) return []
    const dates: string[] = []
    const cur = new Date(fromRaw)
    const end = new Date(toRaw)
    if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime())) return []
    while (cur <= end) {
      dates.push(toYmd(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }, [selectedExam])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersByType(employeeId, 'ALL').catch(() => [])
        setBaseRows(Array.isArray(rows) ? rows : [])
        const firstCourse = dedupeBy(rows, (r) => pickNum(r, ['fk_course_id', 'courseId']))[0]
        if (firstCourse) setCourseId(pickNum(firstCourse, ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    const sortedYears = [...academicYears].sort((a, b) => Number(b.is_curr_ay ?? 0) - Number(a.is_curr_ay ?? 0))
    const first = sortedYears[0]
    if (first) setAcademicYearId(pickNum(first, ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const bundle = await getUnivExamRestNoTtBundle({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => ({ restFilters: [], regulations: [] }))
      const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : []
      setRestRows(rest)
      if (rest[0]) setCollegeId(pickNum(rest[0], ['fk_college_id', 'collegeId']))
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    setCourseYearId(null)
  }, [collegeId, examId])

  useEffect(() => {
    async function loadTimetable() {
      if (!courseId || !courseYearId || !examId) return
      setLoading(true)
      try {
        const rows = await getExamTimetableDetails(courseYearId, courseId, examId).catch(() => [])
        const list = Array.isArray(rows) ? rows : []
        setTimeRows(
          list.filter((r) => {
            const cId = pickNum(r, ['collegeId', 'fk_college_id'])
            return !collegeId || !cId || cId === Number(collegeId)
          }),
        )
      } finally {
        setLoading(false)
      }
    }
    void loadTimetable()
  }, [courseId, courseYearId, examId, collegeId])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="College Exam Timetable View" subtitle="View college examination timetables" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">College Exam Timetable View</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode']) }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])), label: pickText(a, ['academic_year', 'academicYear']) }))}
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam Master</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(v ? Number(v) : null)}
                  options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>College</Label>
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => setCollegeId(v ? Number(v) : null)}
                  options={colleges.map((c) => ({ value: String(pickNum(c, ['fk_college_id', 'collegeId'])), label: pickText(c, ['college_code', 'collegeCode']) }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={courseYears.map((y) => ({ value: String(pickNum(y, ['fk_course_year_id', 'courseYearId'])), label: pickText(y, ['course_year_code', 'courseYearCode']) }))}
                  placeholder="Select Course Year"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {Boolean(courseYearId) && (
        <div className="app-card p-3 space-y-2">
          <div className="text-[13px] font-semibold text-[hsl(var(--primary))]">
            {pickText(courses.find((x) => pickNum(x, ['fk_course_id', 'courseId']) === Number(courseId)), ['course_code', 'courseCode'])} /{' '}
            {pickText(academicYears.find((x) => pickNum(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId)), ['academic_year', 'academicYear'])} /{' '}
            {pickText(courseYears.find((x) => pickNum(x, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)), ['course_year_code', 'courseYearCode'])}
            {' - '}
            {pickText(selectedExam, ['exam_name', 'examName'])}
          </div>

          <div className="text-[12px] text-right">
            <span className="inline-block border px-1 bg-[#99deff] mr-1">M</span> MORNING{' '}
            <span className="inline-block border px-1 bg-[#fff258] ml-2 mr-1">A</span> AFTERNOON
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 border-r min-w-[90px]">Branch</th>
                  {dateArray.map((d) => (
                    <th key={d} className="px-2 py-1 border-r min-w-[180px] text-center">
                      <div>{longDate(d)}</div>
                      <div className="text-blue-700">({dayLabel(d)})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courseGroups.map((g) => {
                  const gId = pickNum(g, ['fk_course_group_id', 'courseGroupId'])
                  return (
                    <tr key={`g-${gId}`} className="border-t align-top">
                      <td className="px-2 py-1 border-r text-center text-blue-700 font-medium">
                        {pickText(g, ['group_code', 'groupCode'])}
                      </td>
                      {dateArray.map((d) => {
                        const dayRows = timeRows.filter(
                          (r) =>
                            pickNum(r, ['courseGroupId', 'fk_course_group_id']) === gId &&
                            toYmd(pickText(r, ['examDate', 'exam_date'])) === d,
                        )
                        return (
                          <td key={`${gId}-${d}`} className="px-2 py-1 border-r">
                            {dayRows.length === 0 ? (
                              <div className="text-center text-muted-foreground">-</div>
                            ) : (
                              <div className="space-y-1">
                                {dayRows.map((r, i) => {
                                  const session = pickText(r, ['examsessioninCatCode', 'examSessionName']).toUpperCase()
                                  const bg = session === 'AFTERNOON' ? 'bg-[#fff258]' : 'bg-[#99deff]'
                                  const examType = pickText(r, ['examTypeCatCode', 'examtypeCatCode']).toUpperCase()
                                  let typeChar = 'R'
                                  if (examType.startsWith('SUP')) typeChar = 'S'
                                  else if (examType.startsWith('INT')) typeChar = 'I'
                                  const subjectKey = pickNum(r, ['subjectId', 'fk_subject_id'])
                                  const sessionKey = pickText(r, ['examsessioninCatCode', 'examSessionName']) || 'NA'
                                  const batchKey = pickText(r, ['examLabBatchName']) || 'NA'
                                  return (
                                    <div key={`sub-${gId}-${d}-${subjectKey}-${sessionKey}-${batchKey}-${i}`} className={`px-1 py-0.5 border ${bg} flex items-center justify-between`}>
                                      <span>
                                        {pickText(r, ['subjectCode', 'subject_code'])}
                                        {pickText(r, ['examLabBatchName']) ? ` (${pickText(r, ['examLabBatchName'])})` : ''}
                                      </span>
                                      <span className="text-blue-700 font-semibold">{typeChar}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {courseGroups.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={Math.max(2, dateArray.length + 1)} className="px-2 py-6 text-center text-muted-foreground">
                      {loading ? 'Loading timetable...' : 'No timetable data found for selected filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

