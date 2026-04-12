'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, Filter } from 'lucide-react'
import {
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  listExamRoomAllotments,
  listExamTimetablesByExam,
} from '@/services/pre-examination'
import { getExamTimetableDetails, listCourseYears } from '@/services/examination'

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

const printActions = [
  'Room Wise Seating Print',
  'Room Subject Counts Print',
  'Group Wise Seating Print',
  'Print Attendance Sheet',
  'Print Stickers',
  'Group-Wise Stickers',
  'Print Invigilator',
  'Cover Slip',
  'Packing Slip',
]

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

  function openSeatAllotStudents(row: AnyRow) {
    const params = new URLSearchParams({
      collegeId: String(collegeId ?? ''),
      courseId: String(courseId ?? ''),
      examId: String(examId ?? ''),
      academicYearId: String(academicYearId ?? ''),
      academicYear: String(
        academicYears.find((a) => Number(a.fk_academic_year_id) === Number(academicYearId))?.academicYear ??
          '',
      ),
      courseCode: String(
        courses.find((c) => Number(c.fk_course_id) === Number(courseId))?.courseCode ??
          courses.find((c) => Number(c.fk_course_id) === Number(courseId))?.course_name ??
          '',
      ),
      examName: String(
        exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.examName ??
          exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.exam_name ??
          '',
      ),
      examTimetableId: String(examTimetableId ?? ''),
      subjectId: String(row.subjectId ?? row.subject_id ?? ''),
      sessionId: String(row.examSessionId ?? row.fk_exam_session_id ?? ''),
      roomCode: String([row.buildingCode, row.blockCode, row.floorName, row.roomCode].filter(Boolean).join(' / ')),
      examDate: String(row.examDate ?? '').slice(0, 10),
      examSession: String(row.examSessionName ?? ''),
      examRoomAllotmentId: String(row.examRoomAllotmentId ?? row.id ?? ''),
    })
    router.push(`/admin-examination-management/pre-examination/exam-scheduling-forms/add-exam-scheduling-forms?${params.toString()}`)
  }

  return (
    <div className="px-6 pb-6 pt-2 space-y-2">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Scheduling Forms</h2>
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
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label>Course</Label>
              <Select
                value={courseId ? String(courseId) : undefined}
                onValueChange={(v) => {
                  setCourseId(Number(v))
                  setAcademicYearId(null)
                  setExamId(null)
                  setCourseYearId(null)
                  setCollegeId(null)
                  setExamTimetableId(null)
                  setRestRows([])
                  setTimetables([])
                  setRoomRows([])
                }}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c, i) => (
                    <SelectItem key={`c-${i}`} value={String(c.fk_course_id)}>
                      {c.course_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year</Label>
              <Select
                value={academicYearId ? String(academicYearId) : undefined}
                onValueChange={(v) => {
                  setAcademicYearId(Number(v))
                  setExamId(null)
                  setCourseYearId(null)
                  setCollegeId(null)
                  setExamTimetableId(null)
                  setRestRows([])
                  setTimetables([])
                  setRoomRows([])
                }}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Exam Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((a, i) => (
                    <SelectItem key={`ay-${i}`} value={String(a.fk_academic_year_id)}>
                      {a.academic_year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 space-y-1">
              <Label>Exam Master</Label>
              <Select
                value={examId ? String(examId) : undefined}
                onValueChange={(v) => {
                  const nextExamId = Number(v)
                  setExamId(nextExamId)
                  void onExamChange(nextExamId)
                }}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Exam Master" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e, i) => (
                    <SelectItem key={`e-${i}`} value={String(e.fk_exam_id)}>
                      {e.exam_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>College</Label>
              <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="College" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c, i) => (
                    <SelectItem key={`cl-${i}`} value={String(c.fk_college_id)}>
                      {c.college_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Exam Timetable</Label>
              <Select
                value={examTimetableId ? String(examTimetableId) : undefined}
                onValueChange={(v) => {
                  const parsed = Number(v)
                  setExamTimetableId(Number.isFinite(parsed) ? parsed : null)
                }}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Exam Timetable" />
                </SelectTrigger>
                <SelectContent>
                  {timetables.map((t, i) => (
                    <SelectItem
                      key={`tt-${i}`}
                      value={String(pickId(t, ['examTimetableId', 'fk_exam_timetable_id', 'exam_timetable_id', 'id']))}
                    >
                      {String(t.examDate ?? '').slice(0, 10)} ({t.examSessionName ?? '-'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="w-full max-w-sm">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="h-8 text-[12px]"
              />
            </div>
            <div className="w-full rounded border border-amber-300 p-3">
              <div className="flex flex-wrap gap-2">
                {printActions.map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    className="h-8 text-[12px]"
                    onClick={() => window.print()}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
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
                    <td className="px-2 py-1">{String(row.examDate ?? '').slice(0, 10) || '-'}</td>
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
    </div>
  )
}

