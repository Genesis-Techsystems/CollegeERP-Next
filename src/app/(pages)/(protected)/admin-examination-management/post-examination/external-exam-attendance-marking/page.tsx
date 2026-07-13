'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select as CommonSelect } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import { FilterCard } from '@/common/components/feedback'
import {
  getExternalAttendanceFilters,
  getExternalAttendanceRestFilters,
  getExternalAttendanceSubjects,
  listActiveRooms,
  listExternalAttendanceStudents,
  saveInternalAttendance,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

type AttendanceRow = {
  examStdDetId: number
  examId: number
  studentId: number
  hallticketNumber: string
  groupCode: string
  firstName: string
  subjectCode: string
  subjectName: string
  attendanceTakenEmpId: number
  attendanceTakenDate: string
  isPresent: boolean
  isufm: boolean
}

type MarkRendererParams = ICellRendererParams<AttendanceRow> & {
  onTogglePresent: (examStdDetId: number, value: boolean) => void
}

type UfmRendererParams = ICellRendererParams<AttendanceRow> & {
  onToggleUfm: (examStdDetId: number, value: boolean) => void
}

function MarkRenderer(params: MarkRendererParams) {
  return (
    <label className="inline-flex items-center gap-2 text-[12px]">
      <Checkbox
        checked={Boolean(params.data?.isPresent)}
        onCheckedChange={(v) => params.data && params.onTogglePresent(params.data.examStdDetId, Boolean(v))}
      />
      <span>{params.data?.isPresent ? 'Present' : 'Absent'}</span>
    </label>
  )
}

function UfmRenderer(params: UfmRendererParams) {
  return (
    <Checkbox
      checked={Boolean(params.data?.isufm)}
      onCheckedChange={(v) => params.data && params.onToggleUfm(params.data.examStdDetId, Boolean(v))}
    />
  )
}

function dedupeBy<T extends AnyRow>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of arr) {
    const value = String(row?.[key] ?? '')
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(row)
  }
  return out
}

function normalizeRows(rows: AnyRow[]): AttendanceRow[] {
  return rows.map((r, i) => ({
    examStdDetId: Number(r.pk_exam_std_det_id ?? i + 1),
    examId: Number(r.fk_exam_id ?? 0),
    studentId: Number(r.fk_student_id ?? 0),
    hallticketNumber: String(r.hallticket_number ?? r.roll_number ?? '-'),
    groupCode: String(r.group_code ?? '-'),
    firstName: String(r.student_name ?? r.firstName ?? '-'),
    subjectCode: String(r.subject_code ?? '-'),
    subjectName: String(r.subject_name ?? '-'),
    attendanceTakenEmpId: Number(r.fk_attendance_taken_emp_id ?? 0),
    attendanceTakenDate: String(r.attendance_taken_date ?? ''),
    isPresent: r.is_present == null ? true : Boolean(r.is_present),
    isufm: Boolean(r.isufm),
  }))
}

export default function ExternalExamAttendanceMarkingPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [roomRows, setRoomRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AttendanceRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(0)
  const [courseYearId, setCourseYearId] = useState<number | null>(0)
  const [roomId, setRoomId] = useState<number | null>(0)
  const [examDate, setExamDate] = useState('')

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () => dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id'),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (x) =>
            Number(x.fk_course_id) === Number(courseId) &&
            Number(x.fk_academic_year_id) === Number(academicYearId),
        ),
        'fk_exam_id',
      ),
    [allFilters, courseId, academicYearId],
  )
  const regulations = useMemo(() => dedupeBy(subjectRows, 'fk_regulation_id'), [subjectRows])
  const subjects = useMemo(
    () => dedupeBy(subjectRows.filter((x) => Number(x.fk_regulation_id) === Number(regulationId)), 'fk_subject_id'),
    [subjectRows, regulationId],
  )
  const courseGroups = useMemo(() => [0, ...dedupeBy(restRows, 'fk_course_group_id').map((x) => Number(x.fk_course_group_id))], [restRows])
  const courseYears = useMemo(() => {
    const source = Number(courseGroupId) > 0 ? restRows.filter((x) => Number(x.fk_course_group_id) === Number(courseGroupId)) : restRows
    return [0, ...dedupeBy(source, 'fk_course_year_id').map((x) => Number(x.fk_course_year_id))]
  }, [restRows, courseGroupId])
  const rooms = useMemo(
    () => [0, ...dedupeBy(roomRows, 'roomId').map((x) => Number(x.roomId)).filter((x) => Number.isFinite(x) && x >= 0)],
    [roomRows],
  )
  const courseOptions = useMemo(
    () => courses.map((x) => ({ value: String(x.fk_course_id), label: String(x.course_code ?? '-') })),
    [courses],
  )
  const academicYearOptions = useMemo(
    () => academicYears.map((x) => ({ value: String(x.fk_academic_year_id), label: String(x.academic_year ?? '-') })),
    [academicYears],
  )
  const examOptions = useMemo(
    () => exams.map((x) => ({ value: String(x.fk_exam_id), label: String(x.exam_name ?? '-') })),
    [exams],
  )
  const regulationOptions = useMemo(
    () => regulations.map((x) => ({ value: String(x.fk_regulation_id), label: String(x.regulation_code ?? '-') })),
    [regulations],
  )
  const subjectOptions = useMemo(
    () => subjects.map((x) => ({ value: String(x.fk_subject_id), label: `${String(x.subject_name ?? '-')} (${String(x.subject_code ?? '-')})` })),
    [subjects],
  )
  const courseGroupOptions = useMemo(
    () =>
      courseGroups.map((x) => ({
        value: String(x),
        label: x === 0 ? 'All' : String(restRows.find((r) => Number(r.fk_course_group_id) === x)?.group_code ?? `Group ${x}`),
      })),
    [courseGroups, restRows],
  )
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((x) => ({
        value: String(x),
        label: x === 0 ? 'All' : String(restRows.find((r) => Number(r.fk_course_year_id) === x)?.course_year_code ?? `Year ${x}`),
      })),
    [courseYears, restRows],
  )
  const roomOptions = useMemo(
    () =>
      rooms.map((x) => ({
        value: String(x),
        label: x === 0 ? 'All' : String(roomRows.find((r) => Number(r.roomId) === x)?.roomCode ?? `Room ${x}`),
      })),
    [rooms, roomRows],
  )

  useEffect(() => {
    async function loadInitial() {
      setLoadingFilters(true)
      try {
        const [filters, roomsData] = await Promise.all([
          getExternalAttendanceFilters(employeeId).catch(() => []),
          listActiveRooms().catch(() => []),
        ])
        setAllFilters(Array.isArray(filters) ? filters : [])
        setRoomRows(Array.isArray(roomsData) ? roomsData : [])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadInitial()
  }, [employeeId])

  useEffect(() => {
    async function loadSubjects() {
      setSubjectRows([])
      setRestRows([])
      if (!courseId || !academicYearId || !examId) return
      const data = await getExternalAttendanceSubjects({ courseId, academicYearId, examId, employeeId }).catch(() => [])
      setSubjectRows(Array.isArray(data) ? data : [])
    }
    void loadSubjects()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    async function loadRest() {
      setRestRows([])
      if (!courseId || !academicYearId || !examId || !regulationId || !subjectId) return
      const data = await getExternalAttendanceRestFilters({
        courseId,
        academicYearId,
        examId,
        regulationId,
        subjectId,
        employeeId,
      }).catch(() => [])
      setRestRows(Array.isArray(data) ? data : [])
    }
    void loadRest()
  }, [courseId, academicYearId, examId, regulationId, subjectId, employeeId])

  useEffect(() => {
    if (courses[0]?.fk_course_id) setCourseId(Number(courses[0].fk_course_id))
  }, [courses])
  useEffect(() => {
    if (academicYears[0]?.fk_academic_year_id) setAcademicYearId(Number(academicYears[0].fk_academic_year_id))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]?.fk_exam_id) setExamId(Number(exams[0].fk_exam_id))
  }, [exams])
  useEffect(() => {
    if (regulations[0]?.fk_regulation_id) setRegulationId(Number(regulations[0].fk_regulation_id))
  }, [regulations])
  useEffect(() => {
    if (subjects[0]?.fk_subject_id) setSubjectId(Number(subjects[0].fk_subject_id))
  }, [subjects])
  useEffect(() => {
    const first = subjects[0]
    const nextDate = String(first?.exam_date ?? '').slice(0, 10)
    setExamDate(nextDate || '')
  }, [subjects])

  const absentees = useMemo(() => rows.filter((r) => !r.isPresent), [rows])
  const allPresent = useMemo(() => rows.length > 0 && rows.every((r) => r.isPresent), [rows])
  const selectedExam = useMemo(() => exams.find((x) => Number(x.fk_exam_id) === Number(examId)), [exams, examId])
  const selectedCourse = useMemo(() => courses.find((x) => Number(x.fk_course_id) === Number(courseId)), [courses, courseId])
  const selectedRoom = useMemo(() => roomRows.find((x) => Number(x.roomId) === Number(roomId)), [roomRows, roomId])
  const examTypeText = useMemo(() => {
    const isInternal = Boolean(selectedExam?.is_internal_exam)
    const isRegular = Boolean(selectedExam?.is_regular_exam)
    const isSupply = Boolean(selectedExam?.is_supply_exam)
    if (isInternal && !isRegular && !isSupply) return 'Internal'
    if (!isInternal && isRegular && !isSupply) return 'Regular'
    if (!isInternal && !isRegular && isSupply) return 'Supple'
    if (!isInternal && isRegular && isSupply) return 'Regular / Supple'
    return ''
  }, [selectedExam])
  const onTogglePresent = (examStdDetId: number, value: boolean) => {
    setRows((prev) => prev.map((r) => (r.examStdDetId === examStdDetId ? { ...r, isPresent: value } : r)))
  }
  const onToggleUfm = (examStdDetId: number, value: boolean) => {
    setRows((prev) => prev.map((r) => (r.examStdDetId === examStdDetId ? { ...r, isufm: value } : r)))
  }
  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !regulationId || !subjectId || !examDate) return
    setLoadingList(true)
    setHasFetched(true)
    try {
      const data = await listExternalAttendanceStudents({
        examId,
        courseId,
        courseGroupId: courseGroupId ?? 0,
        courseYearId: courseYearId ?? 0,
        roomId: roomId ?? 0,
        regulationId,
        examDate,
        subjectId,
      }).catch(() => [])
      setRows(normalizeRows(Array.isArray(data) ? data : []))
    } finally {
      setLoadingList(false)
    }
  }

  async function onSave() {
    if (rows.length === 0) return
    setSaving(true)
    try {
      await saveInternalAttendance(
        rows.map((r) => ({
          examStdDetId: r.examStdDetId,
          examId: r.examId,
          studentId: r.studentId,
          hallticketNo: r.hallticketNumber,
          attendanceTakenEmpId: r.attendanceTakenEmpId,
          attendanceTakenDate: r.attendanceTakenDate,
          subjectName: r.subjectName,
          isPresent: r.isPresent,
          isufm: r.isufm,
          isActive: true,
        })),
      )
      toastSuccess('Attendance saved successfully')
      await onGetList()
    } catch (error) {
      toastError(error, 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<AttendanceRow>[]>(
    () => [
      { headerName: 'SI.No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hall Ticket No', minWidth: 150 },
      { field: 'groupCode', headerName: 'Group', minWidth: 90, flex: 0 },
      { field: 'firstName', headerName: 'Student Name', minWidth: 180, flex: 1 },
      {
        headerName: 'Subject',
        minWidth: 140,
        valueGetter: (p: any) => {
          const code = p.data?.subjectCode ?? '-'
          const name = p.data?.subjectName ?? '-'
          return `${code} - ${name}`
        },
      },
      { headerName: 'Status', minWidth: 110, flex: 0, valueGetter: (p: any) => (p.data?.isPresent ? 'Present' : 'Absent') },
      {
        headerName: 'Mark',
        minWidth: 130,
        flex: 0,
        cellRenderer: MarkRenderer,
        cellRendererParams: { onTogglePresent },
      },
      {
        headerName: 'MalPractice',
        minWidth: 120,
        flex: 0,
        cellRenderer: UfmRenderer,
        cellRendererParams: { onToggleUfm },
      },
    ],
    [onTogglePresent, onToggleUfm],
  )

  return (
    <PageContainer className="space-y-4">
      <h1 className="text-[18px] font-semibold leading-tight text-foreground">External Exam Attendance Marking</h1>

      <FilterCard title={<span className="text-[14px] font-semibold leading-tight">External Exam Attendance Marking</span>}>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course</Label><CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Year</Label><CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYearOptions} placeholder="Exam Year" searchable /></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam</Label><CommonSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><CommonSelect value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} placeholder="Regulation" searchable /></div>
          <div className="space-y-1 md:col-span-5"><Label>Subject</Label><CommonSelect value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(v ? Number(v) : null)} options={subjectOptions} placeholder="Subject" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group</Label><CommonSelect value={courseGroupId === null ? '0' : String(courseGroupId)} onChange={(v) => setCourseGroupId(Number(v || 0))} options={courseGroupOptions} placeholder="Course Group" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year</Label><CommonSelect value={courseYearId === null ? '0' : String(courseYearId)} onChange={(v) => setCourseYearId(Number(v || 0))} options={courseYearOptions} placeholder="Course Year" searchable /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Date</Label><Input className="h-8 text-[12px]" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Room</Label><CommonSelect value={roomId === null ? '0' : String(roomId)} onChange={(v) => setRoomId(Number(v || 0))} options={roomOptions} placeholder="Room" searchable /></div>
          <div className="md:col-span-1"><Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loadingList}>{loadingList ? 'Loading...' : 'Get List'}</Button></div>
        </div>
      </FilterCard>

      {hasFetched && (
        <div className="space-y-3">
          <div className="app-card overflow-hidden">
            <div className="border-b border-[#c3d9ff] bg-muted/40 px-3 py-2 text-[22px] leading-none text-[#315f8a]">◉</div>
            <div className="border-2 border-[#c3d9ff] bg-card p-2">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px] text-slate-600">
                  <p>
                    {selectedExam?.exam_name ?? '-'} {examTypeText ? <span className="text-blue-700">({examTypeText})</span> : null}
                  </p>
                  <p>
                    {selectedCourse?.course_code ?? '-'} {examDate ? <span className="text-blue-700">({examDate})</span> : null}
                  </p>
                  <p>
                    Room : <span className="text-slate-800">{selectedRoom?.roomCode ?? '-'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="app-card overflow-hidden">
            <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-12">
              <div className="lg:col-span-9">
                <TableCard withHeaderBorder={false}>
                  <DataTable
                    rowData={rows}
                    columnDefs={columnDefs}
                    loading={loadingList}
                    pagination
                    toolbar={{
                      search: true,
                      searchPlaceholder: 'Search…',
                      pdfDocumentTitle: 'External Exam Attendance',
                    }}
                    toolbarTrailing={
                      <label className="inline-flex items-center gap-2 text-[12px] shrink-0">
                        <Checkbox checked={allPresent} onCheckedChange={(v) => setRows((prev) => prev.map((r) => ({ ...r, isPresent: Boolean(v) })))} />
                        <span>{allPresent ? 'UnMark All' : 'Mark All'}</span>
                      </label>
                    }
                  />
                </TableCard>
              </div>
              <div className="space-y-3 lg:col-span-3">
                <div className="overflow-hidden rounded border border-[#c3d9ff] bg-card">
                  <h3 className="bg-[#ecf3ff] px-3 py-2 text-center text-[14px] font-semibold uppercase text-slate-700">
                    Absentees : <span className="rounded-full bg-cyan-300 px-2 py-0.5">{absentees.length}</span>
                  </h3>
                  <div className="max-h-[320px] overflow-auto p-3 text-[12px]">
                    {absentees.length === 0 ? (
                      <p className="text-muted-foreground">No absents found.</p>
                    ) : (
                      absentees.map((a) => (
                        <p key={a.examStdDetId} className="mb-1">
                          {a.firstName} (<span className="text-blue-700">{a.hallticketNumber}</span>)
                        </p>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button className="h-8 px-5 text-[12px]" onClick={onSave} disabled={saving || rows.length === 0}>
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

