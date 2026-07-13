'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Save } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  addListUnivExamCenterRooms,
  getExamTimetableFilterRows,
  listAllActiveUnivExamCenters,
  listExamSeatStatuses,
  listBlocksByBuilding,
  listBuildingsByUnivExamCenter,
  listFloorsByBlock,
  listRoomsByFilters,
  listUnivExamCenterRoomsByFilters,
  pickUnivExamCenterRoomId,
  updateUnivExamCenterRoom,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function readLocalNumber(keys: string[], fallback = 0): number {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return fallback
  for (const key of keys) {
    const raw = globalThis.localStorage.getItem(key)
    const n = Number(raw ?? '')
    if (Number.isFinite(n) && n > 0) return n
  }
  return fallback
}
function dedupeBy<T>(rows: T[], keyFn: (row: T) => number): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const r of rows) {
    const key = keyFn(r)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

function pickCourseId(row: Row): number {
  return num(row.fk_course_id ?? row.courseId ?? row.course_id ?? row.pk_course_id)
}

function pickAcademicYearId(row: Row): number {
  return num(row.fk_academic_year_id ?? row.academicYearId ?? row.academic_year_id ?? row.pk_academic_year_id)
}

function pickExamId(row: Row): number {
  return num(row.fk_exam_id ?? row.examId ?? row.exam_id ?? row.fk_exam_group_id ?? row.examGroupId ?? row.exam_group_id)
}

function pickCourseLabel(row: Row): string {
  return txt(row.course_code ?? row.courseCode ?? row.course_name ?? row.courseName ?? row.programName)
}

function pickAcademicYearLabel(row: Row): string {
  return txt(row.academic_year ?? row.academicYear ?? row.academicYearName ?? row.academic_year_name)
}

function pickExamLabel(row: Row): string {
  return txt(row.exam_name ?? row.examName ?? row.exam_group_name ?? row.examGroupName ?? row.exam)
}

function makeEditRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-blue-700" onClick={() => onEdit(row)}>
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

export default function UnivExamCenterRoomsPage() {
  const shownEmptyFiltersToastRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(false)

  const [allFilterRows, setAllFilterRows] = useState<Row[]>([])
  const [centers, setCenters] = useState<Row[]>([])
  const [buildings, setBuildings] = useState<Row[]>([])
  const [blocks, setBlocks] = useState<Row[]>([])
  const [floors, setFloors] = useState<Row[]>([])
  const [seatStatuses, setSeatStatuses] = useState<Row[]>([])
  const [existingRooms, setExistingRooms] = useState<Row[]>([])
  const [vacancyRooms, setVacancyRooms] = useState<Row[]>([])
  const [vacancySearch, setVacancySearch] = useState('')
  const [selectedRooms, setSelectedRooms] = useState<Row[]>([])
  const [selectAll, setSelectAll] = useState(false)

  const [showSections, setShowSections] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({ isActive: true, reason: '' })

  const [form, setForm] = useState({
    courseId: '',
    academicYearId: '',
    examId: '',
    univExamcenterId: '',
    buildingId: '',
    blockId: '0',
    floorId: '0',
  })

  const courses = useMemo(() => dedupeBy(allFilterRows, (r) => pickCourseId(r)), [allFilterRows])
  const academicYears = useMemo(
    () => dedupeBy(allFilterRows.filter((r) => pickCourseId(r) === Number(form.courseId)), (r) => pickAcademicYearId(r)),
    [allFilterRows, form.courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilterRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAcademicYearId(r) === Number(form.academicYearId) &&
            r.is_internal_exam !== true,
        ),
        (r) => pickExamId(r),
      ),
    [allFilterRows, form.courseId, form.academicYearId],
  )

  const filteredVacancyRooms = useMemo(() => {
    const q = vacancySearch.trim().toLowerCase()
    if (!q) return vacancyRooms
    return vacancyRooms.filter((r) => txt(r.roomName ?? r.roomCode ?? r.room).toLowerCase().includes(q))
  }, [vacancyRooms, vacancySearch])

  const headingText = useMemo(() => {
    const center = centers.find((c) => num(c.univExamcenterId ?? c.univExamCenterId) === Number(form.univExamcenterId))
    return `${txt(center?.examcenterName ?? center?.examCenterName)}`
  }, [centers, form])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 180, valueGetter: (p) => txt(p.data?.examCenterName) },
      { headerName: 'Building', minWidth: 130, valueGetter: (p) => txt(p.data?.buildingId) },
      { headerName: 'Room Name', minWidth: 130, valueGetter: (p) => txt(p.data?.roomName) },
      { headerName: 'Room Code', minWidth: 120, valueGetter: (p) => txt(p.data?.roomCode) },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  async function loadBaseFilters() {
    const orgId = readLocalNumber(['organizationId', 'orgId', 'orgID'], 1)
    const empId = readLocalNumber(['employeeId', 'empId', 'userId', 'loginUserId'], 0)
    if (!empId) {
      toastError('Employee id not found in session. Please re-login and retry.')
      return
    }
    setLoadingFilters(true)
    try {
      const rows = await getExamTimetableFilterRows({ organizationId: orgId, employeeId: empId })
      setAllFilterRows(Array.isArray(rows) ? rows : [])
      if ((!rows || rows.length === 0) && !shownEmptyFiltersToastRef.current) {
        shownEmptyFiltersToastRef.current = true
        toastError(`No course filters returned (org:${orgId}, emp:${empId}).`)
      }
    } catch (e) {
      toastError(e, 'Failed to load filters')
    } finally {
      setLoadingFilters(false)
    }
  }

  useEffect(() => {
    void loadBaseFilters()
  }, [])

  useEffect(() => {
    void (async () => {
      const [centerRows, statusRows] = await Promise.all([
        listAllActiveUnivExamCenters().catch(() => []),
        listExamSeatStatuses().catch(() => []),
      ])
      setCenters(Array.isArray(centerRows) ? centerRows : [])
      setSeatStatuses(Array.isArray(statusRows) ? statusRows : [])
    })()
  }, [])

  useEffect(() => {
    if (!courses.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: String(pickCourseId(courses[0])) }))
  }, [courses, form.courseId])

  useEffect(() => {
    const v = academicYears[0] ? String(pickAcademicYearId(academicYears[0])) : ''
    setForm((f) => ({ ...f, academicYearId: v, examId: '' }))
  }, [form.courseId, academicYears])

  useEffect(() => {
    const v = exams[0] ? String(pickExamId(exams[0])) : ''
    setForm((f) => ({ ...f, examId: v }))
  }, [form.academicYearId, exams])

  useEffect(() => {
    const v = centers[0] ? String(num(centers[0].univExamcenterId ?? centers[0].univExamCenterId)) : ''
    if (!form.univExamcenterId) setForm((f) => ({ ...f, univExamcenterId: v }))
  }, [centers, form.univExamcenterId])

  useEffect(() => {
    async function loadBuildings() {
      if (!form.univExamcenterId) return
      const rows = await listBuildingsByUnivExamCenter(Number(form.univExamcenterId)).catch(() => [])
      setBuildings(Array.isArray(rows) ? rows : [])
      setForm((f) => ({ ...f, buildingId: '0', blockId: '0', floorId: '0' }))
    }
    void loadBuildings()
  }, [form.univExamcenterId])

  useEffect(() => {
    async function loadBlocks() {
      if (!form.buildingId || form.buildingId === '0') {
        setBlocks([])
        setForm((f) => ({ ...f, blockId: '0', floorId: '0' }))
        return
      }
      const rows = await listBlocksByBuilding(Number(form.buildingId)).catch(() => [])
      setBlocks(Array.isArray(rows) ? rows : [])
      const first = Array.isArray(rows) && rows[0] ? String(num(rows[0].blockId)) : '0'
      setForm((f) => ({ ...f, blockId: first, floorId: '0' }))
    }
    void loadBlocks()
  }, [form.buildingId])

  useEffect(() => {
    async function loadFloors() {
      if (!form.blockId || form.blockId === '0') {
        setFloors([])
        setForm((f) => ({ ...f, floorId: '0' }))
        return
      }
      const rows = await listFloorsByBlock(Number(form.blockId)).catch(() => [])
      setFloors(Array.isArray(rows) ? rows : [])
      const first = Array.isArray(rows) && rows[0] ? String(num(rows[0].floorId)) : '0'
      setForm((f) => ({ ...f, floorId: first }))
    }
    void loadFloors()
  }, [form.blockId])

  function roomName(r: Row) {
    return txt(r.roomName ?? r.roomCode ?? r.room)
  }

  async function getList() {
    if (!form.examId || !form.univExamcenterId) {
      toastError('Course, Academic Year, Exam and Exam Center are required.')
      return
    }
    setLoading(true)
    try {
      const [assigned, available] = await Promise.all([
        listUnivExamCenterRoomsByFilters(Number(form.examId), Number(form.univExamcenterId), Number(form.buildingId)).catch(() => []),
        listRoomsByFilters(Number(form.buildingId), Number(form.blockId || 0), Number(form.floorId || 0)).catch(() => []),
      ])
      const assignedRows = Array.isArray(assigned) ? assigned : []
      const availableRows = Array.isArray(available) ? available : []
      const availableStatusId = num(
        seatStatuses.find((s) => txt(s.generalDetailCode).toLowerCase() === 'available')?.generalDetailId,
      )
      const filteredAvailable =
        availableStatusId > 0
          ? availableRows.filter(
              (r) =>
                num(r.examSeatStatusId ?? r.fk_exam_seat_status_id ?? r.generalDetailId) === availableStatusId ||
                txt(r.examSeatStatusCode ?? r.examSeatStatus).toLowerCase() === 'available',
            )
          : availableRows
      const assignedRoomIds = new Set(assignedRows.map((r) => num(r.roomId)))
      const vacancy = filteredAvailable
        .filter((r) => !assignedRoomIds.has(num(r.roomId ?? r.pk_room_id)))
        .map((r) => ({ ...r, checked: false, isSelected: false }))
      setExistingRooms(assignedRows)
      setVacancyRooms(vacancy)
      setSelectedRooms([])
      setSelectAll(false)
      setShowSections(true)
    } finally {
      setLoading(false)
    }
  }

  function toggleAll(checked: boolean) {
    setSelectAll(checked)
    const next = vacancyRooms.map((r) => ({ ...r, checked, isSelected: checked }))
    setVacancyRooms(next)
    setSelectedRooms(checked ? next : [])
  }

  function toggleOne(roomId: number, checked: boolean) {
    const next = vacancyRooms.map((r) =>
      num(r.roomId ?? r.pk_room_id) === roomId ? { ...r, checked, isSelected: checked } : r,
    )
    setVacancyRooms(next)
    const selected = next.filter((r) => r.isSelected === true)
    setSelectedRooms(selected)
    setSelectAll(selected.length > 0 && selected.length === next.length)
  }

  async function onSaveSelected() {
    if (!selectedRooms.length) {
      toastError('Select at least one room.')
      return
    }
    const examRow = exams.find((e) => pickExamId(e) === Number(form.examId))
    const collegeId = num(examRow?.fk_college_id)
    const payload = selectedRooms.map((room) => ({
      roomId: num(room.roomId ?? room.pk_room_id),
      collegeId,
      buildingId: Number(form.buildingId),
      examMasterId: Number(form.examId),
      univExamCentersId: Number(form.univExamcenterId),
      isAllrooms: true,
      isActive: true,
    }))
    setSaving(true)
    try {
      await addListUnivExamCenterRooms(payload)
      toastSuccess('Exam center rooms saved.')
      await getList()
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function onEdit(row: Row) {
    setEditRow(row)
    setEditForm({ isActive: row.isActive === true, reason: txt(row.reason) })
    setEditOpen(true)
  }

  async function onSaveEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!editRow) return
    const id = pickUnivExamCenterRoomId(editRow)
    if (!id) return
    if (!editForm.isActive && !editForm.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    setSaving(true)
    try {
      await updateUnivExamCenterRoom(id, {
        ...editRow,
        isActive: editForm.isActive,
        reason: editForm.isActive ? '' : editForm.reason.trim(),
      })
      toastSuccess('Exam center room updated.')
      setEditOpen(false)
      await getList()
    } catch (err) {
      toastError(err, 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FilteredListPage
      title="Exam Center Rooms"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course *</Label><Select options={courses.map((r) => ({ value: String(pickCourseId(r)), label: pickCourseLabel(r) }))} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v ?? '' }))} disabled={loadingFilters} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Academic Year *</Label><Select options={academicYears.map((r) => ({ value: String(pickAcademicYearId(r)), label: pickAcademicYearLabel(r) }))} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))} /></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam *</Label><Select options={exams.map((r) => ({ value: String(pickExamId(r)), label: `${pickExamLabel(r)} (${txt(r.from_date ?? r.fromDate)} - ${txt(r.to_date ?? r.toDate)})` }))} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v ?? '' }))} /></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam Center *</Label><Select options={centers.map((r) => ({ value: String(num(r.univExamcenterId ?? r.univExamCenterId)), label: txt(r.examcenterCode) }))} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v ?? '' }))} /></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam Center - Building</Label><Select options={[{ value: '0', label: 'All' }, ...buildings.map((r) => ({ value: String(num(r.buildingId)), label: `${txt(r.campusName)} - ${txt(r.buildingCode)}` }))]} value={form.buildingId} onChange={(v) => setForm((f) => ({ ...f, buildingId: v ?? '0' }))} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Block</Label><Select options={[{ value: '0', label: 'All' }, ...blocks.map((r) => ({ value: String(num(r.blockId)), label: txt(r.blockCode) }))]} value={form.blockId} onChange={(v) => setForm((f) => ({ ...f, blockId: v ?? '0' }))} /></div>
          <div className="space-y-1 md:col-span-2"><Label>Floor - No</Label><Select options={[{ value: '0', label: 'All' }, ...floors.map((r) => ({ value: String(num(r.floorId)), label: `${txt(r.floorName)} - ${txt(r.floorNo)}` }))]} value={form.floorId} onChange={(v) => setForm((f) => ({ ...f, floorId: v ?? '0' }))} /></div>
          <div className="md:col-span-2"><Button type="button" onClick={() => void getList()} disabled={loading}>Get List</Button></div>
        </div>
      )}
      notice={showSections && vacancyRooms.length > 0 ? (
        <div className="app-card p-3 space-y-3">
          <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
            Exam Center Rooms - {headingText}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5 border rounded bg-card">
              <div className="p-2 flex items-center justify-between gap-2">
                <SearchInput value={vacancySearch} onChange={setVacancySearch} placeholder="Search…" className="w-full max-w-sm" />
                <span className="text-xs text-blue-700 font-semibold">Selected : {selectedRooms.length}</span>
              </div>
              <div className="max-h-72 overflow-auto border-t">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2 w-16">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={selectAll} onCheckedChange={(v) => toggleAll(v === true)} />
                          All
                        </div>
                      </th>
                      <th className="text-left p-2 text-blue-700">Rooms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVacancyRooms.map((r) => {
                      const id = num(r.roomId ?? r.pk_room_id)
                      const checked = r.isSelected === true
                      return (
                        <tr key={id} className="border-t">
                          <td className="p-2">
                            <Checkbox checked={checked} onCheckedChange={(v) => toggleOne(id, v === true)} />
                          </td>
                          <td className="p-2">{roomName(r)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:col-span-5 border rounded bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2 text-blue-700">Selected Rooms : {selectedRooms.length}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRooms.map((r) => (
                    <tr key={num(r.roomId ?? r.pk_room_id)} className="border-t">
                      <td className="p-2">{roomName(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:col-span-2 flex items-end justify-start">
              <Button type="button" onClick={() => void onSaveSelected()} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      rowData={showSections ? existingRooms : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Exam Center Rooms',
      }}
      toolbarLeading={
        showSections && existingRooms.length > 0 ? (
          <span className="text-[12px] font-medium text-[hsl(var(--primary))] truncate max-w-[min(100%,40rem)]">
            {headingText}
          </span>
        ) : null
      }
    >
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Exam Answer Paper"
        onSubmit={onSaveEdit}
        isSubmitting={saving}
        size="md"
      >
        <div className="space-y-1 text-sm">
          <p><span className="font-medium">center Name :</span> <span className="text-blue-700">{txt(editRow?.examCenterName)}</span></p>
          <p><span className="font-medium">Building Name :</span> <span className="text-blue-700">{txt(editRow?.buildingName ?? editRow?.buildingId)}</span></p>
          <p><span className="font-medium">Room Name :</span> <span className="text-blue-700">{txt(editRow?.roomName)}</span></p>
        </div>
        <ActiveStatusField
          isActive={editForm.isActive}
          reason={editForm.reason}
          onActiveChange={(v) => setEditForm((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </FilteredListPage>
  )
}

