'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Save } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField, GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getExamRoomDetails } from '@/services'
import {
  addListUnivExamCenterRooms,
  getExamTimetableFilterRows,
  listAllActiveUnivExamCenters,
  listBlocksByBuilding,
  listBuildingsByUnivExamCenter,
  listFloorsByBlock,
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
    return vacancyRooms.filter((r) => txt(r.room ?? r.roomName ?? r.roomCode).toLowerCase().includes(q))
  }, [vacancyRooms, vacancySearch])

  const examCenterName = useMemo(() => {
    const center = centers.find((c) => num(c.univExamcenterId ?? c.univExamCenterId) === Number(form.univExamcenterId))
    return txt(center?.examcenterName ?? center?.examCenterName)
  }, [centers, form.univExamcenterId])

  const buildingName = useMemo(() => {
    const b = buildings.find((x) => num(x.buildingId) === Number(form.buildingId))
    return txt(b?.buildingCode ?? b?.buildingName)
  }, [buildings, form.buildingId])

  const blockCode = useMemo(() => {
    const b = blocks.find((x) => num(x.blockId) === Number(form.blockId))
    return txt(b?.blockCode)
  }, [blocks, form.blockId])

  const floorName = useMemo(() => {
    const f = floors.find((x) => num(x.floorId) === Number(form.floorId))
    return txt(f?.floorName)
  }, [floors, form.floorId])

  const headingText = examCenterName

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 180, valueGetter: (p) => txt(p.data?.examCenterName) },
      { headerName: 'Building', minWidth: 130, valueGetter: (p) => txt(p.data?.buildingId) },
      { headerName: 'Room Name', minWidth: 130, valueGetter: (p) => txt(p.data?.roomName) },
      { headerName: 'Room Code', minWidth: 120, valueGetter: (p) => txt(p.data?.roomCode) },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    // onEdit closes over filter display names used when opening the edit modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEdit is recreated each render; deps below keep enrichment current
    [examCenterName, buildingName, blockCode, floorName],
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

  // Angular selectedExam() reloads UnivExamCenters and selects the first center.
  useEffect(() => {
    if (!form.examId) return
    let cancelled = false
    void (async () => {
      try {
        const centerRows = await listAllActiveUnivExamCenters()
        if (cancelled) return
        const list = Array.isArray(centerRows) ? centerRows : []
        setCenters(list)
        const first = list[0] ? String(num(list[0].univExamcenterId ?? list[0].univExamCenterId)) : ''
        setForm((f) => ({ ...f, univExamcenterId: first }))
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load exam centers')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form.examId])

  useEffect(() => {
    async function loadBuildings() {
      if (!form.univExamcenterId) {
        setBuildings([])
        return
      }
      // Angular selectedExamCenter clears vacancy + assigned before loading buildings.
      setVacancyRooms([])
      setExistingRooms([])
      setSelectedRooms([])
      setSelectAll(false)
      setShowSections(false)
      try {
        const rows = await listBuildingsByUnivExamCenter(Number(form.univExamcenterId))
        const list = Array.isArray(rows) ? rows : []
        setBuildings(list)
        // Angular auto-selects the first building when available.
        const first = list[0] ? String(num(list[0].buildingId)) : '0'
        setForm((f) => ({ ...f, buildingId: first, blockId: '0', floorId: '0' }))
      } catch (e) {
        setBuildings([])
        toastError(e, 'Failed to load buildings')
      }
    }
    void loadBuildings()
  }, [form.univExamcenterId])

  useEffect(() => {
    async function loadBlocks() {
      if (!form.buildingId || form.buildingId === '0') {
        setBlocks([])
        setFloors([])
        setForm((f) => ({ ...f, blockId: '0', floorId: '0' }))
        return
      }
      try {
        const rows = await listBlocksByBuilding(Number(form.buildingId))
        setBlocks(Array.isArray(rows) ? rows : [])
        const first = Array.isArray(rows) && rows[0] ? String(num(rows[0].blockId)) : '0'
        setForm((f) => ({ ...f, blockId: first, floorId: '0' }))
      } catch (e) {
        setBlocks([])
        toastError(e, 'Failed to load blocks')
      }
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
      try {
        const rows = await listFloorsByBlock(Number(form.blockId))
        setFloors(Array.isArray(rows) ? rows : [])
        const first = Array.isArray(rows) && rows[0] ? String(num(rows[0].floorId)) : '0'
        setForm((f) => ({ ...f, floorId: first }))
      } catch (e) {
        setFloors([])
        toastError(e, 'Failed to load floors')
      }
    }
    void loadFloors()
  }, [form.blockId])

  // Angular SelectedFloor clears vacancy + assigned lists.
  useEffect(() => {
    setVacancyRooms([])
    setExistingRooms([])
    setSelectedRooms([])
    setSelectAll(false)
    setShowSections(false)
  }, [form.floorId])

  function roomName(r: Row) {
    // Angular vacancy list binds `rm.room` from s_get_exam_masterdetails.
    return txt(r.room ?? r.roomName ?? r.roomCode)
  }

  function asNestedRow(v: unknown): Row | null {
    return v && typeof v === 'object' ? (v as Row) : null
  }

  /** Angular grid binds flat roomId / roomName / roomCode / examCenterName; fallback list may nest them. */
  function pickAssignedRoomId(row: Row): number {
    const nested = asNestedRow(row.room)
    return num(row.roomId ?? row.pk_room_id ?? nested?.roomId ?? nested?.pk_room_id)
  }

  function normalizeAssignedRoom(row: Row, centerName: string): Row {
    const room = asNestedRow(row.room)
    const center = asNestedRow(row.univExamcenters) ?? asNestedRow(row.univExamCenters)
    const building = asNestedRow(row.building)
    return {
      ...row,
      roomId: pickAssignedRoomId(row),
      examCenterName:
        txt(row.examCenterName) ||
        txt(center?.examcenterName ?? center?.examCenterName) ||
        centerName,
      buildingId: num(row.buildingId) || num(building?.buildingId) || row.buildingId,
      roomName: txt(row.roomName) || txt(room?.roomName ?? room?.room),
      roomCode: txt(row.roomCode) || txt(room?.roomCode),
    }
  }

  function pickExamTimetableId(): number {
    const examRow = exams.find((e) => pickExamId(e) === Number(form.examId))
    return num(examRow?.fk_exam_timetable_id ?? examRow?.examTimetableId)
  }

  async function getList() {
    if (!form.courseId || !form.academicYearId || !form.examId || !form.univExamcenterId) {
      toastError('Course, Academic Year, Exam and Exam Center are required.')
      return
    }
    const examTimetableId = pickExamTimetableId()
    if (!examTimetableId) {
      toastError('Exam timetable not found for the selected exam.')
      return
    }
    setLoading(true)
    setSelectedRooms([])
    setSelectAll(false)
    try {
      // Angular getList → getExamCenterRooms + getRooms (s_get_exam_masterdetails / exam_room_allotment).
      // Angular hardcodes in_org_id = 1 for getRooms.
      // Assigned list can 500 on nested joins — never block vacancy rooms on that failure.
      const [assignedSettled, availableSettled] = await Promise.allSettled([
        listUnivExamCenterRoomsByFilters(
          Number(form.examId),
          Number(form.univExamcenterId),
          Number(form.buildingId || 0),
        ),
        getExamRoomDetails({
          orgId: 1,
          buildingId: Number(form.buildingId || 0),
          blockId: Number(form.blockId || 0),
          floorId: Number(form.floorId || 0),
          examTimetableId,
        }),
      ])
      if (availableSettled.status === 'rejected') {
        throw availableSettled.reason
      }
      const assignedRaw =
        assignedSettled.status === 'fulfilled' && Array.isArray(assignedSettled.value)
          ? assignedSettled.value
          : []
      const assignedRows = assignedRaw.map((r) => normalizeAssignedRoom(r, examCenterName))
      const availableRows = Array.isArray(availableSettled.value) ? availableSettled.value : []
      // Angular: exclude vacancy where examRoom.roomId === vacancyRoom.pk_room_id
      const assignedRoomIds = new Set(assignedRows.map((r) => pickAssignedRoomId(r)).filter((id) => id > 0))
      const vacancy = availableRows
        .filter((r) => !assignedRoomIds.has(num(r.pk_room_id ?? r.roomId)))
        .map((r) => ({
          ...r,
          checked: false,
          isSelected: false,
          disabled: r.pk_exam_room_allotment_id != null,
        }))
      setExistingRooms(assignedRows)
      setVacancyRooms(vacancy)
      setShowSections(true)
    } catch (e) {
      setExistingRooms([])
      setVacancyRooms([])
      setShowSections(false)
      toastError(e, 'Failed to load exam center rooms')
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
      num(r.pk_room_id ?? r.roomId) === roomId ? { ...r, checked, isSelected: checked } : r,
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
    // Angular Save payload uses room.pk_room_id / room.pk_building_id from the vacancy proc row.
    const payload = selectedRooms.map((room) => ({
      roomId: num(room.pk_room_id ?? room.roomId),
      collegeId,
      buildingId: num(room.pk_building_id ?? room.buildingId) || Number(form.buildingId),
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
    // Angular editDialog enriches the row with current filter display names before opening the modal.
    setEditRow({
      ...row,
      examCenterName: examCenterName || txt(row.examCenterName),
      buildingName: buildingName || txt(row.buildingName ?? row.buildingId),
      block: blockCode || txt(row.block),
      floorName: floorName || txt(row.floorName),
    })
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
    <PageContainer className="space-y-4">
      <h2 className="px-1 text-lg font-semibold tracking-tight text-foreground">Exam Center Rooms</h2>

      <GlobalFilterBar title="Exam Center Rooms" defaultOpen>
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course *">
            <Select
              options={courses.map((r) => ({ value: String(pickCourseId(r)), label: pickCourseLabel(r) }))}
              value={form.courseId}
              onChange={(v) => setForm((f) => ({ ...f, courseId: v ?? '' }))}
              placeholder="Course"
              disabled={loadingFilters}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year *">
            <Select
              options={academicYears.map((r) => ({
                value: String(pickAcademicYearId(r)),
                label: pickAcademicYearLabel(r),
              }))}
              value={form.academicYearId}
              onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))}
              placeholder="Academic Year"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam *">
            <Select
              options={exams.map((r) => ({
                value: String(pickExamId(r)),
                label: `${pickExamLabel(r)} (${txt(r.from_date ?? r.fromDate)} - ${txt(r.to_date ?? r.toDate)})`,
              }))}
              value={form.examId}
              onChange={(v) => setForm((f) => ({ ...f, examId: v ?? '' }))}
              placeholder="Exam"
              searchable
            />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Center *">
            <Select
              options={centers.map((r) => ({
                value: String(num(r.univExamcenterId ?? r.univExamCenterId)),
                label: txt(r.examcenterCode),
              }))}
              value={form.univExamcenterId}
              onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v ?? '' }))}
              placeholder="Exam Center"
              searchable
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
        <GlobalFilterBarRow>
          <GlobalFilterField label="Exam Center - Building">
            <Select
              options={[
                { value: '0', label: 'All' },
                ...buildings.map((r) => ({
                  value: String(num(r.buildingId)),
                  label: `${txt(r.campusName)} - ${txt(r.buildingCode)}`,
                })),
              ]}
              value={form.buildingId}
              onChange={(v) => setForm((f) => ({ ...f, buildingId: v ?? '0' }))}
              placeholder="Building"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Block">
            <Select
              options={[
                { value: '0', label: 'All' },
                ...blocks.map((r) => ({ value: String(num(r.blockId)), label: txt(r.blockCode) })),
              ]}
              value={form.blockId}
              onChange={(v) => setForm((f) => ({ ...f, blockId: v ?? '0' }))}
              placeholder="Block"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Floor - No">
            <Select
              options={[
                { value: '0', label: 'All' },
                ...floors.map((r) => ({
                  value: String(num(r.floorId)),
                  label: `${txt(r.floorName)} - ${txt(r.floorNo)}`,
                })),
              ]}
              value={form.floorId}
              onChange={(v) => setForm((f) => ({ ...f, floorId: v ?? '0' }))}
              placeholder="Floor"
            />
          </GlobalFilterField>
          <GlobalFilterField label=" " className="global-filter-field--action global-filter-field--shrink">
            <Button
              type="button"
              size="sm"
              onClick={() => void getList()}
              disabled={loading}
              className="h-8 shrink-0 px-3 text-[12px]"
            >
              Get List
            </Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {showSections && vacancyRooms.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <h3 className="app-card-title">Exam Center Rooms - {headingText}</h3>
          </div>
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between gap-2 border-b border-border p-2">
                  <SearchInput
                    value={vacancySearch}
                    onChange={setVacancySearch}
                    placeholder="Search…"
                    className="w-full max-w-sm"
                  />
                  <span className="shrink-0 text-[12px] font-semibold text-[hsl(var(--primary))]">
                    Selected : {selectedRooms.length}
                  </span>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2 text-left w-16">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={selectAll} onCheckedChange={(v) => toggleAll(v === true)} />
                            All
                          </div>
                        </th>
                        <th className="p-2 text-left text-[hsl(var(--primary))]">Rooms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVacancyRooms.map((r) => {
                        const id = num(r.pk_room_id ?? r.roomId)
                        const checked = r.isSelected === true
                        return (
                          <tr key={id} className="border-t border-border">
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
              <div className="md:col-span-5 overflow-hidden rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2 text-left text-[hsl(var(--primary))]">
                        Selected Rooms : {selectedRooms.length}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRooms.map((r) => (
                      <tr key={num(r.pk_room_id ?? r.roomId)} className="border-t border-border">
                        <td className="p-2">{roomName(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:col-span-2 flex items-end justify-start">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void onSaveSelected()}
                  disabled={saving}
                  className="h-8 px-3 text-[12px]"
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSections && existingRooms.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <DataTable
                rowData={existingRooms}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                subtitle=""
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Exam Center Rooms',
                }}
                toolbarLeading={
                  <span
                    className="max-w-[min(100%,40rem)] truncate text-[12px] font-medium text-[hsl(var(--primary))]"
                    title={`Exam Center Rooms - ${headingText}`}
                  >
                    Exam Center Rooms - {headingText}
                  </span>
                }
              />
            </div>
          </div>
        </div>
      )}

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Exam Answer Paper"
        onSubmit={onSaveEdit}
        isSubmitting={saving}
        size="md"
      >
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">center Name :</span>{' '}
            <span className="text-[hsl(var(--primary))]">{txt(editRow?.examCenterName)}</span>
          </p>
          <p>
            <span className="font-medium">Building Name :</span>{' '}
            <span className="text-[hsl(var(--primary))]">{txt(editRow?.buildingName ?? editRow?.buildingId)}</span>
          </p>
          <p>
            <span className="font-medium">Room Name :</span>{' '}
            <span className="text-[hsl(var(--primary))]">{txt(editRow?.roomName)}</span>
          </p>
        </div>
        <ActiveStatusField
          isActive={editForm.isActive}
          reason={editForm.reason}
          onActiveChange={(v) => setEditForm((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </PageContainer>
  )
}

