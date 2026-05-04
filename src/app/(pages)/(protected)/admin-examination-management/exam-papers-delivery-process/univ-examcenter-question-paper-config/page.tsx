'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
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
  createUnivEcQuestionPaperConfig,
  listAllActiveUnivExamCenters,
  listAllUnivEcQuestionPaperConfigs,
  pickUnivEcQuestionPaperConfigId,
  updateUnivEcQuestionPaperConfig,
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

export default function UnivExamCenterQuestionPaperConfigPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [centers, setCenters] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState({
    univExamCentersId: '',
    systemIpAddress: '',
    macAddress: '',
    isActive: true,
    reason: '',
  })

  const centerOptions: SelectOption[] = useMemo(
    () =>
      centers.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [centers],
  )

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 72, flex: 0 },
      { headerName: 'Exam Center Code', minWidth: 150, valueGetter: (p) => txt(p.data?.examcenterCode ?? p.data?.examCenterCode) },
      { headerName: 'System Ip Address', minWidth: 160, valueGetter: (p) => txt(p.data?.systemIpAddress) },
      { headerName: 'Mac Address', minWidth: 160, valueGetter: (p) => txt(p.data?.macAddress) },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  async function loadData() {
    setLoading(true)
    try {
      const [configs, centerRows] = await Promise.all([
        listAllUnivEcQuestionPaperConfigs().catch(() => []),
        listAllActiveUnivExamCenters().catch(() => []),
      ])
      setRows(Array.isArray(configs) ? configs : [])
      setCenters(Array.isArray(centerRows) ? centerRows : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({
      univExamCentersId: centerOptions[0]?.value ?? '',
      systemIpAddress: '',
      macAddress: '',
      isActive: true,
      reason: 'active',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setForm({
      univExamCentersId: String(num(row.univExamCentersaId ?? row.univExamCentersId ?? row.univExamcenterId)),
      systemIpAddress: txt(row.systemIpAddress),
      macAddress: txt(row.macAddress),
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.univExamCentersId) return toastError('Exam Center is required.')
    if (!form.systemIpAddress.trim()) return toastError('System Ip Address is required.')
    if (!form.macAddress.trim()) return toastError('Mac Address is required.')
    if (!form.isActive && !form.reason.trim()) return toastError('Reason is required when inactive.')

    const payload: Record<string, unknown> = {
      univExamCentersId: Number(form.univExamCentersId),
      systemIpAddress: form.systemIpAddress.trim(),
      macAddress: form.macAddress.trim(),
      isActive: form.isActive,
      reason: form.isActive ? 'active' : form.reason.trim(),
    }

    setSaving(true)
    try {
      const id = pickUnivEcQuestionPaperConfigId(editing ?? {})
      if (id > 0) {
        await updateUnivEcQuestionPaperConfig(id, { ...payload, univEcQuestionPaperConfigId: id })
        toastSuccess('Question Paper Config updated.')
      } else {
        await createUnivEcQuestionPaperConfig(payload)
        toastSuccess('Question Paper Config created.')
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
      <PageHeader title="Examcenter Question Paper Config" subtitle="Exam papers delivery process · Examcenter Question Paper Config" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <BookMarked className="h-4 w-4 text-blue-700" aria-hidden />
          <h2 className="text-[14px] font-semibold text-[hsl(var(--card-title))]">Examcenter Question Paper Config</h2>
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
              pdfDocumentTitle: 'Examcenter Question Paper Config',
            }}
            toolbarTrailing={
              <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Question Paper Config
              </Button>
            }
          />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Question Paper Configs' : 'Add Question Paper Configs'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Center</Label>
            <Select options={centerOptions} value={form.univExamCentersId} onChange={(v) => setForm((f) => ({ ...f, univExamCentersId: v ?? '' }))} />
          </div>
          <div className="space-y-1">
            <Label>Stystem Ip Address</Label>
            <Input value={form.systemIpAddress} onChange={(e) => setForm((f) => ({ ...f, systemIpAddress: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Mac Address</Label>
            <Input value={form.macAddress} onChange={(e) => setForm((f) => ({ ...f, macAddress: e.target.value }))} />
          </div>
        </div>

        <ActiveStatusField
          isActive={form.isActive}
          reason={form.reason}
          onActiveChange={(v) => setForm((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setForm((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </PageContainer>
  )
}

