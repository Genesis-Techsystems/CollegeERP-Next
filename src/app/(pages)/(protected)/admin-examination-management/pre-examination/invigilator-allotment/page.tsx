'use client'

import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  autoAssignInvigilators,
  createExamInvigilationAllotment,
  deactivateExamInvigilationAllotment,
  getUnivExamFiltersRegSup,
  listAcademicYearsByUniversity,
  listActiveColleges,
  listCoursesByUniversity,
  listEmployeesByCollege,
  listExamInvigilationAllotments,
  listExamMastersByCourseAndAy,
  listExamRoomAllotments,
  listExamTimetablesByExam,
  listInvigilatorDesignations,
} from '@/services/pre-examination'

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
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function InvigilatorAllotmentPage() {
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [exams, setExams] = useState<AnyRow[]>([])
  const [examTimetables, setExamTimetables] = useState<AnyRow[]>([])
  const [invigDesgs, setInvigDesgs] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examTimetableId, setExamTimetableId] = useState<number | null>(null)

  const [rooms, setRooms] = useState<AnyRow[]>([])
  const [invigilations, setInvigilations] = useState<AnyRow[]>([])
  const [employees, setEmployees] = useState<AnyRow[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [selectedDesignationId, setSelectedDesignationId] = useState<number | null>(null)
  const [savingAssign, setSavingAssign] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [quickAssignRoomId, setQuickAssignRoomId] = useState<number | null>(null)
  const [employeeId, setEmployeeId] = useState<number>(0)
  const [filterRows, setFilterRows] = useState<AnyRow[]>([])

  useEffect(() => {
    async function loadBase() {
      const empId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
      setEmployeeId(Number.isFinite(empId) ? empId : 0)
      const [clg, desg] = await Promise.all([
        listActiveColleges().catch(() => []),
        listInvigilatorDesignations().catch(() => []),
      ])
      const fRows = await getUnivExamFiltersRegSup(Number.isFinite(empId) ? empId : 0).catch(() => [])
      const c = Array.isArray(clg) ? clg : []
      setColleges(c)
      setInvigDesgs(Array.isArray(desg) ? desg : [])
      setFilterRows(Array.isArray(fRows) ? fRows : [])
      const firstCollegeId = pickNum(c[0], ['collegeId', 'fk_college_id', 'fk_collegeId'])
      if (firstCollegeId > 0) setCollegeId(firstCollegeId)
    }
    loadBase()
  }, [])

  useEffect(() => {
    async function onCollege() {
      setAcademicYears([])
      setCourses([])
      setExams([])
      setExamTimetables([])
      setRooms([])
      setInvigilations([])
      setEmployees([])
      setAcademicYearId(null)
      setCourseId(null)
      setExamId(null)
      setExamTimetableId(null)
      setSelectedRoomId(null)
      setSelectedEmployeeId(null)
      setSelectedDesignationId(null)
      if (!collegeId) return
      const selected = colleges.find(
        (c) => pickNum(c, ['collegeId', 'fk_college_id', 'fk_collegeId']) === Number(collegeId),
      )
      const uniId = pickNum(selected, ['universityId', 'fk_university_id', 'fkUniversityId', 'fk_universityId'])
      const [ays, crs] = uniId
        ? await Promise.all([
            listAcademicYearsByUniversity(uniId).catch(() => []),
            listCoursesByUniversity(uniId).catch(() => []),
          ])
        : [[], []]
      const emp = await listEmployeesByCollege(collegeId).catch(() => [])
      let ay = Array.isArray(ays) ? ays : []
      let co = Array.isArray(crs) ? crs : []
      if ((ay.length === 0 || co.length === 0) && filterRows.length > 0) {
        const scoped = filterRows.filter((r) => {
          const cid = pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId'])
          return cid === 0 || cid === Number(collegeId)
        })
        if (ay.length === 0) {
          ay = dedupeBy(
            scoped.filter((r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) > 0),
            (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']),
          )
        }
        if (co.length === 0) {
          co = dedupeBy(
            scoped.filter((r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) > 0),
            (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']),
          )
        }
      }
      setAcademicYears(ay)
      setCourses(co)
      setEmployees(Array.isArray(emp) ? emp : [])
      const firstAy = pickNum(ay[0], ['academicYearId', 'fk_academic_year_id', 'fk_academicYearId'])
      const firstCourse = pickNum(co[0], ['courseId', 'fk_course_id', 'fk_courseId'])
      if (firstAy > 0) setAcademicYearId(firstAy)
      if (firstCourse > 0) setCourseId(firstCourse)
    }
    onCollege()
  }, [collegeId, colleges])

  useEffect(() => {
    async function onCourseAy() {
      setExams([])
      setExamTimetables([])
      setRooms([])
      setInvigilations([])
      setExamId(null)
      setExamTimetableId(null)
      if (!courseId || !academicYearId) return
      const list = await listExamMastersByCourseAndAy(courseId, academicYearId).catch(() => [])
      let rows = Array.isArray(list) ? list : []
      if (rows.length === 0 && filterRows.length > 0) {
        rows = dedupeBy(
          filterRows.filter(
            (r) =>
              pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === Number(courseId) &&
              pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) === Number(academicYearId) &&
              pickNum(r, ['fk_exam_id', 'examId', 'fk_examId']) > 0,
          ),
          (r) => pickNum(r, ['fk_exam_id', 'examId', 'fk_examId']),
        )
      }
      setExams(rows)
    }
    onCourseAy()
  }, [courseId, academicYearId, filterRows])

  useEffect(() => {
    async function onExam() {
      setExamTimetables([])
      setRooms([])
      setInvigilations([])
      setExamTimetableId(null)
      setSelectedRoomId(null)
      if (!examId) return
      const list = await listExamTimetablesByExam(examId).catch(() => [])
      const rows = (Array.isArray(list) ? list : []).sort(
        (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
      )
      setExamTimetables(rows)
    }
    onExam()
  }, [examId])

  useEffect(() => {
    async function onTimetable() {
      setRooms([])
      setInvigilations([])
      setSelectedRoomId(null)
      if (!examTimetableId || !collegeId || !examId) return
      const [ra, ia] = await Promise.all([
        listExamRoomAllotments(collegeId, examId, examTimetableId).catch(() => []),
        listExamInvigilationAllotments(examTimetableId, collegeId).catch(() => []),
      ])
      setRooms(Array.isArray(ra) ? ra : [])
      setInvigilations(Array.isArray(ia) ? ia : [])
    }
    onTimetable()
  }, [examTimetableId, collegeId, examId])

  const byRoom = useMemo(() => {
    const map = new Map<number, AnyRow[]>()
    for (const i of invigilations) {
      const id = Number(i.roomId ?? i.room?.roomId ?? 0)
      if (!id) continue
      const arr = map.get(id) ?? []
      arr.push(i)
      map.set(id, arr)
    }
    return map
  }, [invigilations])

  const selectedCollege = colleges.find(
    (c) => pickNum(c, ['collegeId', 'fk_college_id', 'fk_collegeId']) === Number(collegeId),
  )
  const selectedCourse = courses.find((c) => pickNum(c, ['courseId', 'fk_course_id', 'fk_courseId']) === Number(courseId))
  const selectedExam = exams.find((e) => pickNum(e, ['examId', 'fk_exam_id', 'fk_examId']) === Number(examId))
  const selectedTimetable = examTimetables.find((t) => pickNum(t, ['examTimetableId', 'exam_timetable_id']) === Number(examTimetableId))
  const selectedRoom = rooms.find((r) => Number(r.roomId ?? 0) === Number(selectedRoomId ?? 0))
  const selectedRoomInvigilations = selectedRoomId ? byRoom.get(Number(selectedRoomId)) ?? [] : []
  const observer = useMemo(() => {
    const all = invigilations.filter(
      (x) => String(x.invgdesignationCatCode ?? '').toUpperCase() === 'OBSERVER',
    )
    return all[0] ?? null
  }, [invigilations])
  const colorByDesignationId = useMemo(() => {
    const colors = ['#03A9F4', '#E91E63', '#1EE939', '#E9D51E', '#B47D15', '#E97C23']
    const map = new Map<number, string>()
    invigDesgs.forEach((d, idx) => {
      const id = Number(d.generalDetailId ?? 0)
      if (id > 0) map.set(id, colors[idx % colors.length])
    })
    return map
  }, [invigDesgs])

  async function refreshAllotments() {
    if (!examTimetableId || !collegeId || !examId) return
    const [ra, ia] = await Promise.all([
      listExamRoomAllotments(collegeId, examId, examTimetableId).catch(() => []),
      listExamInvigilationAllotments(examTimetableId, collegeId).catch(() => []),
    ])
    setRooms(Array.isArray(ra) ? ra : [])
    setInvigilations(Array.isArray(ia) ? ia : [])
  }

  async function onAutoAssign() {
    if (!examTimetableId) return
    setAutoAssigning(true)
    try {
      await autoAssignInvigilators(examTimetableId)
      await refreshAllotments()
      alert('Invigilators auto-assigned successfully')
    } catch (e: any) {
      alert(e?.message ?? 'Auto assign failed')
    } finally {
      setAutoAssigning(false)
    }
  }

  async function onAddInvigilator() {
    const roomId = quickAssignRoomId ?? selectedRoomId
    if (!roomId || !selectedEmployeeId || !selectedDesignationId || !examTimetableId || !collegeId) return
    setSavingAssign(true)
    try {
      await createExamInvigilationAllotment({
        roomId,
        invigilatorEmpId: selectedEmployeeId,
        invgdesignationCatId: selectedDesignationId,
        examTimeTableId: examTimetableId,
        examTimetableId,
        collegeId,
        isActive: true,
      })
      await refreshAllotments()
      setSelectedEmployeeId(null)
      setSelectedDesignationId(null)
      setQuickAssignRoomId(null)
    } catch (e: any) {
      alert(e?.message ?? 'Failed to add invigilator')
    } finally {
      setSavingAssign(false)
    }
  }

  async function onRemoveInvigilator(item: AnyRow) {
    const id = Number(item.examInvgAllotmentId ?? item.examInvigilationAllotmentId ?? 0)
    if (!id) return
    try {
      await deactivateExamInvigilationAllotment(id, { ...item, isActive: false })
      await refreshAllotments()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to remove invigilator')
    }
  }

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Invigilation Allotment</h2>
        </div>
        <div className="px-3 py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
              <SelectContent>
                {colleges.map((c, i) => {
                  const id = pickNum(c, ['collegeId', 'fk_college_id', 'fk_collegeId'])
                  return (
                    <SelectItem key={`c-${id || i}`} value={String(id)}>
                      {pickText(c, ['collegeCode', 'college_code', 'collegeName', 'college_name']) || '-'}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year</Label>
            <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
              <SelectContent>
                {academicYears.map((a, i) => {
                  const id = pickNum(a, ['academicYearId', 'fk_academic_year_id', 'fk_academicYearId'])
                  return (
                    <SelectItem key={`a-${id || i}`} value={String(id)}>
                      {pickText(a, ['academicYear', 'academic_year']) || '-'}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c, i) => {
                  const id = pickNum(c, ['courseId', 'fk_course_id', 'fk_courseId'])
                  return (
                    <SelectItem key={`co-${id || i}`} value={String(id)}>
                      {pickText(c, ['courseCode', 'course_code', 'courseName', 'course_name']) || '-'}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger>
              <SelectContent>
                {exams.map((e, i) => {
                  const id = pickNum(e, ['examId', 'fk_exam_id', 'fk_examId'])
                  return (
                    <SelectItem key={`e-${id || i}`} value={String(id)}>
                      {pickText(e, ['examName', 'exam_name']) || '-'}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam Timetable</Label>
            <Select value={examTimetableId ? String(examTimetableId) : undefined} onValueChange={(v) => setExamTimetableId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Timetable" /></SelectTrigger>
              <SelectContent>
                {examTimetables.map((t, i) => {
                  const id = pickNum(t, ['examTimetableId', 'exam_timetable_id'])
                  return (
                    <SelectItem key={`t-${id || i}`} value={String(id)}>
                      {String(t.examDate ?? '').slice(0, 10)} ({pickText(t, ['examSessionName', 'exam_session_name']) || '-'})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {examTimetableId && (
        <>
          <div className="app-card p-3 flex items-center justify-between">
            <div className="text-[12px]">
              Exam Allocated Rooms List ({selectedCollege?.collegeCode ?? ''} / {selectedCourse?.courseCode ?? ''} / {selectedExam?.examName ?? ''} / {selectedTimetable?.examDate ? String(selectedTimetable.examDate).slice(0, 10) : ''})
            </div>
            <Button className="h-8 text-[12px]" onClick={onAutoAssign} disabled={autoAssigning}>
              {autoAssigning ? 'Assigning...' : 'Auto Assign Invigilators'}
            </Button>
          </div>

          <div className="app-card p-4">
            <div className="text-[12px] mb-3">
              <span className="text-blue-700 font-medium">INVIGILATOR DESIGNATIONS:</span>{' '}
              {invigDesgs.map((d) => d.generalDetailCode).join(', ')}
            </div>
            <div className="mb-4 rounded border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-[12px]">
              <span className="font-semibold text-fuchsia-700">OBSERVER:</span>{' '}
              {observer
                ? `${observer.invigilatorEmpName ?? '-'} (${observer.invigilatorEmpNumber ?? '-'})`
                : 'currently no observer'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {rooms.map((r, i) => {
                const roomId = Number(r.roomId ?? 0)
                const list = byRoom.get(roomId) ?? []
                return (
                  <button
                    key={`room-${roomId || i}`}
                    type="button"
                    onClick={() => setSelectedRoomId(roomId)}
                    className={`rounded-md border p-3 text-left transition-colors ${
                      Number(selectedRoomId) === roomId ? 'border-blue-600 bg-blue-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-[13px]">{r.roomName ?? r.roomCode ?? '-'}</div>
                    <div className="text-[11px] text-muted-foreground">{r.buildingCode ?? ''} {r.blockCode ? ` / ${r.blockCode}` : ''} {r.floorNo ? ` / ${r.floorNo}` : ''}</div>
                    <div className="mt-2 space-y-1 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-600">INVIGILATOR</span>
                        <button
                          type="button"
                          className="text-[11px] text-blue-700 underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRoomId(roomId)
                            setQuickAssignRoomId(roomId)
                          }}
                        >
                          + Add
                        </button>
                      </div>
                      {list.filter((x) => String(x.invgdesignationCatCode).toUpperCase() === 'INVIGILATOR').map((x, idx) => (
                        <div
                          key={`inv-${idx}`}
                          className="rounded border px-2 py-1"
                          style={{
                            backgroundColor: `${colorByDesignationId.get(Number(x.invgdesignationCatId ?? 0)) ?? '#E2E8F0'}22`,
                            borderColor: colorByDesignationId.get(Number(x.invgdesignationCatId ?? 0)) ?? '#CBD5E1',
                          }}
                        >
                          {x.invigilatorEmpName} <span className="text-muted-foreground">({x.invigilatorEmpNumber})</span>
                        </div>
                      ))}
                      {list.filter((x) => String(x.invgdesignationCatCode).toUpperCase() === 'INVIGILATOR').length === 0 && (
                        <div className="text-muted-foreground">No invigilator allocated</div>
                      )}
                    </div>
                    {r.examRoomAllotmentId == null && (
                      <div className="mt-2 text-[11px] text-amber-700">This room not allocated to timetable</div>
                    )}
                  </button>
                )
              })}
              {rooms.length === 0 && <div className="text-[12px] text-muted-foreground">No allocated rooms found</div>}
            </div>
          </div>

          {selectedRoomId && (
            <div className="app-card p-4 space-y-3">
              <div className="text-[13px] font-semibold">
                Manage Room: {selectedRoom?.roomName ?? selectedRoom?.roomCode ?? `Room ${selectedRoomId}`}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="space-y-1 md:col-span-5">
                  <Label>Employee</Label>
                  <Select
                    value={selectedEmployeeId ? String(selectedEmployeeId) : undefined}
                    onValueChange={(v) => setSelectedEmployeeId(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e, idx) => (
                        <SelectItem key={`emp-${e.employeeId ?? idx}`} value={String(e.employeeId)}>
                          {e.firstName ?? e.employeeName ?? '-'} ({e.empNumber ?? e.employeeCode ?? 'NA'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-4">
                  <Label>Designation</Label>
                  <Select
                    value={selectedDesignationId ? String(selectedDesignationId) : undefined}
                    onValueChange={(v) => setSelectedDesignationId(Number(v))}
                  >
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                    <SelectContent>
                      {invigDesgs
                        .filter((d) => String(d.generalDetailCode ?? '').toUpperCase() === 'INVIGILATOR')
                        .map((d, idx) => (
                        <SelectItem key={`desg-${d.generalDetailId ?? idx}`} value={String(d.generalDetailId)}>
                          {d.generalDetailCode ?? d.generalDetailDisplayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Button className="h-8 text-[12px] w-full" onClick={onAddInvigilator} disabled={savingAssign}>
                    {savingAssign ? 'Saving...' : '+ Add Invigilator'}
                  </Button>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-1 text-left w-12">#</th>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Emp No</th>
                      <th className="px-2 py-1 text-left">Designation</th>
                      <th className="px-2 py-1 text-left w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRoomInvigilations.map((x, idx) => (
                      <tr key={`sel-inv-${x.examInvgAllotmentId ?? idx}`} className="border-t">
                        <td className="px-2 py-1">{idx + 1}</td>
                        <td className="px-2 py-1">{x.invigilatorEmpName ?? '-'}</td>
                        <td className="px-2 py-1">{x.invigilatorEmpNumber ?? '-'}</td>
                        <td className="px-2 py-1">{x.invgdesignationCatCode ?? '-'}</td>
                        <td className="px-2 py-1">
                          <Button variant="ghost" size="sm" onClick={() => onRemoveInvigilator(x)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {selectedRoomInvigilations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-2 text-muted-foreground">No staff allocated</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

