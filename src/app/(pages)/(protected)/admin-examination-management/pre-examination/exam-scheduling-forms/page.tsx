'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { ChevronDown, Filter } from 'lucide-react'
import { toDateStr } from '@/common/generic-functions'
import {
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listExamRoomAllotments,
  listExamTimetablesByExam,
} from '@/services/pre-examination'
import { getExamTimetableDetails, listCourseYears } from '@/services/examination'
import { PageContainer, PageHeader } from '@/components/layout'
import { useSchedulingFormsPrint, type PrintAllocationRow } from './_print/useSchedulingFormsPrint'
import { useCollegeLogo } from '@/hooks/useCollegeLogo'

type AnyRow = Record<string, any>

const dedupeBy = <T,>(rows: T[], keyFn: (row: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const mapTimetablesFromRestRows = (rows: AnyRow[]): AnyRow[] => {
  const picked = rows
    .map((r) => ({
      examTimetableId: Number(r.examTimetableId ?? r.fk_exam_timetable_id ?? r.exam_timetable_id ?? 0),
      examDate: r.examDate ?? r.exam_date ?? '',
      examSessionName: r.examSessionName ?? r.exam_session_name ?? r.session_name ?? '',
    }))
    .filter((r) => r.examTimetableId > 0)

  return dedupeBy(picked, (r) => Number(r.examTimetableId))
}

const toTime12H = (value: unknown) => {
  const raw = String(value ?? '').trim()
  const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!m) return '-'
  const hour24 = Number(m[1])
  const mins = m[2]
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12}:${mins} ${ampm}`
}

const pickId = (row: AnyRow, keys: string[]) => {
  for (const k of keys) {
    const n = Number(row?.[k])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

export default function ExamSchedulingFormsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hasFetchedList, setHasFetchedList] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [timetables, setTimetables] = useState<AnyRow[]>([])
  const [roomRows, setRoomRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [examTimetableId, setExamTimetableId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => Number(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restRows, (r) => Number(r.fk_college_id)), [restRows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roomRows
    return roomRows.filter((r) => {
      const text = [
        r.examDate,
        r.examSessionName,
        r.buildingCode,
        r.blockCode,
        r.floorName,
        r.roomCode,
      ]
        .map((x) => String(x ?? ''))
        .join(' ')
        .toLowerCase()
      return text.includes(q)
    })
  }, [roomRows, search])

  const canGetList =
    Number.isFinite(Number(examId)) &&
    Number(examId) > 0 &&
    Number.isFinite(Number(collegeId)) &&
    Number(collegeId) > 0 &&
    Number.isFinite(Number(examTimetableId)) &&
    Number(examTimetableId) > 0

  // ── Print context (mirrors Exam Seating Plan Setup) ─────────────────────────
  const selectedTimetable = useMemo(
    () => timetables.find((t) => pickId(t, ['examTimetableId', 'fk_exam_timetable_id', 'exam_timetable_id', 'id']) === Number(examTimetableId)) ?? null,
    [timetables, examTimetableId],
  )
  const ymdOf = (v: unknown) => String(v ?? '').match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ''
  const printExamDate =
    ymdOf(selectedTimetable?.examDate) ||
    ymdOf(roomRows[0]?.examDate) ||
    ymdOf(restRows[0]?.examDate) ||
    toDateStr(selectedTimetable?.examDate ?? '')
  const printSessionId = pickId(roomRows[0] ?? {}, ['examSessionId', 'fk_exam_session_id', 'exam_session_id', 'sessionId']) ||
    pickId(restRows[0] ?? {}, ['examSessionId', 'fk_exam_session_id', 'exam_session_id', 'sessionId'])

  const printExamName =
    String(
      exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.exam_name ??
        exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.examName ??
        '',
    ).trim() || 'Exam'
  const printCourseLabel = String(courses.find((c) => Number(c.fk_course_id) === Number(courseId))?.course_code ?? '').trim()
  const printAyLabel = String(academicYears.find((a) => Number(a.fk_academic_year_id) === Number(academicYearId))?.academic_year ?? '').trim()
  const printHeaderSubtitle = [printCourseLabel, printAyLabel].filter(Boolean).join(' / ')

  const printAllocationRows = useMemo<PrintAllocationRow[]>(
    () =>
      filteredRows.map((r) => ({
        examDate: toDateStr(r.examDate),
        session: String(r.examSessionName ?? ''),
        roomCode: [r.buildingCode, r.blockCode, r.floorName, r.roomCode].filter(Boolean).join(' / ') || '-',
        bookedSeats: Number(r.bookedSeats ?? 0),
        blockedSeats: Number(r.blockedSeats ?? 0),
        availableSeats: Number(r.availableSeats ?? 0),
      })),
    [filteredRows],
  )

  const collegeLogo = useCollegeLogo(collegeId)
  const { printMode, loadingOverlay, printButtons, printView } = useSchedulingFormsPrint({
    courseId,
    examId,
    examTimetableId,
    examDate: printExamDate,
    sessionId: printSessionId,
    examName: printExamName,
    headerSubtitle: printHeaderSubtitle,
    allocationRows: printAllocationRows,
    logoUrl: collegeLogo,
  })

  useEffect(() => {
    async function loadBase() {
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
        setBaseRows(rows)
      } finally {
        setLoading(false)
      }
    }
    void loadBase()
  }, [employeeId])

  async function onExamChange(nextExamId: number) {
    if (!courseId || !academicYearId) return
    setLoading(true)
    try {
      const [rest, tt, cys] = await Promise.all([
        getUnivExamRestNoTt({
          courseId,
          examId: nextExamId,
          academicYearId,
          employeeId,
        }).catch(() => []),
        listExamTimetablesByExam(nextExamId).catch(() => []),
        listCourseYears(courseId).catch(() => []),
      ])
      setRestRows(rest)
      const firstCourseYearId =
        Number(
          (Array.isArray(cys) ? cys[0]?.courseYearId : undefined) ??
            (Array.isArray(cys) ? cys[0]?.fk_course_year_id : undefined) ??
            0,
        ) || null
      setCourseYearId(firstCourseYearId)

      let ttList = Array.isArray(tt) ? tt : []
      if ((!ttList || ttList.length === 0) && firstCourseYearId) {
        const details = await getExamTimetableDetails(firstCourseYearId, courseId, nextExamId).catch(() => [])
        ttList = Array.isArray(details) ? details : []
      }
      setTimetables(ttList.length > 0 ? ttList : mapTimetablesFromRestRows(rest))
      setCollegeId(null)
      setExamTimetableId(null)
      setRoomRows([])
      setHasFetchedList(false)
    } finally {
      setLoading(false)
    }
  }

  async function getList() {
    if (!examId || !collegeId || !examTimetableId) return
    setLoading(true)
    try {
      const rows = await listExamRoomAllotments(collegeId, examId, examTimetableId).catch(() => [])
      const list = Array.isArray(rows) ? rows : []
      setRoomRows(list)
      setHasFetchedList(true)
    } finally {
      setLoading(false)
    }
  }

  function pickAllotId(r: AnyRow): number {
    const id = pickId(r, [
      'examRoomAllotmentId',
      'exam_room_allotment_id',
      'fk_exam_room_allotment_id',
      'examRoomAlotId',
    ])
    return id || pickId(r, ['id'])
  }

  function pickSessionIdForOmr(r: AnyRow): number {
    return pickId(r, [
      'examSessionId',
      'fk_exam_session_id',
      'exam_session_id',
      'sessionId',
      'examsessioninCatCode',
      'exam_session_cat_id',
      'in_session_id',
    ])
  }

  function openSeatAllotStudents(row: AnyRow) {
    const courseRow =
      courses.find((c) => Number(c.fk_course_id) === Number(courseId)) ??
      courses.find((c) => Number(c.courseId) === Number(courseId))
    const courseLabel =
      String(courseRow?.courseCode ?? courseRow?.course_name ?? courseRow?.courseName ?? courseRow?.course_code ?? '').trim() ||
      String(courseRow?.fk_course_id ?? '')
    const params = new URLSearchParams({
      collegeId: String(collegeId ?? ''),
      courseId: String(courseId ?? ''),
      examId: String(examId ?? ''),
      academicYearId: String(academicYearId ?? ''),
      academicYear: String(
        academicYears.find((a) => Number(a.fk_academic_year_id) === Number(academicYearId))?.academicYear ??
          '',
      ),
      courseName: courseLabel,
      courseCode: courseLabel,
      examName: String(
        exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.examName ??
          exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.exam_name ??
          '',
      ),
      examTimetableId: String(examTimetableId ?? ''),
      subjectId: String(row.subjectId ?? row.subject_id ?? ''),
      sessionId: String(pickSessionIdForOmr(row)),
      examType: String(row.examSessionName ?? row.sessionName ?? row.examsessioninCatCode ?? ''),
      roomCode: String([row.buildingCode, row.blockCode, row.floorName, row.roomCode].filter(Boolean).join(' / ')),
      examDate: toDateStr(row.examDate),
      examSession: String(row.examSessionName ?? ''),
      examRoomAllotmentId: String(pickAllotId(row)),
    })
    router.push(`/admin-examination-management/pre-examination/exam-scheduling-forms/add-exam-scheduling-forms?${params.toString()}`)
  }

  // When a print layout is active, replace the page content with it (the AppShell
  // @media print rules hide nav/aside so only this prints).
  if (printMode) return <>{printView}</>

  return (
    <PageContainer className="space-y-4">
      {loadingOverlay}
      <PageHeader title="Exam Scheduling Forms" subtitle="View and manage exam scheduling" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Scheduling Forms</h2>
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
        {(
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label>Course</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  setCourseId(v ? Number(v) : null)
                  setAcademicYearId(null)
                  setExamId(null)
                  setCourseYearId(null)
                  setCollegeId(null)
                  setExamTimetableId(null)
                  setRestRows([])
                  setTimetables([])
                  setRoomRows([])
                }}
                options={courses.map((c) => ({ value: String(c.fk_course_id), label: c.course_code }))}
                placeholder="Course"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year</Label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  setAcademicYearId(v ? Number(v) : null)
                  setExamId(null)
                  setCourseYearId(null)
                  setCollegeId(null)
                  setExamTimetableId(null)
                  setRestRows([])
                  setTimetables([])
                  setRoomRows([])
                }}
                options={academicYears.map((a) => ({ value: String(a.fk_academic_year_id), label: a.academic_year }))}
                placeholder="Exam Year"
              />
            </div>

            <div className="md:col-span-4 space-y-1">
              <Label>Exam Master</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  const nextExamId = v ? Number(v) : null
                  setExamId(nextExamId)
                  if (nextExamId) void onExamChange(nextExamId)
                }}
                options={exams.map((e) => ({ value: String(e.fk_exam_id), label: e.exam_name }))}
                placeholder="Exam Master"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>College</Label>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => setCollegeId(v ? Number(v) : null)}
                options={colleges.map((c) => ({ value: String(c.fk_college_id), label: c.college_code }))}
                placeholder="College"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Exam Timetable</Label>
              <Select
                value={examTimetableId ? String(examTimetableId) : null}
                onChange={(v) => {
                  const parsed = v ? Number(v) : null
                  setExamTimetableId(parsed !== null && Number.isFinite(parsed) ? parsed : null)
                }}
                options={timetables.map((t) => ({ value: String(pickId(t, ['examTimetableId', 'fk_exam_timetable_id', 'exam_timetable_id', 'id'])), label: `${toDateStr(t.examDate)} (${t.examSessionName ?? '-'})` }))}
                placeholder="Exam Timetable"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={getList} disabled={loading || !canGetList} className="h-8 px-3 text-[12px]">
              Get List
            </Button>
          </div>
        </div>
        )}
      </div>

      {hasFetchedList && (
        <div className="app-card p-3 space-y-2">
          <div className="space-y-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-full max-w-sm" />
            {printButtons}
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Exam Date</th>
                  <th className="px-2 py-1 text-left">Exam Session</th>
                  <th className="px-2 py-1 text-left">Room Code</th>
                  <th className="px-2 py-1 text-left">Booked Seats</th>
                  <th className="px-2 py-1 text-left">Blocked Seats</th>
                  <th className="px-2 py-1 text-left">Available Seats</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={`rs-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{toDateStr(row.examDate) || '-'}</td>
                    <td className="px-2 py-1">
                      {row.examSessionName ?? '-'} ({toTime12H(row.sessionStartTime)} - {toTime12H(row.sessionEndTime)})
                    </td>
                    <td className="px-2 py-1">
                      {[row.buildingCode, row.blockCode, row.floorName, row.roomCode].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td className="px-2 py-1">{row.bookedSeats ?? 0}</td>
                    <td className="px-2 py-1">{row.blockedSeats ?? 0}</td>
                    <td className="px-2 py-1">{row.availableSeats ?? 0}</td>
                    <td className="px-2 py-1">
                      {row.isActive ? (
                        <span className="text-emerald-600 font-medium">Active</span>
                      ) : (
                        <span className="text-rose-600 font-medium">InActive</span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        className="text-[hsl(var(--primary))] hover:underline"
                        onClick={() => openSeatAllotStudents(row)}
                      >
                        Seat Allot Students
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

