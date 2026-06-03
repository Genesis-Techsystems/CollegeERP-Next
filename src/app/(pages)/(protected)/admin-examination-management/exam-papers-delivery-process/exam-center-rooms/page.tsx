'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DoorClosed, Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createRoom,
  listActiveBlocksForRooms,
  listActiveRoomTypes,
  listRooms,
  updateRoom,
} from '@/services'
import { listFloorsByBlock, type AnyRow } from '@/services/exam-papers-delivery'

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

interface FormState {
  blockId: string
  floorId: string
  roomTypeId: string
  roomName: string
  roomCode: string
  occupancy: string
  examrows: string
  examcolumns: string
  isActive: boolean
  reason: string
}

const EMPTY_FORM: FormState = {
  blockId: '',
  floorId: '',
  roomTypeId: '',
  roomName: '',
  roomCode: '',
  occupancy: '0',
  examrows: '0',
  examcolumns: '0',
  isActive: true,
  reason: 'active',
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={p.data?.isActive === true} />
}

function makeActionsRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-blue-700"
      onClick={() => p.data && onEdit(p.data)}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  )
}

export default function ExamCenterRoomsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [blocks, setBlocks] = useState<Row[]>([])
  const [floors, setFloors] = useState<Row[]>([])
  const [roomTypes, setRoomTypes] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listRooms()
      setRows(list as unknown as Row[])
    } catch (e) {
      toastError(e, 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMasters = useCallback(async () => {
    try {
      const [blockList, typeList] = await Promise.all([
        listActiveBlocksForRooms(),
        listActiveRoomTypes(),
      ])
      setBlocks(blockList as unknown as Row[])
      setRoomTypes(typeList as unknown as Row[])
    } catch (e) {
      toastError(e, 'Failed to load masters')
    }
  }, [])

  useEffect(() => {
    void loadData()
    void loadMasters()
  }, [loadData, loadMasters])

  useEffect(() => {
    let cancelled = false
    async function loadFloors() {
      if (!form.blockId) {
        setFloors([])
        return
      }
      try {
        const list = await listFloorsByBlock(Number(form.blockId))
        if (!cancelled) setFloors(list)
      } catch (e) {
        if (!cancelled) toastError(e, 'Failed to load floors')
      }
    }
    void loadFloors()
    return () => {
      cancelled = true
    }
  }, [form.blockId])

  const blockOptions: SelectOption[] = useMemo(
    () =>
      blocks.map((b) => ({
        value: String(num(b.blockId)),
        label: `${txt(b.blockCode)} - ${txt(b.blockName)}`,
      })),
    [blocks],
  )
  const floorOptions: SelectOption[] = useMemo(
    () =>
      floors.map((f) => ({
        value: String(num(f.floorId)),
        label: `${txt(f.floorName)} - ${txt(f.floorNo)}`,
      })),
    [floors],
  )
  const roomTypeOptions: SelectOption[] = useMemo(
    () => roomTypes.map((r) => ({ value: String(num(r.roomTypeId)), label: txt(r.roomType) })),
    [roomTypes],
  )

  function onAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setForm({
      blockId: String(num(row.blockId)),
      floorId: String(num(row.floorId)),
      roomTypeId: String(num(row.roomTypeId)),
      roomName: txt(row.roomName),
      roomCode: txt(row.roomCode),
      occupancy: row.occupancy == null ? '0' : String(row.occupancy),
      examrows: row.examrows == null ? '0' : String(row.examrows),
      examcolumns: row.examcolumns == null ? '0' : String(row.examcolumns),
      isActive: row.isActive === true,
      reason: txt(row.reason) || 'active',
    })
    setModalOpen(true)
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.blockId || !form.floorId || !form.roomTypeId) {
      toastError('Block, Floor and Room Type are required.')
      return
    }
    if (!form.roomName.trim() || !form.roomCode.trim()) {
      toastError('Room Name and Code are required.')
      return
    }
    if (!form.isActive && !form.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        blockId: Number(form.blockId),
        floorId: Number(form.floorId),
        roomTypeId: Number(form.roomTypeId),
        roomName: form.roomName.trim(),
        roomCode: form.roomCode.trim(),
        occupancy: Number(form.occupancy || 0),
        examrows: Number(form.examrows || 0),
        examcolumns: Number(form.examcolumns || 0),
        isActive: form.isActive,
        reason: form.isActive ? 'active' : form.reason.trim(),
      } as unknown as Parameters<typeof createRoom>[0]

      if (editing) {
        await updateRoom(num(editing.roomId), payload)
        toastSuccess('Room updated.')
      } else {
        await createRoom(payload)
        toastSuccess('Room added.')
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      toastError(err, editing ? 'Update failed' : 'Add failed')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Block Name', minWidth: 150, valueGetter: (p) => txt(p.data?.blockName) },
      { headerName: 'Floor Name', minWidth: 130, valueGetter: (p) => txt(p.data?.floorName) },
      { headerName: 'Room Type', minWidth: 140, valueGetter: (p) => txt(p.data?.roomType) },
      { headerName: 'Room Code', minWidth: 120, valueGetter: (p) => txt(p.data?.roomCode) },
      { headerName: 'Room Name', minWidth: 150, valueGetter: (p) => txt(p.data?.roomName) },
      { headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 90, width: 90, flex: 0, cellRenderer: makeActionsRenderer(onEdit) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Rooms"
        subtitle="Examination management · Exam papers delivery · Rooms"
      />

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Rooms</h2>
          </div>
        </div>
        <div className="p-2">
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search…',
              pdfDocumentTitle: 'Rooms',
            }}
            toolbarTrailing={
              <Button size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Room
              </Button>
            }
          />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Room' : 'Add Room'}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Block *</Label>
            <Select
              options={blockOptions}
              value={form.blockId}
              onChange={(v) => setForm((f) => ({ ...f, blockId: v ?? '', floorId: '' }))}
              placeholder="Select block"
              searchable
            />
          </div>
          <div className="space-y-1">
            <Label>Floor *</Label>
            <Select
              options={floorOptions}
              value={form.floorId}
              onChange={(v) => setForm((f) => ({ ...f, floorId: v ?? '' }))}
              placeholder="Select floor"
              searchable
              disabled={!form.blockId}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Room Type *</Label>
            <Select
              options={roomTypeOptions}
              value={form.roomTypeId}
              onChange={(v) => setForm((f) => ({ ...f, roomTypeId: v ?? '' }))}
              placeholder="Select room type"
              searchable
            />
          </div>
          <div className="space-y-1">
            <Label>Room Name *</Label>
            <Input
              value={form.roomName}
              onChange={(e) => setForm((f) => ({ ...f, roomName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Room Code *</Label>
            <Input
              value={form.roomCode}
              onChange={(e) => setForm((f) => ({ ...f, roomCode: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Occupancy *</Label>
            <Input
              type="number"
              min={0}
              value={form.occupancy}
              onChange={(e) => setForm((f) => ({ ...f, occupancy: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Rows</Label>
            <Input
              type="number"
              min={0}
              value={form.examrows}
              onChange={(e) => setForm((f) => ({ ...f, examrows: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Columns</Label>
            <Input
              type="number"
              min={0}
              value={form.examcolumns}
              onChange={(e) => setForm((f) => ({ ...f, examcolumns: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <ActiveStatusField
              isActive={form.isActive}
              reason={form.reason === 'active' ? '' : form.reason}
              onActiveChange={(v) => setForm((f) => ({ ...f, isActive: v === true, reason: v ? 'active' : '' }))}
              onReasonChange={(v) => setForm((f) => ({ ...f, reason: v }))}
            />
          </div>
        </div>
      </FormModal>
    </PageContainer>
  )
}
