'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import { resolveOrganizationId } from '@/lib/user-context'
import {
  listRemunerationPaymentSummary,
  listRolesByOrganization,
  listUnivExamFilters,
  submitRemunerationPayment,
} from '@/services'
import type { RemunerationPaymentSummary } from '@/types/committees'
import { PaymentModal } from './PaymentModal'

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

function rowKey(row: RemunerationPaymentSummary): string {
  return (
    row.pk_univ_examinationremuneration_ids ??
    String(row.fk_univ_remuneration_trsansaction_id ?? row.remuneration_to ?? '')
  )
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<RemunerationPaymentSummary>,
  role: { field: 'role_name', headerName: 'Role', minWidth: 140 } as ColDef<RemunerationPaymentSummary>,
  profileName: { field: 'remuneration_to', headerName: 'Profile Name', minWidth: 180 } as ColDef<RemunerationPaymentSummary>,
  examMonth: { field: 'exam_month_yr', headerName: 'Exam Month', minWidth: 120 } as ColDef<RemunerationPaymentSummary>,
  totalPapers: { field: 'total_nos', headerName: 'Total Papers', minWidth: 110, flex: 0 } as ColDef<RemunerationPaymentSummary>,
  amount: { field: 'total_amount', headerName: 'Amount', minWidth: 110, flex: 0 } as ColDef<RemunerationPaymentSummary>,
  receipt: { headerName: 'Receipt', minWidth: 120, flex: 0 } as ColDef<RemunerationPaymentSummary>,
  payment: { headerName: 'Payment', minWidth: 110, flex: 0, width: 110 } as ColDef<RemunerationPaymentSummary>,
}

function receiptRenderer(p: ICellRendererParams<RemunerationPaymentSummary>) {
  const row = p.data
  if (!row) return null
  if (row.fk_univ_remuneration_trsansaction_id) {
    return <span className="text-xs text-emerald-700">Paid (#{row.fk_univ_remuneration_trsansaction_id})</span>
  }
  return <span className="text-xs text-muted-foreground">Pending</span>
}

function makePaymentRenderer(
  onPay: (row: RemunerationPaymentSummary) => void,
) {
  return (p: ICellRendererParams<RemunerationPaymentSummary>) => {
    const row = p.data
    if (!row) return null
    const paid = Boolean(row.fk_univ_remuneration_trsansaction_id)
    return (
      <Button
        type="button"
        size="sm"
        className="h-[30px] bg-[#f0c040] px-4 text-[12px] font-medium text-slate-900 hover:bg-[#e5b535]"
        disabled={paid || !row.pk_univ_examinationremuneration_ids}
        onClick={() => onPay(row)}
      >
        Payment
      </Button>
    )
  }
}

export default function RemunerationPaymentPage() {
  const queryClient = useQueryClient()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)
  const orgId = resolveOrganizationId(user)

  const [orgCode, setOrgCode] = useState<string | null>(null)
  const [examMonthYear, setExamMonthYear] = useState<string | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [roleId, setRoleId] = useState<number | null>(null)

  const [rows, setRows] = useState<RemunerationPaymentSummary[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentRow, setPaymentRow] = useState<RemunerationPaymentSummary | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    setRows([])
  }, [orgCode, examMonthYear, examId, roleId])

  const openPayment = useCallback((row: RemunerationPaymentSummary) => {
    setPaymentRow(row)
    setPaymentOpen(true)
  }, [])

  const columnDefs = useMemo<ColDef<RemunerationPaymentSummary>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.role,
      COL_DEFS.profileName,
      COL_DEFS.examMonth,
      COL_DEFS.totalPapers,
      COL_DEFS.amount,
      { ...COL_DEFS.receipt, cellRenderer: receiptRenderer },
      { ...COL_DEFS.payment, cellRenderer: makePaymentRenderer(openPayment) },
    ],
    [openPayment],
  )

  async function loadSummary() {
    if (!examId || !examMonthYear) {
      toastError('Please select exam month/year and exam')
      return
    }
    setLoadingSummary(true)
    try {
      const list = await listRemunerationPaymentSummary({
        orgId,
        examMonthYear,
        examId,
        roleId: roleId ?? undefined,
      })
      setRows(list)
      toastSuccess(`Loaded ${list.length} payment summar${list.length === 1 ? 'y' : 'ies'}`)
    } catch (error) {
      toastError(error, 'Failed to load payment summary')
    } finally {
      setLoadingSummary(false)
    }
  }

  async function handleSubmitPayment(payload: Record<string, unknown>) {
    if (!paymentRow?.pk_univ_examinationremuneration_ids) return
    setSubmitting(true)
    try {
      await submitRemunerationPayment(paymentRow.pk_univ_examinationremuneration_ids, payload)
      toastSuccess('Remuneration payment submitted')
      setPaymentOpen(false)
      setPaymentRow(null)
      await loadSummary()
      await queryClient.invalidateQueries({ queryKey: QK.examinationRemuneration.all })
    } catch (error) {
      toastError(error, 'Failed to submit remuneration payment')
    } finally {
      setSubmitting(false)
    }
  }

  const filtersLoading = sessionLoading || empResolving || loadingFilters || loadingRoles

  return (
    <FilteredListPage
      title="Remuneration Payment"
      filters={(
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
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
          <div className="md:col-span-3">
            <Button
              type="button"
              onClick={() => void loadSummary()}
              disabled={!examId || !examMonthYear || loadingSummary}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loadingSummary ? 'animate-spin' : ''}`} />
              Load
            </Button>
          </div>
        </div>
      )}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingSummary}
      height="480px"
      getRowId={(p) => rowKey(p.data)}
      toolbar={false}
    >
      <PaymentModal
        open={paymentOpen}
        onClose={() => {
          setPaymentOpen(false)
          setPaymentRow(null)
        }}
        row={paymentRow}
        onSave={(payload) => void handleSubmitPayment(payload)}
        isSubmitting={submitting}
      />
    </FilteredListPage>
  )
}
