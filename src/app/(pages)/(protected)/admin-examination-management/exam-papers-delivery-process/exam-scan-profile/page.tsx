'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Pencil, Plus } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { FormModal } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GM_CODES } from '@/config/constants/ui'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getGeneralDetails } from '@/services/exam-master'
import {
  createUnivEcProfile,
  listAllActiveUnivEcProfiles,
  pickUnivEcProfileId,
  updateUnivEcProfile,
  type AnyRow,
} from '@/services/exam-papers-delivery'

type Row = AnyRow

type ScanProfileForm = {
  titleCatdetId: string
  name: string
  phone: string
  alternatePhoneNumber: string
  email: string
  aadharCard: string
  panCard: string
  startDate: string
  endDate: string
  isActive: boolean
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function getByPath(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key]
    return undefined
  }, row)
}

function pickText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = key.includes('.') ? getByPath(row, key) : row[key]
    if (value != null && String(value).trim() !== '') return txt(value)
  }
  return ''
}

function pickName(row: Row): string {
  const direct = pickText(row, [
    'scanProfileName',
    'scan_profile_name',
    'name',
    'Name',
    'fullName',
    'profileName',
    'profile_name',
    'evaluatorName',
    'evaluator_name',
    'examEvaluatorProfilesName',
    'exam_evaluator_profiles_name',
    'examEvaluatorProfileName',
    'employeeName',
    'employee.name',
    'employee.firstName',
    'employee.first_name',
    'staffName',
    'staff.name',
    'staff.firstName',
  ])
  if (direct) return direct

  const firstName = pickText(row, ['firstName', 'first_name'])
  const middleName = pickText(row, ['middleName', 'middle_name'])
  const lastName = pickText(row, ['lastName', 'last_name'])
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim()
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeActionRenderer(onEdit: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-700"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    )
  }
}

function makeDetailsRenderer(onDetails: (row: Row) => void) {
  return (p: ICellRendererParams<Row>) => {
    const row = p.data
    if (!row) return null
    return (
      <button
        type="button"
        className="text-blue-700 hover:underline text-xs font-medium"
        onClick={() => onDetails(row)}
      >
        Profile Details
      </button>
    )
  }
}

const EMPTY_FORM: ScanProfileForm = {
  titleCatdetId: '',
  name: '',
  phone: '',
  alternatePhoneNumber: '',
  email: '',
  aadharCard: '',
  panCard: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  isActive: true,
}

