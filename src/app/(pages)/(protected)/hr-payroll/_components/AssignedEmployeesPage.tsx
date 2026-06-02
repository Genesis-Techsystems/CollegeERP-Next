'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { toastError } from '@/lib/toast'
import {
  enrichEmployeesWithPayslipMonths,
  listEmployeePayrollGroupByPayrollGroup,
  listEmployeePayslipGenerations,
} from '@/services'
import { formatDate } from '@/common/generic-functions'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown>

function makeAssignedActionsRenderer(payrollGroupId: number, collegeId: number) {
  return (p: ICellRendererParams<EmpRow>) => {
    const empPayrollGroupId = Number(p.data?.empPayrollGroupId ?? 0)
    const employeeId = Number(p.data?.employeeId ?? 0)
    if (!empPayrollGroupId || !employeeId) return null
    const editHref = `/hr-payroll/payroll/payroll-group/assigned-employees/edit-employee?payrollGroupId=${payrollGroupId}&collegeId=${collegeId}&empPayrollGroupId=${empPayrollGroupId}&employeeId=${employeeId}`
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href={editHref}>Edit</Link>
      </Button>
    )
  }
}

export function AssignedEmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const payrollGroupId = Number(searchParams.get('payrollGroupId') ?? 0)
  const collegeId = Number(searchParams.get('collegeId') ?? 0)
  const [rows, setRows] = useState<EmpRow[]>([])
  const [loading, setLoading] = useState(false)
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
      setRows(enrichEmployeesWithPayslipMonths(employees, payslips))
    } catch (e) {
      setError(getErrorMessage(e))
      toastError(e, 'Failed to load assigned employees')
    } finally {
      setLoading(false)
    }
  }, [payrollGroupId])

  useEffect(() => {
    void load()
  }, [load])

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: 'firstName',
        headerName: 'Employee',
        minWidth: 160,
        valueFormatter: (p) => {
          const name = String(p.data?.firstName ?? '')
          const num = String(p.data?.empNumber ?? '')
          return num ? `${name} (${num})` : name
        },
      },
      { field: 'departmentCode', headerName: 'Department', minWidth: 100 },
      { field: 'empCatName', headerName: 'Category', minWidth: 110 },
      {
        field: 'generatedDate',
        headerName: 'Recent Payslip',
        minWidth: 120,
        valueFormatter: (p) => (p.value ? formatDate(String(p.value)) : '—'),
      },
      {
        field: 'grossPay',
        headerName: 'Gross',
        minWidth: 90,
        valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '—'),
      },
      {
        field: 'netAmount',
        headerName: 'Net',
        minWidth: 90,
        valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '—'),
      },
      {
        headerName: 'Actions',
        minWidth: 90,
        flex: 0,
        cellRenderer: makeAssignedActionsRenderer(payrollGroupId, collegeId),
      },
    ],
    [payrollGroupId, collegeId],
  )

  if (!payrollGroupId) {
    return (
      <PageContainer className="space-y-4">
        <PageHeader title="Assigned Employees" />
        <p className="text-sm text-muted-foreground">Missing payroll group.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/payroll-group">Back to Payroll Groups</Link>
        </Button>
      </PageContainer>
    )
  }

  const addHref = `/hr-payroll/payroll/payroll-group/assigned-employees/add-employee?payrollGroupId=${payrollGroupId}&collegeId=${collegeId}`

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title="Assigned Employees"
        action={
          <Button asChild size="sm">
            <Link href={addHref}>Add Employee</Link>
          </Button>
        }
      />
      {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}
      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} />
      </TableCard>
      <Button variant="outline" size="sm" onClick={() => router.push('/hr-payroll/payroll/payroll-group')}>
        Back
      </Button>
    </PageContainer>
  )
}
