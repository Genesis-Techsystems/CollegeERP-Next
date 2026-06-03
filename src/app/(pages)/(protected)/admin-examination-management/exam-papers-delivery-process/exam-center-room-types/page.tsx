'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DoorOpen, Pencil, Plus } from 'lucide-react'
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
import { createRoomType, listActiveOrganizations, listRoomTypes, updateRoomType } from '@/services'
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
  organizationId: string
  roomType: string
  isActive: boolean
  reason: string
}

const EMPTY_FORM: FormState = {
  organizationId: '',
  roomType: '',
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

export default function ExamCenterRoomTypesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [orgs, setOrgs] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listRoomTypes()
      setRows(list as unknown as Row[])
    } catch (e) {
      toastError(e, 'Failed to load room types')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOrgs = useCallback(async () => {
    try {
      const list = await listActiveOrganizations()
      setOrgs(list as unknown as Row[])
    } catch (e) {
      toastError(e, 'Failed to load organizations')
    }
  }, [])

  useEffect(() => {
    void loadData()
    void loadOrgs()
  }, [loadData, loadOrgs])

  const orgOptions: SelectOption[] = useMemo(
    () =>
      orgs.map((o) => ({
        value: String(num(o.organizationId)),
        label: txt(o.orgCode ?? o.organizationCode ?? o.organizationName),
      })),
    [orgs],
  )

  function onAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setForm({
      organizationId: String(num(row.organizationId)),
      roomType: txt(row.roomType),
      isActive: row.isActive === true,
      reason: txt(row.reason) || 'active',
    })
    setModalOpen(true)
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.organizationId) {
      toastError('Organization is required.')
      return
    }
    if (!form.roomType.trim()) {
      toastError('Room Type is required.')
      return
    }
    if (!form.isActive && !form.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        organizationId: Number(form.organizationId),
        roomType: form.roomType.trim(),
        isActive: form.isActive,
        reason: form.isActive ? 'active' : form.reason.trim(),
      } as unknown as Parameters<typeof createRoomType>[0]

      if (editing) {
        await updateRoomType(num(editing.roomTypeId), payload)
        toastSuccess('Room Type updated.')
      } else {
        await createRoomType(payload)
        toastSuccess('Room Type added.')
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
      {
        headerName: 'Org Code',
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.orgCode ?? p.data?.organizationCode),
      },
      { headerName: 'Room Type', minWidth: 200, valueGetter: (p) => txt(p.data?.roomType) },
      { headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 90, width: 90, flex: 0, cellRenderer: makeActionsRenderer(onEdit) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Room Types"
        subtitle="Examination management · Exam papers delivery · Room Types"
      />

      <div className="app-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-blue-700" aria-hidden />
            <h2 className="app-card-title">Room Types</h2>
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
              pdfDocumentTitle: 'Room Types',
            }}
            toolbarTrailing={
              <Button size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add Room Type
              </Button>
            }
          />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Room Type' : 'Add Room Type'}
        onSubmit={onSubmit}
        isSubmitting={saving}
        size="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>Organization *</Label>
            <Select
              options={orgOptions}
              value={form.organizationId}
              onChange={(v) => setForm((f) => ({ ...f, organizationId: v ?? '' }))}
              placeholder="Select organization"
              searchable
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Room Type *</Label>
            <Input
              value={form.roomType}
              onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}
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
