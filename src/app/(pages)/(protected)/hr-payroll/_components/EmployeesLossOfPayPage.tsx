'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  enrichEmployeesWithLop,
  enrichEmployeesWithPayslipMonths,
  listEmployeePayrollGroupByPayrollGroup,
  listEmployeePayslipGenerations,
  updateEmployeeLossOfPay,
} from '@/services'
import { formatDate } from '@/common/generic-functions'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown> & { Lopamount?: number; empSalaryStructureId?: number }

export function EmployeesLossOfPayPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const payrollGroupId = Number(searchParams.get('payrollGroupId') ?? 0)
  const [rows, setRows] = useState<EmpRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!payrollGroupId) return
    setLoading(true)
    setError(null)
    try {
      const [employees, payslips] = await Promise.all([
        listEmployeePayrollGroupByPayrollGroup(payrollGroupId),
        listEmployeePayslipGenerations(),
      ])
      const merged = enrichEmployeesWithLop(enrichEmployeesWithPayslipMonths(employees, payslips))
      setRows(merged as EmpRow[])
    } catch (e) {
      setError(getErrorMessage(e))
      toastError(e, 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [payrollGroupId])

  useEffect(() => {
    void load()
  }, [load])

  const updateLop = (employeeId: number, amount: number) => {
    setRows((prev) =>
      prev.map((r) => (Number(r.employeeId) === employeeId ? { ...r, Lopamount: amount } : r)),
    )
  }

  const handleSave = async () => {
    const payload = rows
      .filter((r) => r.empSalaryStructureId != null)
      .map((r) => ({
        empSalaryStructureId: Number(r.empSalaryStructureId),
        amount: Number(r.Lopamount ?? 0),
      }))
    if (payload.length === 0) {
      toastError(null, 'No LOP salary structures to update')
      return
    }
    setSaving(true)
    try {
      await updateEmployeeLossOfPay(payload)
      toastSuccess('Loss of pay updated')
      await load()
    } catch (e) {
      toastError(e, 'Failed to save loss of pay')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: 'firstName',
        headerName: 'Employee',
        minWidth: 180,
        valueFormatter: (p) => {
          const name = String(p.data?.firstName ?? '')
          const num = String(p.data?.empNumber ?? '')
          return num ? `${name} (${num})` : name
        },
      },
      { field: 'departmentCode', headerName: 'Department', minWidth: 110 },
      { field: 'empCatName', headerName: 'Category', minWidth: 120 },
      {
        field: 'generatedDate',
        headerName: 'Recent Payslip',
        minWidth: 120,
        valueFormatter: (p) => (p.value ? formatDate(String(p.value)) : '—'),
      },
      {
        headerName: 'Enter Loss Of Pay',
        minWidth: 140,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<EmpRow>) => (
          <Input
            type="number"
            className="h-8"
            value={String(p.data?.Lopamount ?? '')}
            onChange={(e) => updateLop(Number(p.data?.employeeId), Number(e.target.value))}
          />
        ),
      },
    ],
    [],
  )

  if (!payrollGroupId) {
    return (
      <PageContainer className="space-y-4">
        <PageHeader title="Employees Loss Of Pay" />
        <p className="text-sm text-muted-foreground">Missing payroll group. Open from Enter Loss Of Pay.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/enter-loss-of-pay">Back</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Payroll Group Employees — Loss Of Pay" />
      {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}
      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} />
      </TableCard>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push('/hr-payroll/payroll/enter-loss-of-pay')}>
          Back
        </Button>
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </PageContainer>
  )
}
