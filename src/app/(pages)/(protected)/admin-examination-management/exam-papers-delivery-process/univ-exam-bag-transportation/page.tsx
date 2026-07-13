'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Plus } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
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
  createExamBagTransportation,
  listAllActiveUnivExamBags,
  listAllActiveUnivExamCenters,
  listAllActiveUnivExamRegionalCenters,
  listExamBagTransportationByFilters,
  pickUnivExamBagTransportationId,
  updateExamBagTransportation,
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

export default function UnivExamBagTransportationPage() {
  const [loadingFilters, setLoadingFilters] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTable, setShowTable] = useState(false)

  const [regionalCenters, setRegionalCenters] = useState<Row[]>([])
  const [centers, setCenters] = useState<Row[]>([])
  const [bags, setBags] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])

  const [form, setForm] = useState({
    univExamReionalCenterId: '',
    univExamcenterId: '',
    univExamBagId: '',
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModal, setFormModal] = useState({
    vehicleNumber: '',
    vehicleDetails: '',
    driverName: '',
    driverPhoneNumber: '',
    receiveDate: '',
    dispatchDate: '',
    isActive: true,
    reason: '',
  })

  const regionalOptions: SelectOption[] = useMemo(
    () =>
      regionalCenters.map((r) => ({
        value: String(num(r.univExamReionalCenterId ?? r.univExamRegionalCenterId)),
        label: txt(r.examReionalCenterCode ?? r.examRegionalCenterCode),
      })),
    [regionalCenters],
  )
  const centerOptions: SelectOption[] = useMemo(
    () =>
      centers.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [centers],
  )
  const bagOptions: SelectOption[] = useMemo(
    () =>
      bags.map((b) => ({
        value: String(num(b.univExamBagId ?? b.univ_exam_bag_id)),
        label: txt(b.bagSerialNo),
      })),
    [bags],
  )

  const headerText = useMemo(() => {
    const r = regionalCenters.find((x) => num(x.univExamReionalCenterId ?? x.univExamRegionalCenterId) === Number(form.univExamReionalCenterId))
    const c = centers.find((x) => num(x.univExamcenterId ?? x.univExamCenterId) === Number(form.univExamcenterId))
    const b = bags.find((x) => num(x.univExamBagId ?? x.univ_exam_bag_id) === Number(form.univExamBagId))
    return `${txt(r?.examReionalCenterCode ?? r?.examRegionalCenterCode)} / ${txt(c?.examcenterName ?? c?.examCenterName)} / ${txt(b?.bagSerialNo)}`
  }, [regionalCenters, centers, bags, form])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SL No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Vehicle Number', minWidth: 130, valueGetter: (p) => txt(p.data?.vehicleNumber) },
      { headerName: 'Vehicle Details', minWidth: 150, valueGetter: (p) => txt(p.data?.vehicleDetails) },
      { headerName: 'Driver Name', minWidth: 130, valueGetter: (p) => txt(p.data?.driverName) },
      { headerName: 'Driver Phone Number', minWidth: 160, valueGetter: (p) => txt(p.data?.driverPhoneNumber) },
      { headerName: 'Receive Date', minWidth: 130, valueGetter: (p) => txt(p.data?.receiveDate) },
      { headerName: 'Dispatch Date', minWidth: 130, valueGetter: (p) => txt(p.data?.dispatchDate) },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 72, width: 72, flex: 0, cellRenderer: makeEditRenderer(onEdit) },
    ],
    [],
  )

  useEffect(() => {
    async function loadFilters() {
      setLoadingFilters(true)
      try {
        const [r, c, b] = await Promise.all([
          listAllActiveUnivExamRegionalCenters().catch(() => []),
          listAllActiveUnivExamCenters().catch(() => []),
          listAllActiveUnivExamBags().catch(() => []),
        ])
        setRegionalCenters(Array.isArray(r) ? r : [])
        setCenters(Array.isArray(c) ? c : [])
        setBags(Array.isArray(b) ? b : [])
      } finally {
        setLoadingFilters(false)
      }
    }
    void loadFilters()
  }, [])

  useEffect(() => {
    if (!form.univExamReionalCenterId && regionalOptions.length) {
      setForm((f) => ({ ...f, univExamReionalCenterId: regionalOptions[0].value }))
    }
  }, [regionalOptions, form.univExamReionalCenterId])
  useEffect(() => {
    if (!form.univExamcenterId && centerOptions.length) {
      setForm((f) => ({ ...f, univExamcenterId: centerOptions[0].value }))
    }
  }, [centerOptions, form.univExamcenterId])
  useEffect(() => {
    if (!form.univExamBagId && bagOptions.length) {
      setForm((f) => ({ ...f, univExamBagId: bagOptions[0].value }))
    }
  }, [bagOptions, form.univExamBagId])

  async function onGetList() {
    if (!form.univExamReionalCenterId || !form.univExamcenterId || !form.univExamBagId) {
      toastError('Select all filters.')
      return
    }
    setLoadingList(true)
    try {
      const list = await listExamBagTransportationByFilters(
        Number(form.univExamReionalCenterId),
        Number(form.univExamcenterId),
        Number(form.univExamBagId),
      )
      setRows(Array.isArray(list) ? list : [])
      setShowTable(true)
    } catch (e) {
      toastError(e, 'Failed to load bag transportation')
      setRows([])
      setShowTable(false)
    } finally {
      setLoadingList(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormModal({
      vehicleNumber: '',
      vehicleDetails: '',
      driverName: '',
      driverPhoneNumber: '',
      receiveDate: '',
      dispatchDate: '',
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  function onEdit(row: Row) {
    setEditing(row)
    setFormModal({
      vehicleNumber: txt(row.vehicleNumber),
      vehicleDetails: txt(row.vehicleDetails),
      driverName: txt(row.driverName),
      driverPhoneNumber: txt(row.driverPhoneNumber),
      receiveDate: txt(row.receiveDate)?.slice(0, 10),
      dispatchDate: txt(row.dispatchDate)?.slice(0, 10),
      isActive: row.isActive === true,
      reason: txt(row.reason),
    })
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.univExamReionalCenterId || !form.univExamcenterId || !form.univExamBagId) {
      toastError('Select filters first.')
      return
    }
    if (!formModal.vehicleNumber.trim()) {
      toastError('Vehicle Number is required.')
      return
    }
    if (!formModal.vehicleDetails.trim()) {
      toastError('Vehicle Details is required.')
      return
    }
    if (!formModal.driverName.trim()) {
      toastError('Driver Name is required.')
      return
    }
    if (!/^\d{10}$/.test(formModal.driverPhoneNumber.trim())) {
      toastError('Enter valid 10-digit driver phone number.')
      return
    }
    if (!formModal.receiveDate) {
      toastError('Receive Date is required.')
      return
    }
    if (!formModal.dispatchDate) {
      toastError('Dispatch Date is required.')
      return
    }
    if (!formModal.isActive && !formModal.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      univExamReionalCenterId: Number(form.univExamReionalCenterId),
      univExamcenterId: Number(form.univExamcenterId),
      univExamBagId: Number(form.univExamBagId),
      vehicleNumber: formModal.vehicleNumber.trim(),
      vehicleDetails: formModal.vehicleDetails.trim(),
      driverName: formModal.driverName.trim(),
      driverPhoneNumber: formModal.driverPhoneNumber.trim(),
      receiveDate: formModal.receiveDate,
      dispatchDate: formModal.dispatchDate,
      isActive: formModal.isActive,
      reason: formModal.isActive ? '' : formModal.reason.trim(),
    }

    setSaving(true)
    try {
      const id = pickUnivExamBagTransportationId(editing ?? {})
      if (id > 0) {
        await updateExamBagTransportation(id, payload)
        toastSuccess('Bag transportation updated.')
      } else {
        await createExamBagTransportation(payload)
        toastSuccess('Bag transportation created.')
      }
      setModalOpen(false)
      await onGetList()
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FilteredListPage
      title="Exam Bag Transportation"
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-4"><Label>Exam Regional Center</Label><Select options={regionalOptions} value={form.univExamReionalCenterId} onChange={(v) => setForm((f) => ({ ...f, univExamReionalCenterId: v ?? '' }))} disabled={loadingFilters} /></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam Center</Label><Select options={centerOptions} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v ?? '' }))} /></div>
          <div className="space-y-1 md:col-span-3"><Label>Exam Bags</Label><Select options={bagOptions} value={form.univExamBagId} onChange={(v) => setForm((f) => ({ ...f, univExamBagId: v ?? '' }))} /></div>
          <div className="md:col-span-1"><Button type="button" onClick={() => void onGetList()} disabled={loadingList}>Get List</Button></div>
        </div>
      )}
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Exam Bag Transportation',
      }}
      toolbarLeading={
        showTable ? (
          <span className="text-[12px] font-medium text-[hsl(var(--primary))] truncate max-w-[min(100%,40rem)]">
            {headerText}
          </span>
        ) : null
      }
      toolbarTrailing={
        <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Bag Transportation
        </Button>
      }
    >
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Exam Bag Transportation' : 'Add Exam Bag Transportation'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-1">
            <Label>Vehicle Number</Label>
            <Input value={formModal.vehicleNumber} onChange={(e) => setFormModal((f) => ({ ...f, vehicleNumber: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Vehicle Details</Label>
            <Input value={formModal.vehicleDetails} onChange={(e) => setFormModal((f) => ({ ...f, vehicleDetails: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Driver Name</Label>
            <Input value={formModal.driverName} onChange={(e) => setFormModal((f) => ({ ...f, driverName: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Driver Phone Number</Label>
            <Input value={formModal.driverPhoneNumber} onChange={(e) => setFormModal((f) => ({ ...f, driverPhoneNumber: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Receive Date</Label>
            <Input type="date" value={formModal.receiveDate} onChange={(e) => setFormModal((f) => ({ ...f, receiveDate: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <Label>Dispatch Date</Label>
            <Input type="date" value={formModal.dispatchDate} onChange={(e) => setFormModal((f) => ({ ...f, dispatchDate: e.target.value }))} />
          </div>
        </div>

        <ActiveStatusField
          isActive={formModal.isActive}
          reason={formModal.reason}
          onActiveChange={(v) => setFormModal((f) => ({ ...f, isActive: v === true }))}
          onReasonChange={(v) => setFormModal((f) => ({ ...f, reason: v }))}
        />
      </FormModal>
    </FilteredListPage>
  )
}

