'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Layers3, Pencil, Plus } from 'lucide-react'
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
import { createFloor, listActiveBlocksForFloors, listFloors, updateFloor } from '@/services'
import type { AnyRow } from '@/services/exam-papers-delivery'

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
  floorName: string
  floorNo: string
  noOfRooms: string
  isActive: boolean
  reason: string
}

const EMPTY_FORM: FormState = {
  blockId: '',
  floorName: '',
  floorNo: '',
  noOfRooms: '',
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

export default function ExamCenterFloorsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [blocks, setBlocks] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listFloors()
      setRows(list as unknown as Row[])
    } catch (e) {
      toastError(e, 'Failed to load floors')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBlocks = useCallback(async () => {
    try {
      const list = await listActiveBlocksForFloors()
      setBlocks(list as unknown as Row[])
    } catch (e) {
      toastError(e, 'Failed to load blocks')
    }
  }, [])

  useEffect(() => {
    void loadData()
    void loadBlocks()
  }, [loadData, loadBlocks])

  const blockOptions: SelectOption[] = useMemo(
    () =>
      blocks.map((b) => ({
        value: String(num(b.blockId)),
        label: `${txt(b.blockCode)} - ${txt(b.blockName)}`,
      })),
    [blocks],
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
      floorName: txt(row.floorName),
      floorNo: row.floorNo == null ? '' : String(row.floorNo),
      noOfRooms: row.noOfRooms == null ? '' : String(row.noOfRooms),
      isActive: row.isActive === true,
      reason: txt(row.reason) || 'active',
    })
    setModalOpen(true)
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.blockId) {
      toastError('Block is required.')
      return
    }
    if (!form.floorName.trim() || !form.floorNo.trim()) {
      toastError('Floor Name and No are required.')
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
        floorName: form.floorName.trim(),
        floorNo: Number(form.floorNo),
        noOfRooms: form.noOfRooms === '' ? undefined : Number(form.noOfRooms),
        isActive: form.isActive,
        reason: form.isActive ? 'active' : form.reason.trim(),
      } as unknown as Parameters<typeof createFloor>[0]

      if (editing) {
        await updateFloor(num(editing.floorId), payload)
        toastSuccess('Floor updated.')
      } else {
        await createFloor(payload)
        toastSuccess('Floor added.')
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
      { headerName: 'Block Name', minWidth: 160, valueGetter: (p) => txt(p.data?.blockName) },
      { headerName: 'Floor Name', minWidth: 150, valueGetter: (p) => txt(p.data?.floorName) },
      { headerName: 'Floor No', minWidth: 100, valueGetter: (p) => txt(p.data?.floorNo) },
      { headerName: 'No Of Rooms', minWidth: 110, valueGetter: (p) => txt(p.data?.noOfRooms) },
      { headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 90, width: 90, flex: 0, cellRenderer: makeActionsRenderer(onEdit) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Floors"
        subtitle="Examination management · Exam papers delivery · Floors"
      />

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Floors</h2>
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
              pdfDocumentTitle: 'Floors',
            }}
            toolbarTrailing={
              <Button size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Floor
              </Button>
            }
          />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Floor' : 'Add Floor'}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>Block *</Label>
            <Select
              options={blockOptions}
              value={form.blockId}
              onChange={(v) => setForm((f) => ({ ...f, blockId: v ?? '' }))}
              placeholder="Select block"
              searchable
            />
          </div>
          <div className="space-y-1">
            <Label>Floor Name *</Label>
            <Input
              value={form.floorName}
              onChange={(e) => setForm((f) => ({ ...f, floorName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Floor No *</Label>
            <Input
              type="number"
              min={0}
              value={form.floorNo}
              onChange={(e) => setForm((f) => ({ ...f, floorNo: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>No Of Rooms</Label>
            <Input
              type="number"
              min={0}
              value={form.noOfRooms}
              onChange={(e) => setForm((f) => ({ ...f, noOfRooms: e.target.value }))}
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
