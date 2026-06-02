'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Filter, Pencil, Play, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable, TableCard } from '@/common/components/table'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import { resolveOrganizationId } from '@/lib/user-context'
import {
  bulkUpdateRemunerationStatus,
  listExaminationRemunerationDetails,
  listRolesByOrganization,
  listUnivExamFilters,
  runExamRemuneration,
  updateExaminationRemuneration,
} from '@/services'
import type { UnivExaminationRemuneration } from '@/types/committees'
import { BulkUpdateModal } from './BulkUpdateModal'
import { RunConfirmModal } from './RunConfirmModal'
import { UpdateStatusModal } from './UpdateStatusModal'

const REMUNERATION_STATUS = {
  PENDING: 318,
  APPROVED: 319,
} as const

function pickText(row: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value)
  }
  return ''
}

function pickNum(row: Record<string, unknown> | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const n = Number(row[key])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string | number): T[] {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function remunerationStatusVariant(statusId?: number): 'pending' | 'active' | 'inactive' {
  if (statusId === REMUNERATION_STATUS.APPROVED) return 'active'
  if (statusId === REMUNERATION_STATUS.PENDING) return 'pending'
  return 'inactive'
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivExaminationRemuneration>,
  profileName: {
    field: 'profileEmployeeName',
    headerName: 'Profile Name',
    minWidth: 180,
  } as ColDef<UnivExaminationRemuneration>,
  omrSerialNo: { field: 'omrSerialNo', headerName: 'OMR Serial No', minWidth: 140 } as ColDef<UnivExaminationRemuneration>,
  status: {
    field: 'remunerationStatusCatDetId',
    headerName: 'Status',
    minWidth: 120,
    flex: 0,
  } as ColDef<UnivExaminationRemuneration>,
  select: { headerName: 'Select', width: 80, flex: 0 } as ColDef<UnivExaminationRemuneration>,
  actions: { headerName: 'Actions', width: 90, flex: 0 } as ColDef<UnivExaminationRemuneration>,
}

function statusRenderer(p: ICellRendererParams<UnivExaminationRemuneration>) {
  const row = p.data
  if (!row) return null
  return (
    <StatusBadge
      status={remunerationStatusVariant(row.remunerationStatusCatDetId)}
      label={row.remunerationStatusName ?? undefined}
    />
  )
}

function makeSelectRenderer(
  selectedIds: Set<number>,
  onToggle: (id: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<UnivExaminationRemuneration>) => {
    const row = p.data
    if (!row) return null
    const id = row.univExaminationRemunerationId
    return (
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={selectedIds.has(id)}
        onChange={(e) => onToggle(id, e.target.checked)}
        aria-label={`Select ${row.profileEmployeeName ?? 'row'}`}
      />
    )
  }
}

function makeActionsRenderer(onEdit: (row: UnivExaminationRemuneration) => void) {
  return (p: ICellRendererParams<UnivExaminationRemuneration>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Edit remuneration status"
        onClick={() => onEdit(row)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function RemunerationApprovalsPage() {
  const queryClient = useQueryClient()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)
  const orgId = resolveOrganizationId(user)

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [orgCode, setOrgCode] = useState<string | null>(null)
  const [examMonthYear, setExamMonthYear] = useState<string | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [roleId, setRoleId] = useState<number | null>(null)

  const [pendingRows, setPendingRows] = useState<UnivExaminationRemuneration[]>([])
  const [approvedRows, setApprovedRows] = useState<UnivExaminationRemuneration[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [running, setRunning] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [updateSubmitting, setUpdateSubmitting] = useState(false)

  const [runConfirmOpen, setRunConfirmOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<UnivExaminationRemuneration | null>(null)

  const filtersReady = orgId > 0 && employeeId > 0

  const { data: filterRows = [], isLoading: loadingFilters } = useQuery({
    queryKey: QK.examinationRemuneration.univExamFilters(orgId, employeeId),
    queryFn: () => listUnivExamFilters(orgId, employeeId),
    enabled: filtersReady,
  })

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['Committees', 'roles', orgId],
    queryFn: () => listRolesByOrganization(orgId),
    enabled: orgId > 0,
  })

  const orgOptions = useMemo(
    () =>
      dedupeBy(filterRows, (r) => pickText(r as Record<string, unknown>, ['org_code'])).map((r) => {
        const code = pickText(r as Record<string, unknown>, ['org_code'])
        return { value: code, label: code }
      }),
    [filterRows],
  )

  const monthYearOptions = useMemo(() => {
    const base = orgCode
      ? filterRows.filter((r) => pickText(r as Record<string, unknown>, ['org_code']) === orgCode)
      : filterRows
    return dedupeBy(base, (r) => pickText(r as Record<string, unknown>, ['exam_month_yr'])).map((r) => {
      const value = pickText(r as Record<string, unknown>, ['exam_month_yr'])
      return { value, label: value }
    })
  }, [filterRows, orgCode])

  const examOptions = useMemo(() => {
    const base = filterRows.filter((r) => {
      const row = r as Record<string, unknown>
      const orgOk = !orgCode || pickText(row, ['org_code']) === orgCode
      const monthOk = !examMonthYear || pickText(row, ['exam_month_yr']) === examMonthYear
      return orgOk && monthOk
    })
    return dedupeBy(base, (r) => pickNum(r as Record<string, unknown>, ['pk_university_exam_id'])).map((r) => {
      const row = r as Record<string, unknown>
      const id = pickNum(row, ['pk_university_exam_id'])
      const name = pickText(row, ['exam_name']) || `Exam ${id}`
      return { value: String(id), label: name }
    })
  }, [filterRows, orgCode, examMonthYear])

  const selectedExamName = useMemo(() => {
    const match = filterRows.find(
      (r) => pickNum(r as Record<string, unknown>, ['pk_university_exam_id']) === Number(examId),
    )
    return match ? pickText(match as Record<string, unknown>, ['exam_name']) : ''
  }, [filterRows, examId])

  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: String(role.roleId),
        label: role.roleName,
      })),
    [roles],
  )

  useEffect(() => {
    if (!orgCode && orgOptions[0]) setOrgCode(orgOptions[0].value)
  }, [orgOptions, orgCode])

  useEffect(() => {
    if (!examMonthYear && monthYearOptions[0]) setExamMonthYear(monthYearOptions[0].value)
  }, [monthYearOptions, examMonthYear])

  useEffect(() => {
    if (!examId && examOptions[0]) setExamId(Number(examOptions[0].value))
  }, [examOptions, examId])

  useEffect(() => {
    setPendingRows([])
    setApprovedRows([])
    setSelectedIds(new Set())
  }, [orgCode, examMonthYear, examId, roleId])

  const openEdit = useCallback((row: UnivExaminationRemuneration) => {
    setEditingRow(row)
    setEditOpen(true)
  }, [])

  const toggleSelected = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const pendingColumnDefs = useMemo<ColDef<UnivExaminationRemuneration>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.profileName,
      COL_DEFS.omrSerialNo,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.select, cellRenderer: makeSelectRenderer(selectedIds, toggleSelected) },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [selectedIds, toggleSelected, openEdit],
  )

  const approvedColumnDefs = useMemo<ColDef<UnivExaminationRemuneration>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.profileName,
      COL_DEFS.omrSerialNo,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  )

  async function loadDetails() {
    if (!examId) {
      toastError('Please select an exam')
      return
    }
    setLoadingDetails(true)
    try {
      const rows = await listExaminationRemunerationDetails({
        examId,
        roleId: roleId ?? undefined,
      })
      const pending = rows.filter((r) => r.remunerationStatusCatDetId === REMUNERATION_STATUS.PENDING)
      const approved = rows.filter((r) => r.remunerationStatusCatDetId === REMUNERATION_STATUS.APPROVED)
      setPendingRows(pending)
      setApprovedRows(approved)
      setSelectedIds(new Set())
      toastSuccess(`Loaded ${rows.length} remuneration record${rows.length === 1 ? '' : 's'}`)
    } catch (error) {
      toastError(error, 'Failed to load remuneration details')
    } finally {
      setLoadingDetails(false)
    }
  }

  async function handleRunConfirm() {
    if (!examId || !examMonthYear) {
      toastError('Please select exam month/year and exam')
      return
    }
    setRunning(true)
    try {
      await runExamRemuneration({
        orgId,
        examMonthYear,
        examId,
        roleId: roleId ?? undefined,
      })
      toastSuccess('Remuneration calculation completed')
      setRunConfirmOpen(false)
      await loadDetails()
    } catch (error) {
      toastError(error, 'Failed to run remuneration calculation')
    } finally {
      setRunning(false)
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.size === 0) return
    setBulkSubmitting(true)
    try {
      const payload = [...selectedIds].map((id) => ({
        univExaminationRemunerationId: id,
        remunerationStatusCatDetId: REMUNERATION_STATUS.APPROVED,
      }))
      await bulkUpdateRemunerationStatus(payload)
      toastSuccess(`Approved ${payload.length} record${payload.length === 1 ? '' : 's'}`)
      setBulkModalOpen(false)
      setSelectedIds(new Set())
      await loadDetails()
      await queryClient.invalidateQueries({ queryKey: QK.examinationRemuneration.all })
    } catch (error) {
      toastError(error, 'Failed to bulk approve remuneration')
    } finally {
      setBulkSubmitting(false)
    }
  }

  async function handleUpdateStatus(id: number, remunerationStatusCatDetId: number) {
    setUpdateSubmitting(true)
    try {
      await updateExaminationRemuneration(id, { remunerationStatusCatDetId })
      toastSuccess('Remuneration status updated')
      setEditOpen(false)
      setEditingRow(null)
      await loadDetails()
      await queryClient.invalidateQueries({ queryKey: QK.examinationRemuneration.all })
    } catch (error) {
      toastError(error, 'Failed to update remuneration status')
    } finally {
      setUpdateSubmitting(false)
    }
  }

  const filtersLoading = sessionLoading || empResolving || loadingFilters || loadingRoles

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Remuneration Approvals" />

      <div className="app-card overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold text-primary">Filters</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm text-foreground"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span>Filter</span>
            <Filter className="h-4 w-4" />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen ? (
          <div className="grid grid-cols-1 items-end gap-3 p-4 md:grid-cols-12">
            <Select
              label="Org Code"
              required
              className="md:col-span-2"
              value={orgCode}
              onChange={setOrgCode}
              options={orgOptions}
              placeholder="Select org"
              searchable
              isLoading={filtersLoading}
            />
            <Select
              label="Exam Month/Year"
              required
              className="md:col-span-2"
              value={examMonthYear}
              onChange={setExamMonthYear}
              options={monthYearOptions}
              placeholder="Select month/year"
              searchable
              disabled={!orgCode}
            />
            <Select
              label="Exam"
              required
              className="md:col-span-3"
              value={examId ? String(examId) : null}
              onChange={(v) => setExamId(v ? Number(v) : null)}
              options={examOptions}
              placeholder="Select exam"
              searchable
              disabled={!examMonthYear}
            />
            <Select
              label="Role"
              className="md:col-span-2"
              value={roleId ? String(roleId) : null}
              onChange={(v) => setRoleId(v ? Number(v) : null)}
              options={roleOptions}
              placeholder="All roles"
              searchable
              clearable
              isLoading={loadingRoles}
            />
            <div className="flex flex-wrap gap-2 md:col-span-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRunConfirmOpen(true)}
                disabled={!examId || !examMonthYear || running}
              >
                <Play className="mr-1.5 h-4 w-4" />
                Run
              </Button>
              <Button
                type="button"
                onClick={() => void loadDetails()}
                disabled={!examId || loadingDetails}
              >
                <RefreshCw className={`mr-1.5 h-4 w-4 ${loadingDetails ? 'animate-spin' : ''}`} />
                Load
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <TableCard
        headerLeft={<h3 className="text-sm font-semibold text-primary">Pending Approvals</h3>}
        headerRight={
          pendingRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkModalOpen(true)}
            >
              Bulk Approve ({selectedIds.size})
            </Button>
          ) : undefined
        }
      >
        <DataTable
          rowData={pendingRows}
          columnDefs={pendingColumnDefs}
          loading={loadingDetails}
          height="360px"
          getRowId={(p) => String(p.data.univExaminationRemunerationId)}
        />
      </TableCard>

      <TableCard headerLeft={<h3 className="text-sm font-semibold text-primary">Approved Remuneration</h3>}>
        <DataTable
          rowData={approvedRows}
          columnDefs={approvedColumnDefs}
          loading={loadingDetails}
          height="360px"
          getRowId={(p) => String(p.data.univExaminationRemunerationId)}
        />
      </TableCard>

      <RunConfirmModal
        open={runConfirmOpen}
        onClose={() => setRunConfirmOpen(false)}
        examName={selectedExamName}
        examMonthYear={examMonthYear ?? undefined}
        onConfirm={() => void handleRunConfirm()}
        isSubmitting={running}
      />

      <BulkUpdateModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        count={selectedIds.size}
        onConfirm={() => void handleBulkApprove()}
        isSubmitting={bulkSubmitting}
      />

      <UpdateStatusModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditingRow(null)
        }}
        row={editingRow}
        onSave={(id, statusId) => void handleUpdateStatus(id, statusId)}
        isSubmitting={updateSubmitting}
      />
    </PageContainer>
  )
}
