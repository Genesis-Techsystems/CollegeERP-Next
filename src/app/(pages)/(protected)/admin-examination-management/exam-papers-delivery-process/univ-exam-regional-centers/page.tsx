'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter, Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createUnivExamRegionalCenter,
  listActiveCities,
  listUnivExamRegionalCentersByUniversity,
  pickUnivExamRegionalCenterId,
  updateUnivExamRegionalCenter,
  type AnyRow,
} from '@/services/exam-papers-delivery'
import { listActiveUniversities } from '@/services/admin/university'

type RegionalRow = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function pickUniversityId(u: AnyRow): number {
  return num(u.universityId ?? u.university_id ?? u.fk_university_id)
}

function pickUniversityLabel(u: AnyRow): string {
  return String(u.universityCode ?? u.university_code ?? u.university_name ?? u.universityName ?? '-')
}

function pickCityCode(row: RegionalRow): string {
  const nested = row.city ?? row.City
  if (nested && typeof nested === 'object') {
    return String((nested as AnyRow).cityCode ?? (nested as AnyRow).city_code ?? '-')
  }
  return String(row.cityCode ?? row.city_code ?? '-')
}

function pickCityId(row: RegionalRow): number {
  const nested = row.city ?? row.City
  if (nested && typeof nested === 'object') {
    return num((nested as AnyRow).cityId ?? (nested as AnyRow).city_id ?? (nested as AnyRow).id)
  }
  return num(row.cityId ?? row.city_id ?? row.fk_city_id)
}

function pickCode(row: RegionalRow): string {
  return String(row.examReionalCenterCode ?? row.examRegionalCenterCode ?? row.exam_reional_center_code ?? '')
}

function pickName(row: RegionalRow): string {
  return String(row.examReionalCenterName ?? row.examRegionalCenterName ?? row.exam_reional_center_name ?? '')
}

