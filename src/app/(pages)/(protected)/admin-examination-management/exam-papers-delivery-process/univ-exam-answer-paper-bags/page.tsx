'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createUnivExamBag,
  listAllActiveUnivExamBags,
  pickUnivExamBagId,
  updateUnivExamBag,
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

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function sealedRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isSealed)} activeLabel="Yes" inactiveLabel="No" />
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

export default function UnivExamAnswerPaperBagsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formModal, setFormModal] = useState({
    bagSerialNo: '',
    trackerId: '',
    totalAnswerBooks: '',
    sealedbyName: '',
    dispatchStatusCatdetId: '',
    isSealed: false,
    isActive: true,
    reason: '',
  })

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Bag Serial No', minWidth: 140, valueGetter: (p) => txt(p.data?.bagSerialNo) },
      { headerName: 'Tracker Id', minWidth: 120, valueGetter: (p) => txt(p.data?.trackerId) },
      { headerName: 'Total Answer Books', minWidth: 150, valueGetter: (p) => txt(p.data?.totalAnswerBooks) },
      { headerName: 'Dispatched Status', minWidth: 150, valueGetter: (p) => txt(p.data?.dispatchStatusCatdetName ?? p.data?.dispatchStatusName) },
      { headerName: 'Sealed By Name', minWidth: 140, valueGetter: (p) => txt(p.data?.sealedbyName ?? p.data?.sealedByName) },
      { headerName: 'Is Sealed', minWidth: 100, cellRenderer: sealedRenderer },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  async function loadData() {
    setLoading(true)
    try {
      const data = await listAllActiveUnivExamBags().catch(() => [])
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function openCreate() {
    setEditing(null)
    setEditingId(null)
    setFormModal({
      bagSerialNo: '',
      trackerId: '',
      totalAnswerBooks: '',
      sealedbyName: '',
      dispatchStatusCatdetId: '',
      isSealed: false,
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    const directId = pickUnivExamBagId(row)
    const fallbackId =
      directId ||
      Object.entries(row).reduce((acc, [key, value]) => {
        if (acc > 0) return acc
        if (!/bag.*id/i.test(key)) return 0
        return num(value)
      }, 0)
    setEditingId(fallbackId > 0 ? fallbackId : null)
    setFormModal({
      bagSerialNo: txt(row.bagSerialNo),
      trackerId: txt(row.trackerId),
      totalAnswerBooks: txt(row.totalAnswerBooks),
      sealedbyName: txt(row.sealedbyName ?? row.sealedByName),
      dispatchStatusCatdetId: txt(row.dispatchStatusCatdetId),
      isSealed: row.isSealed === true,
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!formModal.bagSerialNo.trim()) {
      toastError('Bag serial number is required.')
      return
    }
    if (!formModal.totalAnswerBooks.trim()) {
      toastError('Total answer books is required.')
      return
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      bagSerialNo: formModal.bagSerialNo.trim(),
      trackerId: formModal.trackerId.trim(),
      totalAnswerBooks: Number(formModal.totalAnswerBooks),
      // Keep both key variants for backend compatibility.
      sealedbyName: formModal.sealedbyName.trim(),
      sealedByName: formModal.sealedbyName.trim(),
      dispatchStatusCatdetId: num(formModal.dispatchStatusCatdetId) || null,
      isSealed: formModal.isSealed,
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason.trim(),
    }

    setSaving(true)
    try {
      if (editing) {
        const id = editingId ?? pickUnivExamBagId(editing)
        if (id <= 0) {
          toastError('Unable to determine record id for update.')
          return
        }
        await updateUnivExamBag(id, {
          ...payload,
          univExamBagId: id,
          univExamBagsId: id,
          // Angular update payload carries these fields; preserve current row values
          // so backend validations pass even when form doesn't edit them.
          univExamcenterId: num(editing?.univExamcenterId ?? editing?.univExamCenterId),
          examTimetableId: num(editing?.examTimetableId),
          sealedbyUserId: num(editing?.sealedbyUserId),
        })
        toastSuccess('Exam answer paper bag updated.')
      } else {
        await createUnivExamBag(payload)
        toastSuccess('Exam answer paper bag created.')
      }
      setModalOpen(false)
      await loadData()
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam answer paper bags" subtitle="Exam papers delivery process · Answer paper bags" />

      <div className="app-card px-3 py-2 border-t-[3px] border-t-amber-300 border-b border-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
          <h2 className="text-[14px] font-semibold text-[hsl(var(--card-title))]">Exam Answer Paper Bags</h2>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <div className="p-2">
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search…',
              pdfDocumentTitle: 'Exam Answer Paper Bags',
            }}
            toolbarTrailing={
              <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Exam Answer Paper Bag
              </Button>
            }
          />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Exam Answer Paper Bag' : 'Add Exam Answer Paper Bag'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Bag Serial No *</Label>
            <Input value={formModal.bagSerialNo} onChange={(e) => setFormModal((f) => ({ ...f, bagSerialNo: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Total Answer Books *</Label>
            <Input
              type="number"
              value={formModal.totalAnswerBooks}
              onChange={(e) => setFormModal((f) => ({ ...f, totalAnswerBooks: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Tracker Id</Label>
            <Input value={formModal.trackerId} onChange={(e) => setFormModal((f) => ({ ...f, trackerId: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Dispatch Status CatDet Id</Label>
            <Input
              type="number"
              value={formModal.dispatchStatusCatdetId}
              onChange={(e) => setFormModal((f) => ({ ...f, dispatchStatusCatdetId: e.target.value }))}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Sealed By Name</Label>
            <Input value={formModal.sealedbyName} onChange={(e) => setFormModal((f) => ({ ...f, sealedbyName: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium md:col-span-2">
            <input
              id="isSealed"
              type="checkbox"
              checked={formModal.isSealed}
              onChange={(e) => setFormModal((f) => ({ ...f, isSealed: e.target.checked }))}
            />
            <Label htmlFor="isSealed" className="text-sm font-medium">
              Is Sealed
            </Label>
          </div>
        </div>

        <ActiveStatusField
          isActive={formModal.isActive}
          reason={formModal.reason}
          onActiveChange={(v) => setFormModal((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setFormModal((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </PageContainer>
  )
}