export default function ExamScanProfilePage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<ScanProfileForm>(EMPTY_FORM)
  const [titleOptions, setTitleOptions] = useState<SelectOption[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listAllActiveUnivEcProfiles()
      setRows(Array.isArray(list) ? list : [])
    } catch (e) {
      toastError(e, 'Failed to load exam scan profiles')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const rows = await getGeneralDetails(GM_CODES.TITLE)
        if (!mounted) return
        setTitleOptions(
          (rows ?? []).map((r) => ({
            value: String(r.generalDetailId ?? ''),
            label: r.generalDetailDisplayName ?? r.generalDetailCode ?? String(r.generalDetailId),
          })),
        )
      } catch {
        if (mounted) setTitleOptions([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [rows, search])

  const onDetails = useCallback((row: Row) => {
    const name = pickName(row)
    toastSuccess(`Profile details view for "${name || 'record'}" will be added next.`)
  }, [])

  const onEdit = useCallback((row: Row) => {
    setEditing(row)
    setForm({
      titleCatdetId: pickText(row, ['titleCatdetId', 'titleId', 'titleCatDetId']),
      name: pickName(row),
      phone: pickText(row, ['phone', 'phoneNumber', 'mobileNo', 'mobileNumber', 'contactNo']),
      alternatePhoneNumber: pickText(row, ['alternatePhoneNumber', 'alternatephoneNumber', 'altPhoneNumber']),
      email: pickText(row, ['email', 'emailId', 'mailId']),
      aadharCard: pickText(row, ['aadharCard', 'aadhaarCard', 'aadharNo', 'aadhaarNo', 'aadhar']),
      panCard: pickText(row, ['panCard', 'panNo', 'panCardNo', 'pancardNo', 'pan_number', 'pan_card_no']),
      startDate: pickText(row, ['startDate', 'profileValidFromDate', 'createdDt']).slice(0, 10),
      endDate: pickText(row, ['endDate', 'profileValidToDate']).slice(0, 10),
      isActive: row.isActive === true,
    })
    setModalOpen(true)
  }, [])

  function openCreateModal() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  async function onSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!form.titleCatdetId) return toastError('Title is required.')
    if (!form.name.trim()) return toastError('Name is required.')

    const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    const nowIso = new Date().toISOString()
    const payload: Record<string, unknown> = {
      titleCatdetId: Number(form.titleCatdetId),
      userId: null,
      scanProfileName: form.name.trim(),
      phoneNumber: form.phone.trim(),
      alternatePhoneNumber: form.alternatePhoneNumber.trim(),
      email: form.email.trim(),
      aadhaarNo: form.aadharCard.trim(),
      panCardNo: form.panCard.trim(),
      isActive: form.isActive,
      reason: '',
      profileValidFromDate: form.startDate || null,
      profileValidToDate: form.endDate || null,
      createdDt: nowIso,
      updatedDt: nowIso,
      createdUser: employeeId || null,
      updatedUser: employeeId || null,
    }

    setSaving(true)
    try {
      const id = pickUnivEcProfileId(editing ?? {})
      if (id > 0) {
        await updateUnivEcProfile(id, { ...payload, examScanProfileId: id })
        toastSuccess('Exam scan profile updated.')
      } else {
        await createUnivEcProfile(payload)
        toastSuccess('Exam scan profile created.')
      }
      setModalOpen(false)
      await loadData()
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: 'Name',
        minWidth: 180,
        valueGetter: (p) => pickName(p.data ?? {}),
      },
      {
        headerName: 'Phone',
        minWidth: 120,
        valueGetter: (p) =>
          pickText(p.data ?? {}, ['phone', 'phoneNumber', 'mobileNo', 'mobileNumber', 'contactNo', 'mobile']),
      },
      {
        headerName: 'Email',
        minWidth: 220,
        valueGetter: (p) => pickText(p.data ?? {}, ['email', 'emailId', 'mailId']),
      },
      {
        headerName: 'Aadhar Card',
        minWidth: 140,
        valueGetter: (p) =>
          pickText(p.data ?? {}, ['aadharCard', 'aadhaarCard', 'aadharNo', 'aadhaarNo', 'aadhar']),
      },
      {
        headerName: 'Pan Card',
        minWidth: 120,
        valueGetter: (p) =>
          pickText(p.data ?? {}, ['panCard', 'panNo', 'panCardNo', 'pancardNo', 'pan_number', 'pan_card_no']),
      },
      {
        headerName: 'Details',
        minWidth: 120,
        cellRenderer: makeDetailsRenderer(onDetails),
      },
      { headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 80,
        width: 80,
        flex: 0,
        cellRenderer: makeActionRenderer(onEdit),
      },
    ],
    [onDetails, onEdit],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Scan Profile" subtitle="Exam papers delivery process · Create exam scan profile" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search"
            className="w-full sm:max-w-xs"
          />
          <Button type="button" onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1" />
            Create Scan Profile
          </Button>
        </div>
        <div className="p-2">
          <DataTable rowData={filteredRows} columnDefs={columnDefs} loading={loading} pagination />
        </div>
      </div>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Exam Scan Profile' : 'Create Exam Scan Profile'}
        onSubmit={onSave}
        isSubmitting={saving}
        size="lg"
        titleClassName="text-[hsl(var(--primary))] font-semibold"
        showHeaderDivider
        showCloseButton={false}
        submitLabel="Save"
        cancelLabel="Close"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Select
              options={titleOptions}
              value={form.titleCatdetId}
              onChange={(v) => setForm((f) => ({ ...f, titleCatdetId: v ?? '' }))}
              placeholder="Select title"
            />
          </div>
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Phone Number *</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Alternate Phone *</Label>
            <Input
              value={form.alternatePhoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, alternatePhoneNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Aadhar *</Label>
            <Input
              value={form.aadharCard}
              onChange={(e) => setForm((f) => ({ ...f, aadharCard: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Pan Card No. *</Label>
            <Input value={form.panCard} onChange={(e) => setForm((f) => ({ ...f, panCard: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Start Date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>End Date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium md:col-span-3 mt-2">
            <input
              id="scanProfileIsActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <Label htmlFor="scanProfileIsActive">Active</Label>
          </div>
        </div>
      </FormModal>
    </PageContainer>
  )
}

