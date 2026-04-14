'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table/TableCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getInternalAttendanceFilters,
  getInternalAttendanceRestFilters,
  getInternalAttendanceStudents,
  getInternalAttendanceSubjects,
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
  courseYearCode: string
  examTypeCode: string
  isPresent: boolean
  isufm: boolean
  attendanceTakenEmpId: number
  attendanceTakenDate: string
}

function numFrom(row: AnyRow, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function dedupeBy<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const val = String(item?.[key] ?? '')
    if (!val || seen.has(val)) continue
    seen.add(val)
    out.push(item)
  }
  return out
}

function normalizeAttendanceRows(rows: AnyRow[]): AttendanceRow[] {
  return rows.map((r, i) => ({
    examStdDetId: Number(r.pk_exam_std_det_id ?? r.examStdDetId ?? i + 1),
    examId: Number(r.fk_exam_id ?? r.examId ?? 0),
    studentId: Number(r.fk_student_id ?? r.studentId ?? 0),
    hallticketNumber: String(r.hallticketNumber ?? r.roll_number ?? r.rollNumber ?? '-'),
    groupCode: String(r.groupCode ?? r.group_code ?? '-'),
    firstName: String(r.firstName ?? r.studentName ?? '-'),
    subjectCode: String(r.subjectCode ?? r.subject_code ?? '-'),
    subjectName: String(r.subjectName ?? r.subject_name ?? '-'),
    courseYearCode: String(r.course_year_code ?? r.courseYearCode ?? ''),
    examTypeCode: String(r.exam_type ?? r.examtypeCatCode ?? ''),
    isPresent: r.isPresent == null ? true : Boolean(r.isPresent),
    isufm: Boolean(r.isufm),
    attendanceTakenEmpId: Number(r.fk_attendance_taken_emp_id ?? r.attendanceTakenEmpId ?? 0),
    attendanceTakenDate: String(r.attendance_taken_date ?? r.attendanceTakenDate ?? ''),
  }))
}

export default function InternalExamAttendanceMarkingPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const [search, setSearch] = useState('')

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AttendanceRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [labBatchId, setLabBatchId] = useState<number | null>(0)
  const [examDate, setExamDate] = useState('')
  const [invigilatorEmpId, setInvigilatorEmpId] = useState<number | null>(0)
  const [roomId, setRoomId] = useState<number | null>(0)

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () =>
      dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id'),
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

  const colleges = useMemo(() => dedupeBy(restFilters.filter((x) => x.fk_college_id), 'fk_college_id'), [restFilters])
  const courseGroups = useMemo(
    () => dedupeBy(restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId)), 'fk_course_group_id'),
    [restFilters, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId),
        ),
        'fk_course_year_id',
      ),
    [restFilters, collegeId, courseGroupId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        restFilters.filter((x) => (x.flag ?? '') === 'regulations' || Number(x.fk_regulation_id) > 0),
        'fk_regulation_id',
      ),
    [restFilters],
  )
  const subjects = useMemo(() => {
    const filtered = subjectRows.filter((x) => {
      const collegeOk = numFrom(x, 'fk_college_id', 'collegeId') === Number(collegeId)
      const groupOk = numFrom(x, 'fk_course_group_id', 'courseGroupId') === Number(courseGroupId)
      const yearOk = numFrom(x, 'fk_course_year_id', 'courseYearId') === Number(courseYearId)
      const regVal = numFrom(x, 'fk_regulation_id', 'regulationId')
      const regulationOk = regVal === 0 || regVal === Number(regulationId)
      return collegeOk && groupOk && yearOk && regulationOk
    })

    // If strict matching yields no rows, keep a relaxed fallback to prevent
    // empty subjects due to backend key-shape differences.
    const source = filtered.length > 0 ? filtered : subjectRows

    const seen = new Set<number>()
    const out: AnyRow[] = []
    for (const row of source) {
      const sid = numFrom(row, 'fk_subject_id', 'subjectId', 'fk_sub_id')
      if (sid <= 0 || seen.has(sid)) continue
      seen.add(sid)
      out.push(row)
    }
    return out
  }, [subjectRows, collegeId, courseGroupId, courseYearId, regulationId])
  const labBatches = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId) &&
            Number(x.fk_course_year_id) === Number(courseYearId) &&
            Number(x.fk_regulation_id) === Number(regulationId) &&
            Number(x.fk_subject_id) === Number(subjectId) &&
            Number(x.fk_stdbatch_id ?? 0) > 0,
        ),
        'fk_stdbatch_id',
      ),
    [subjectRows, collegeId, courseGroupId, courseYearId, regulationId, subjectId],
  )
  const invigilators = useMemo(
    () => dedupeBy(subjectRows.filter((x) => Number(x.fk_attendance_taken_emp_id ?? x.fk_invgilator_emp_id ?? 0) > 0), 'fk_attendance_taken_emp_id'),
    [subjectRows],
  )
  const rooms = useMemo(
    () => dedupeBy(subjectRows.filter((x) => Number(x.fk_room_id ?? 0) > 0), 'fk_room_id'),
    [subjectRows],
  )

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      try {
        const data = await getInternalAttendanceFilters(employeeId).catch(() => [])
        setAllFilters(Array.isArray(data) ? data : [])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadFilters()
  }, [employeeId])

  useEffect(() => {
    async function loadRest() {
      setRestFilters([])
      setSubjectRows([])
      if (!courseId || !examId || !academicYearId) return
      const data = await getInternalAttendanceRestFilters({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => [])
      setRestFilters(Array.isArray(data) ? data : [])
    }
    void loadRest()
  }, [courseId, examId, academicYearId, employeeId])

  useEffect(() => {
    async function loadSubjects() {
      setSubjectRows([])
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId || !regulationId) return
      const data = await getInternalAttendanceSubjects({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      setSubjectRows(Array.isArray(data) ? data : [])
    }
    void loadSubjects()
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId, employeeId])

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
    if (colleges[0]?.fk_college_id) setCollegeId(Number(colleges[0].fk_college_id))
  }, [colleges])
  useEffect(() => {
    if (courseGroups[0]?.fk_course_group_id) setCourseGroupId(Number(courseGroups[0].fk_course_group_id))
  }, [courseGroups])
  useEffect(() => {
    if (courseYears[0]?.fk_course_year_id) setCourseYearId(Number(courseYears[0].fk_course_year_id))
  }, [courseYears])
  useEffect(() => {
    if (regulations[0]?.fk_regulation_id) setRegulationId(Number(regulations[0].fk_regulation_id))
  }, [regulations])
  useEffect(() => {
    const firstId = Number(subjects[0]?.fk_subject_id ?? subjects[0]?.subjectId ?? subjects[0]?.fk_sub_id ?? 0)
    if (firstId > 0) setSubjectId(firstId)
  }, [subjects])
  useEffect(() => {
    const first = subjects[0]
    const dateRaw = String(first?.exam_date ?? first?.examDate ?? '').trim()
    setExamDate(dateRaw ? dateRaw.slice(0, 10) : '')
  }, [subjects])

  const updateRow = useCallback((examStdDetId: number, patch: Partial<AttendanceRow>) => {
    setRows((prev) => prev.map((r) => (r.examStdDetId === examStdDetId ? { ...r, ...patch } : r)))
  }, [])

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !collegeId || !courseGroupId || !courseYearId || !regulationId || !subjectId) {
      return
    }
    setLoadingList(true)
    setHasFetched(true)
    try {
      const data = await getInternalAttendanceStudents({
        courseId,
        examId,
        academicYearId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        sectionId: 0,
        labBatchId: labBatchId ?? 0,
      }).catch(() => [])
      setRows(normalizeAttendanceRows(Array.isArray(data) ? data : []))
    } finally {
      setLoadingList(false)
    }
  }

  async function onSaveAttendance() {
    if (rows.length === 0) return
    setSaving(true)
    try {
      const payload = rows.map((r) => ({
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
      }))
      await saveInternalAttendance(payload)
      toastSuccess('Attendance saved successfully')
    } catch (err) {
      toastError(err, 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const allMarkedPresent = useMemo(() => rows.length > 0 && rows.every((r) => r.isPresent), [rows])
  const absentees = useMemo(() => rows.filter((r) => !r.isPresent), [rows])
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      `${r.hallticketNumber} ${r.firstName} ${r.groupCode} ${r.subjectCode}`.toLowerCase().includes(q),
    )
  }, [rows, search])

  const columnDefs = useMemo<ColDef<AttendanceRow>[]>(
    () => [
      { headerName: 'SI.No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hall Ticket No', minWidth: 150 },
      { field: 'groupCode', headerName: 'Group', minWidth: 90, flex: 0 },
      { field: 'firstName', headerName: 'Student Name', minWidth: 180, flex: 1 },
      {
        field: 'subjectCode',
        headerName: 'Subject',
        minWidth: 120,
        valueGetter: (p: any) => {
          const code = p.data?.subjectCode ?? '-'
          const name = p.data?.subjectName
          return name ? `${code} - ${name}` : code
        },
      },
      {
        headerName: 'Status',
        minWidth: 110,
        flex: 0,
        valueGetter: (p: any) => (p.data?.isPresent ? 'Present' : 'Absent'),
      },
      {
        headerName: 'Mark',
        minWidth: 140,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AttendanceRow>) => (
          <label className="inline-flex items-center gap-2 text-[12px]">
            <Checkbox
              checked={Boolean(p.data?.isPresent)}
              onCheckedChange={(v) => p.data && updateRow(p.data.examStdDetId, { isPresent: Boolean(v) })}
            />
            <span>{p.data?.isPresent ? 'Present' : 'Absent'}</span>
          </label>
        ),
      },
      {
        headerName: 'MalPractice',
        minWidth: 120,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AttendanceRow>) => (
          <Checkbox
            checked={Boolean(p.data?.isufm)}
            onCheckedChange={(v) => p.data && updateRow(p.data.examStdDetId, { isufm: Boolean(v) })}
          />
        ),
      },
    ],
    [updateRow],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Internal Exam Attendance Marking" subtitle="Post examination attendance workflow" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Internal Exam Attendance Marking</h2>
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
          <div className="px-3 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="space-y-1 md:col-span-2"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))} disabled={loadingFilters}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((x) => <SelectItem key={x.fk_course_id} value={String(x.fk_course_id)}>{x.course_code}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-2"><Label>Exam Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger><SelectContent>{academicYears.map((x) => <SelectItem key={x.fk_academic_year_id} value={String(x.fk_academic_year_id)}>{x.academic_year}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-4"><Label>Exam</Label><Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger><SelectContent>{exams.map((x) => <SelectItem key={x.fk_exam_id} value={String(x.fk_exam_id)}>{x.exam_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-2"><Label>College</Label><Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger><SelectContent>{colleges.map((x) => <SelectItem key={x.fk_college_id} value={String(x.fk_college_id)}>{x.college_code}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-2"><Label>Course Group</Label><Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger><SelectContent>{courseGroups.map((x) => <SelectItem key={x.fk_course_group_id} value={String(x.fk_course_group_id)}>{x.group_code}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-2"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((x) => <SelectItem key={x.fk_course_year_id} value={String(x.fk_course_year_id)}>{x.course_year_code}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((x) => <SelectItem key={x.fk_regulation_id} value={String(x.fk_regulation_id)}>{x.regulation_code}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-6">
              <Label>Subject</Label>
              <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((x, i) => {
                    const sid = numFrom(x, 'fk_subject_id', 'subjectId', 'fk_sub_id')
                    if (!sid) return null
                    return (
                      <SelectItem key={`sub-${sid}-${i}`} value={String(sid)}>
                        {x.subject_name ?? x.subjectName ?? '-'} ({x.subject_code ?? x.subjectCode ?? '-'})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {labBatches.length > 0 && (
              <div className="space-y-1 md:col-span-2"><Label>Lab Batch</Label><Select value={labBatchId === null ? '0' : String(labBatchId)} onValueChange={(v) => setLabBatchId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Lab Batch" /></SelectTrigger><SelectContent><SelectItem value="0">All</SelectItem>{labBatches.map((x) => <SelectItem key={x.fk_stdbatch_id} value={String(x.fk_stdbatch_id)}>{x.labbatch_name ?? x.lab_batch_name}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Date</Label>
              <Input
                className="h-8 text-[12px]"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 md:col-span-4"><Label>Invigilator Employee</Label><Select value={invigilatorEmpId === null ? '0' : String(invigilatorEmpId)} onValueChange={(v) => setInvigilatorEmpId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="0">All</SelectItem>{invigilators.map((x, i) => <SelectItem key={`inv-${x.fk_attendance_taken_emp_id ?? x.fk_invgilator_emp_id ?? i}`} value={String(x.fk_attendance_taken_emp_id ?? x.fk_invgilator_emp_id)}>{x.invigilatorName ?? x.employeeName ?? x.empName ?? x.empNumber ?? `Employee ${i + 1}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1 md:col-span-3"><Label>Room</Label><Select value={roomId === null ? '0' : String(roomId)} onValueChange={(v) => setRoomId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="0">All</SelectItem>{rooms.map((x, i) => <SelectItem key={`room-${x.fk_room_id ?? i}`} value={String(x.fk_room_id)}>{x.room_name ?? x.roomCode ?? x.roomNumber ?? `Room ${i + 1}`}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-1"><Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loadingList}>{loadingList ? 'Loading...' : 'Get List'}</Button></div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="space-y-3">
          <div className="app-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
              <h3 className="text-[15px] font-semibold text-[hsl(var(--primary))]">Mark Exam Attendance</h3>
            </div>
            <div className="p-3 text-[12px] text-slate-700">
              <p>{exams.find((e) => Number(e.fk_exam_id) === Number(examId))?.exam_name ?? '-'}</p>
              <p>{colleges.find((c) => Number(c.fk_college_id) === Number(collegeId))?.college_code ?? '-'} / {courses.find((c) => Number(c.fk_course_id) === Number(courseId))?.course_code ?? '-'}</p>
              <p>Invigilator: {invigilators.find((x) => Number(x.fk_attendance_taken_emp_id ?? x.fk_invgilator_emp_id ?? 0) === Number(invigilatorEmpId))?.invigilatorName ?? 'All'}</p>
              <p>Room: {rooms.find((x) => Number(x.fk_room_id ?? 0) === Number(roomId))?.room_name ?? 'All'}</p>
            </div>
          </div>
          <TableCard
            headerLeft={<Input className="h-8 text-[12px] max-w-sm" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />}
            headerRight={
              <div className="flex items-center gap-3 text-[12px]">
                <label className="inline-flex items-center gap-2"><Checkbox checked={allMarkedPresent} onCheckedChange={(v) => setRows((prev) => prev.map((r) => ({ ...r, isPresent: Boolean(v) })))} /><span>{allMarkedPresent ? 'Unmark All' : 'Mark All'}</span></label>
                <span className="text-slate-600">Absentees: <span className="font-semibold text-[hsl(var(--primary))]">{absentees.length}</span></span>
                <Button className="h-8 text-[12px]" onClick={onSaveAttendance} disabled={saving || rows.length === 0}>{saving ? 'Saving...' : 'Save Attendance'}</Button>
              </div>
            }
          >
            <DataTable rowData={filteredRows} columnDefs={columnDefs} loading={loadingList} pagination />
          </TableCard>
        </div>
      )}
    </PageContainer>
  )
}

