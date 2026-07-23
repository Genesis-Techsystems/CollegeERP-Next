'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import {
  ActiveStatusField,
  GlobalFilterBarRow,
  GlobalFilterField,
} from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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

function pickExamTimetableId(row: Row): number {
  return num(row.fk_exam_timetable_id ?? row.examTimetableId ?? row.exam_timetable_id)
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

function roomLabel(r: Row): string {
  const built = txt(r.room)
  if (built) return built
  const parts = [
    txt(r.roomCode ?? r.room_code ?? r.roomName ?? r.room_name),
    txt(r.buildingCode ?? r.building_code ?? r.pk_building_id ?? r.buildingId),
    txt(r.floorName ?? r.floor_name),
    txt(r.floorNo ?? r.floor_no),
  ].filter(Boolean)
  return parts.join('/') || '-'
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

  const [shown, setShown] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<Row | null>(null)
  const [editForm, setEditForm] = useState({ isActive: true, reason: '' })

  const [form, setForm] = useState({
    courseId: '',
    academicYearId: '',
    examId: '',
    univExamcenterId: '',
    buildingId: '0',
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
    return vacancyRooms.filter((r) => roomLabel(r).toLowerCase().includes(q))
  }, [vacancyRooms, vacancySearch])

  const headingText = useMemo(() => {
    const center = centers.find((c) => num(c.univExamcenterId ?? c.univExamCenterId) === Number(form.univExamcenterId))
    return txt(center?.examcenterName ?? center?.examCenterName) || txt(center?.examcenterCode)
  }, [centers, form.univExamcenterId])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 180, valueGetter: (p) => txt(p.data?.examCenterName) },
      { headerName: 'Building', minWidth: 130, valueGetter: (p) => txt(p.data?.buildingId) },
      { headerName: 'Room Name', minWidth: 130, valueGetter: (p) => txt(p.data?.roomName) },
      { headerName: 'Room Code', minWidth: 120, valueGetter: (p) => txt(p.data?.roomCode) },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const centerRows = await listAllActiveUnivExamCenters().catch(() => [])
      setCenters(Array.isArray(centerRows) ? centerRows : [])
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
    if (!form.univExamcenterId && v && Number(v) > 0) setForm((f) => ({ ...f, univExamcenterId: v }))
  }, [centers, form.univExamcenterId])

  useEffect(() => {
    async function loadBuildings() {
      if (!form.univExamcenterId) return
      const rows = await listBuildingsByUnivExamCenter(Number(form.univExamcenterId)).catch(() => [])
      const list = Array.isArray(rows) ? rows : []
      setBuildings(list)
      // Angular selectedExamCenter: auto-select first building when available
      const firstBuildingId = list[0] ? String(num(list[0].buildingId)) : '0'
      setForm((f) => ({ ...f, buildingId: firstBuildingId, blockId: '0', floorId: '0' }))
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
      const list = Array.isArray(rows) ? rows : []
      setBlocks(list)
      // Angular SelectedBuilding: auto-select first block
      const firstBlockId = list[0] ? String(num(list[0].blockId)) : '0'
      setForm((f) => ({ ...f, blockId: firstBlockId, floorId: '0' }))
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
      const list = Array.isArray(rows) ? rows : []
      setFloors(list)
      // Angular SelectedBlock: auto-select first floor
      const firstFloorId = list[0] ? String(num(list[0].floorId)) : '0'
      setForm((f) => ({ ...f, floorId: firstFloorId }))
    }
    void loadFloors()
  }, [form.blockId])

  async function getList() {
    if (!form.courseId || !form.academicYearId || !form.examId || !form.univExamcenterId) {
      toastError('Course, Academic Year, Exam and Exam Center are required.')
      return
    }
    const examRow = exams.find((e) => pickExamId(e) === Number(form.examId))
    const examTimetableId = examRow ? pickExamTimetableId(examRow) : 0
    if (!examTimetableId) {
      toastError('Exam timetable not found for the selected exam.')
      return
    }
    setLoading(true)
    setVacancySearch('')
    setSelectedRooms([])
    setSelectAll(false)
    // Always show Angular-style result UI after Get List (empty on no data / error)
    setShown(true)
    try {
      // Angular getList → getExamCenterRooms + getRooms (s_get_exam_masterdetails / exam_room_allotment)
      const [assigned, available] = await Promise.all([
        listUnivExamCenterRoomsByFilters(
          Number(form.examId),
          Number(form.univExamcenterId),
          Number(form.buildingId),
        ),
        getExamRoomDetails({
          buildingId: Number(form.buildingId) || 0,
          blockId: Number(form.blockId) || 0,
          floorId: Number(form.floorId) || 0,
          examTimetableId,
        }),
      ])
      const assignedRows = Array.isArray(assigned) ? assigned : []
      const availableRows = Array.isArray(available) ? available : []
      const assignedRoomIds = new Set(
        assignedRows.map((r) => num(r.roomId ?? r.pk_room_id)),
      )
      // Angular: exclude rooms already in examCenterRoomsList; label uses `room`
      const vacancy = availableRows
        .filter((r) => !assignedRoomIds.has(num(r.pk_room_id ?? r.roomId)))
        .map((r) => ({ ...r, checked: false, isSelected: false }))
      setExistingRooms(assignedRows)
      setVacancyRooms(vacancy)
    } catch (e) {
      setExistingRooms([])
      setVacancyRooms([])
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
      buildingId: Number(form.buildingId) || num(room.pk_building_id ?? room.buildingId),
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

  function hideResults() {
    setShown(false)
  }

  return (
    <FilteredListPage
      title="Exam Center Rooms"
      filters={(
        <>
          <GlobalFilterBarRow className="global-filter-bar__row--ecr-r1">
            <GlobalFilterField label="Course *" className="global-filter-field--fx20">
              <Select
                options={courses.map((r) => ({ value: String(pickCourseId(r)), label: pickCourseLabel(r) }))}
                value={form.courseId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, courseId: v ?? '' }))
                }}
                placeholder="Select course"
                searchable
                disabled={loadingFilters}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year *" className="global-filter-field--fx18">
              <Select
                options={academicYears.map((r) => ({
                  value: String(pickAcademicYearId(r)),
                  label: pickAcademicYearLabel(r),
                }))}
                value={form.academicYearId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, academicYearId: v ?? '' }))
                }}
                placeholder="Select academic year"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam *" className="global-filter-field--fx40">
              <Select
                options={exams.map((r) => ({
                  value: String(pickExamId(r)),
                  label: `${pickExamLabel(r)} (${txt(r.from_date ?? r.fromDate)} - ${txt(r.to_date ?? r.toDate)})`,
                }))}
                value={form.examId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, examId: v ?? '' }))
                }}
                placeholder="Select exam"
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Center *" className="global-filter-field--fx22">
              <Select
                options={centers
                  .map((r) => {
                    const id = num(r.univExamcenterId ?? r.univExamCenterId)
                    return { value: String(id), label: txt(r.examcenterCode), id }
                  })
                  .filter((o) => o.id > 0)
                  .map(({ value, label }) => ({ value, label }))}
                value={form.univExamcenterId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, univExamcenterId: v ?? '' }))
                }}
                placeholder="Select exam center"
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
          <GlobalFilterBarRow className="global-filter-bar__row--ecr-r2">
            <GlobalFilterField label="Exam Center - Building" className="global-filter-field--fx50">
              <Select
                options={[
                  { value: '0', label: 'All' },
                  ...buildings.map((r) => ({
                    value: String(num(r.buildingId)),
                    label: `${txt(r.campusName)} - ${txt(r.buildingCode)}`,
                  })),
                ]}
                value={form.buildingId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, buildingId: v ?? '0' }))
                }}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Block" className="global-filter-field--fx16">
              <Select
                options={[
                  { value: '0', label: 'All' },
                  ...blocks.map((r) => ({ value: String(num(r.blockId)), label: txt(r.blockCode) })),
                ]}
                value={form.blockId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, blockId: v ?? '0' }))
                }}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Floor - No" className="global-filter-field--fx16">
              <Select
                options={[
                  { value: '0', label: 'All' },
                  ...floors.map((r) => ({
                    value: String(num(r.floorId)),
                    label: `${txt(r.floorName)} - ${txt(r.floorNo)}`,
                  })),
                ]}
                value={form.floorId}
                onChange={(v) => {
                  hideResults()
                  setForm((f) => ({ ...f, floorId: v ?? '0' }))
                }}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label=" " className="global-filter-field--action global-filter-field--fx10">
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 px-3 text-[12px] w-full"
                onClick={() => void getList()}
                disabled={loading}
              >
                Get List
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>

          {shown ? (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <h3 className="text-[13px] font-semibold text-[hsl(var(--card-title))]">
                Exam Center Rooms - {headingText || '—'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 rounded border overflow-hidden bg-card">
                  <div className="flex items-center justify-between gap-2 border-b p-2">
                    <SearchInput
                      value={vacancySearch}
                      onChange={setVacancySearch}
                      placeholder="Search…"
                      className="w-full max-w-sm"
                    />
                    <span className="shrink-0 text-[12px] font-semibold text-blue-700">
                      Selected : {selectedRooms.length}
                    </span>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 bg-[#C3D9FF]">
                        <tr>
                          <th className="w-16 px-2 py-1.5 text-left">
                            <label className="flex items-center gap-1.5 font-semibold">
                              <Checkbox
                                checked={selectAll}
                                onCheckedChange={(v) => toggleAll(v === true)}
                              />
                              All
                            </label>
                          </th>
                          <th className="px-2 py-1.5 text-left font-semibold text-blue-700">Rooms</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVacancyRooms.map((r) => {
                          const id = num(r.roomId ?? r.pk_room_id)
                          const checked = r.isSelected === true
                          return (
                            <tr key={id} className="border-t">
                              <td className="px-2 py-1.5">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleOne(id, v === true)}
                                />
                              </td>
                              <td className="px-2 py-1.5">{roomLabel(r)}</td>
                            </tr>
                          )
                        })}
                        {filteredVacancyRooms.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-2 py-6 text-center text-muted-foreground">
                              {loading ? 'Loading…' : 'No available rooms.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:col-span-5 rounded border overflow-hidden bg-card">
                  <div className="max-h-[22.5rem] overflow-auto">
                    <table className="w-full text-[12px]">
                      <thead className="sticky top-0 bg-[#C3D9FF]">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-blue-700">
                            Selected Rooms : {selectedRooms.length}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRooms.map((r) => {
                          const id = num(r.roomId ?? r.pk_room_id)
                          return (
                            <tr key={`sel-${id}`} className="border-t">
                              <td className="px-2 py-1.5 text-blue-700">{roomLabel(r)}</td>
                            </tr>
                          )
                        })}
                        {selectedRooms.length === 0 && (
                          <tr>
                            <td className="px-2 py-6 text-center text-muted-foreground">—</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-end justify-end md:justify-start">
                  <Button
                    type="button"
                    className="h-8 text-[12px]"
                    onClick={() => void onSaveSelected()}
                    disabled={saving || selectedRooms.length === 0}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
      rowData={shown ? existingRooms : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Exam Center Rooms',
      }}
    >
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Update Exam Center Room"
        onSubmit={onSaveEdit}
        isSubmitting={saving}
        size="md"
      >
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">center Name :</span>{' '}
            <span className="text-blue-700">{txt(editRow?.examCenterName)}</span>
          </p>
          <p>
            <span className="font-medium">Building Name :</span>{' '}
            <span className="text-blue-700">{txt(editRow?.buildingName ?? editRow?.buildingId)}</span>
          </p>
          <p>
            <span className="font-medium">Room Name :</span>{' '}
            <span className="text-blue-700">{txt(editRow?.roomName)}</span>
          </p>
        </div>
        <div className="mt-3">
          <Label className="sr-only">Status</Label>
          <ActiveStatusField
            isActive={editForm.isActive}
            reason={editForm.reason}
            onActiveChange={(v) => setEditForm((f) => ({ ...f, isActive: v === true }))}
            onReasonChange={(v) => setEditForm((f) => ({ ...f, reason: v }))}
          />
        </div>
      </FormModal>
    </FilteredListPage>
  )
}
