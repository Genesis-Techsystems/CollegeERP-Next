'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { ActiveStatusField } from '@/common/components/forms'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createUnivExamBagCollection,
  listAllActiveUnivExamAnswerPaperBags,
  listAllActiveUnivExamBagCollections,
  pickUnivExamBagCollectionId,
  updateUnivExamBagCollection,
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

export default function UnivExamBagCollectionPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [answerPaperBags, setAnswerPaperBags] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    univExamAnswerPaperBagsId: '',
    collectedBy: '',
    collectedDate: '',
    receivedBy: '',
    receivedDate: '',
    isVerifiedFlag: true,
    isActive: true,
    reason: '',
  })

  const bagOptions: SelectOption[] = useMemo(
    () =>
      answerPaperBags.map((r) => ({
        value: String(num(r.univExamAnswerPaperBagId ?? r.univ_exam_answer_paper_bag_id)),
        label: String(r.univExamAnswerPaperBagId ?? r.univ_exam_answer_paper_bag_id ?? '-'),
      })),
    [answerPaperBags],
  )

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'S.No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Collected By', minWidth: 140, valueGetter: (p) => txt(p.data?.collectedBy) },
      { headerName: 'Collected Date', minWidth: 130, valueGetter: (p) => txt(p.data?.collectedDate) },
      { headerName: 'Received By', minWidth: 140, valueGetter: (p) => txt(p.data?.receivedBy) },
      { headerName: 'Received Date', minWidth: 130, valueGetter: (p) => txt(p.data?.receivedDate) },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  async function loadData() {
    setLoading(true)
    try {
      const [collections, bags] = await Promise.all([
        listAllActiveUnivExamBagCollections().catch(() => []),
        listAllActiveUnivExamAnswerPaperBags().catch(() => []),
      ])
      setRows(Array.isArray(collections) ? collections : [])
      setAnswerPaperBags(Array.isArray(bags) ? bags : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function openCreate() {
    setEditing(null)
    setFormModal({
      univExamAnswerPaperBagsId: bagOptions[0]?.value ?? '',
      collectedBy: '',
      collectedDate: new Date().toISOString().slice(0, 10),
      receivedBy: '',
      receivedDate: new Date().toISOString().slice(0, 10),
      isVerifiedFlag: true,
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setFormModal({
      univExamAnswerPaperBagsId: String(num(row.univExamAnswerPaperBagsId)),
      collectedBy: txt(row.collectedBy),
      collectedDate: txt(row.collectedDate).slice(0, 10),
      receivedBy: txt(row.receivedBy),
      receivedDate: txt(row.receivedDate).slice(0, 10),
      isVerifiedFlag: row.isVerifiedFlag !== false,
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!formModal.univExamAnswerPaperBagsId) {
      toastError('Exam Answer Paper Bags is required.')
      return
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      univExamAnswerPaperBagsId: Number(formModal.univExamAnswerPaperBagsId),
      collectedBy: formModal.collectedBy.trim(),
      collectedDate: formModal.collectedDate || null,
      receivedBy: formModal.receivedBy.trim(),
      receivedDate: formModal.receivedDate || null,
      isVerifiedFlag: formModal.isVerifiedFlag,
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason.trim(),
    }

    setSaving(true)
    try {
      const id = pickUnivExamBagCollectionId(editing ?? {})
      if (id > 0) {
        await updateUnivExamBagCollection(id, { ...payload, univExamBagCollectionId: id })
        toastSuccess('Exam bag collection updated.')
      } else {
        await createUnivExamBagCollection(payload)
        toastSuccess('Exam bag collection created.')
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
    <PageContainer className="space-y-4">
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
              pdfDocumentTitle: 'Exam Bag Collection',
            }}
            toolbarTrailing={
              <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Exam Bag Collection
              </Button>
            }
          />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Exam Bag Collection' : 'Add Exam Bag Collection'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Answer Paper Bags</Label>
            <Select
              options={bagOptions}
              value={formModal.univExamAnswerPaperBagsId}
              onChange={(v) => setFormModal((f) => ({ ...f, univExamAnswerPaperBagsId: v ?? '' }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Collected By</Label>
            <Input value={formModal.collectedBy} onChange={(e) => setFormModal((f) => ({ ...f, collectedBy: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Collected Date</Label>
            <Input type="date" value={formModal.collectedDate} onChange={(e) => setFormModal((f) => ({ ...f, collectedDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Received By</Label>
            <Input value={formModal.receivedBy} onChange={(e) => setFormModal((f) => ({ ...f, receivedBy: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Received Date</Label>
            <Input type="date" value={formModal.receivedDate} onChange={(e) => setFormModal((f) => ({ ...f, receivedDate: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium md:col-span-2">
            <input
              id="isVerifiedFlag"
              type="checkbox"
              checked={formModal.isVerifiedFlag}
              onChange={(e) => setFormModal((f) => ({ ...f, isVerifiedFlag: e.target.checked }))}
            />
            <Label htmlFor="isVerifiedFlag" className="text-sm font-medium">
              Is Verified Flag
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