function statusRenderer(p: ICellRendererParams<RegionalRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeEditRenderer(onEdit: (row: RegionalRow) => void) {
  return (p: ICellRendererParams<RegionalRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-700"
        aria-label="Edit"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

export default function UnivExamRegionalCentersPage() {
  const [loadingUni, setLoadingUni] = useState(true)
  const [universities, setUniversities] = useState<AnyRow[]>([])
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(true)

  const [loadingList, setLoadingList] = useState(false)
  const [rows, setRows] = useState<RegionalRow[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RegionalRow | null>(null)
  const [saving, setSaving] = useState(false)

  const [cities, setCities] = useState<AnyRow[]>([])

  const [form, setForm] = useState({
    examReionalCenterName: '',
    examReionalCenterCode: '',
    longitude: '',
    latitude: '',
    addressLine1: '',
    addressLine2: '',
    cityId: '' as string,
    pincode: '',
    isActive: true,
    reason: '',
  })

  const universityOptions: SelectOption[] = useMemo(
    () =>
      universities.map((u) => ({
        value: String(pickUniversityId(u)),
        label: pickUniversityLabel(u),
      })),
    [universities],
  )

  const cityOptions: SelectOption[] = useMemo(
    () =>
      cities.map((c) => ({
        value: String(num(c.cityId ?? c.city_id)),
        label: String(c.cityCode ?? c.city_code ?? c.cityName ?? c.city_name ?? '-'),
      })),
    [cities],
  )

  const selectedUniversityCode = useMemo(() => {
    const hit = universities.find((u) => pickUniversityId(u) === universityId)
    return hit ? pickUniversityLabel(hit) : ''
  }, [universities, universityId])
  const modalSuffix = selectedUniversityCode ? ` - ${selectedUniversityCode}` : ''
  const modalTitle = editing ? `Edit exam regional center${modalSuffix}` : `Add exam regional center${modalSuffix}`

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingUni(true)
      try {
        // Angular getData(): load all active universities, then auto-select the first.
        const list = await listActiveUniversities()
        if (cancelled) return
        const arr = (Array.isArray(list) ? list : []) as unknown as AnyRow[]
        setUniversities(arr)
        if (arr.length > 0) setUniversityId(pickUniversityId(arr[0]))
      } catch (e) {
        toastError(e, 'Failed to load universities')
        setUniversities([])
      } finally {
        if (!cancelled) setLoadingUni(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadCities() {
      try {
        const list = await listActiveCities()
        if (!cancelled) setCities(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setCities([])
      }
    }
    void loadCities()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchList = useCallback(async () => {
    if (!universityId) {
      toastError('Please select a university.')
      return
    }
    setLoadingList(true)
    try {
      const list = await listUnivExamRegionalCentersByUniversity(universityId)
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      toastError(e, 'Failed to load exam regional centers')
      setRows([])
    } finally {
      setLoadingList(false)
    }
  }, [universityId])

  useEffect(() => {
    if (!universityId) return
    void fetchList()
  }, [universityId, fetchList])

  const handleEditRow = useCallback((row: RegionalRow) => {
    setEditing(row)
    setForm({
      examReionalCenterName: pickName(row),
      examReionalCenterCode: pickCode(row),
      longitude: String(row.longitude ?? ''),
      latitude: String(row.latitude ?? ''),
      addressLine1: String(row.addressLine1 ?? ''),
      addressLine2: String(row.addressLine2 ?? ''),
      cityId: String(pickCityId(row) || ''),
      pincode: String(row.pincode ?? ''),
      isActive: Boolean(row.isActive),
      reason: String(row.reason ?? ''),
    })
    setModalOpen(true)
  }, [])

  const columnDefs = useMemo<ColDef<RegionalRow>[]>(
    () => [
      { headerName: 'S.No.', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Regional Center Code', minWidth: 180, valueGetter: (p) => pickCode(p.data ?? {}) },
      { field: 'longitude', headerName: 'Longitude', minWidth: 120, valueGetter: (p) => String(p.data?.longitude ?? '-') },
      { field: 'latitude', headerName: 'Latitude', minWidth: 120, valueGetter: (p) => String(p.data?.latitude ?? '-') },
      { field: 'addressLine1', headerName: 'Address Line1', minWidth: 170, valueGetter: (p) => String(p.data?.addressLine1 ?? '-') },
      { field: 'addressLine2', headerName: 'Address Line2', minWidth: 170, valueGetter: (p) => String(p.data?.addressLine2 ?? '-') },
      { headerName: 'City', minWidth: 130, valueGetter: (p) => pickCityCode(p.data ?? {}) },
      { field: 'pincode', headerName: 'Pincode', minWidth: 110, valueGetter: (p) => String(p.data?.pincode ?? '-') },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      { headerName: 'Actions', minWidth: 72, flex: 0, width: 72, cellRenderer: makeEditRenderer(handleEditRow) },
    ],
    [handleEditRow],
  )

  function openCreate() {
    if (!universityId) {
      toastError('Please select a university.')
      return
    }
    setEditing(null)
    setForm({
      examReionalCenterName: '',
      examReionalCenterCode: '',
      longitude: '',
      latitude: '',
      addressLine1: '',
      addressLine2: '',
      cityId: cityOptions[0]?.value ?? '',
      pincode: '',
      isActive: true,
      reason: '',
    })
    setModalOpen(true)
  }

  async function onSubmitModal(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!universityId) return
    if (!form.examReionalCenterName.trim()) {
      toastError('Exam regional center name is required.')
      return
    }
    if (!form.cityId) {
      toastError('Select city.')
      return
    }
    if (!form.isActive && !form.reason.trim()) {
      toastError('Reason is required when inactive.')
      return
    }

    const payload: Record<string, unknown> = {
      universityId,
      examReionalCenterName: form.examReionalCenterName.trim(),
      examReionalCenterCode: form.examReionalCenterCode.trim(),
      longitude: form.longitude.trim(),
      latitude: form.latitude.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      cityId: Number(form.cityId),
      pincode: form.pincode.trim(),
      isActive: form.isActive,
      reason: form.isActive ? '' : form.reason.trim(),
    }

    setSaving(true)
    try {
      const id = pickUnivExamRegionalCenterId(editing ?? {})
      if (id > 0) {
        await updateUnivExamRegionalCenter(id, { ...payload, univExamReionalCenterId: id })
        toastSuccess('Exam regional center updated.')
      } else {
        await createUnivExamRegionalCenter(payload)
        toastSuccess('Exam regional center created.')
      }
      setModalOpen(false)
      await fetchList()
    } catch (err) {
      toastError(err, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Exam regional centers"
        subtitle="Exam papers delivery process · Regional centers"
      />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="app-card-title truncate">
              Exam Regional Centers
            </h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1 w-full sm:w-72">
              <Label>
                University <span className="text-destructive">*</span>
              </Label>
              <Select
                options={universityOptions}
                value={universityId === null ? '' : String(universityId)}
                onChange={(v) => setUniversityId(v ? Number(v) : null)}
                placeholder={loadingUni ? 'Loading…' : 'Select university'}
                disabled={loadingUni || universityOptions.length === 0}
              />
            </div>
            <Button type="button" onClick={() => void fetchList()} disabled={loadingList || universityId == null}>
              Get List
            </Button>
          </div>
        )}
      </div>

      {universityId != null && (
        <>
          <div className="app-card overflow-hidden border-t-[3px] border-t-amber-300">
            <div className="px-3 py-2 border-b border-border bg-muted/40">
              <h3 className="app-card-title">Exam Regional Centers - {selectedUniversityCode || '-'}</h3>
            </div>
            <div className="p-2">
              <DataTable
                rowData={rows}
                columnDefs={columnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Exam Regional Centers',
                }}
                toolbarTrailing={
                  <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={openCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Exam Regional Centers
                  </Button>
                }
              />
            </div>
          </div>
        </>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        onSubmit={onSubmitModal}
        isSubmitting={saving}
        size="xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Exam Regional Center Name</Label>
            <Input
              value={form.examReionalCenterName}
              onChange={(e) => setForm((f) => ({ ...f, examReionalCenterName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Exam Regional Center Code</Label>
            <Input
              value={form.examReionalCenterCode}
              onChange={(e) => setForm((f) => ({ ...f, examReionalCenterCode: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Longitude</Label>
            <Input
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Latitude</Label>
            <Input
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line1</Label>
            <Input
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Address Line2</Label>
            <Input
              value={form.addressLine2}
              onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Select
              options={cityOptions}
              value={form.cityId}
              onChange={(v) => setForm((f) => ({ ...f, cityId: v ?? '' }))}
              placeholder="Select city"
            />
          </div>
          <div className="space-y-1">
            <Label>Pincode</Label>
            <Input
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
            />
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

