'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format, differenceInMonths, startOfMonth } from 'date-fns'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { toastError } from '@/lib/toast'
import {
  enrichEmployeesWithPayslipMonths,
  listActiveCollegesForGeneralSettings,
  listEmployeePayrollGroupByCollege,
  listEmployeePayslipGenerationsByCollege,
} from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown>

function payslipExistsThisMonth(generatedDate: unknown): boolean {
  if (generatedDate == null) return false
  const d = new Date(String(generatedDate))
  if (Number.isNaN(d.getTime())) return false
  return differenceInMonths(startOfMonth(new Date()), startOfMonth(d)) === 0
}

function makePayslipActionsRenderer(collegeId: number) {
  return (p: ICellRendererParams<EmpRow>) => {
    const empPayrollGroupId = Number(p.data?.empPayrollGroupId ?? 0)
    const employeeId = Number(p.data?.employeeId ?? 0)
    const payrollGroupId = Number(p.data?.payrollGroupId ?? 0)
    if (!empPayrollGroupId || !employeeId || !payrollGroupId || !collegeId) return null
    const isAlreadyExists = payslipExistsThisMonth(p.data?.generatedDate) ? 'true' : 'false'
    const q = new URLSearchParams({
      empPayrollGroupId: String(empPayrollGroupId),
      employeeId: String(employeeId),
      payrollGroupId: String(payrollGroupId),
      collegeId: String(collegeId),
      isAlreadyExists,
    })
    const genHref = `/hr-payroll/payroll/payslip-for-employees/generate-payslip?${q}`
    const viewHref = `/hr-payroll/payroll/payslip-for-employees/view-payslip?${q}`
    return (
      <div className="flex gap-1">
        <Button asChild size="sm" variant="ghost">
          <Link href={genHref}>Generate</Link>
        </Button>
        {p.data?.generatedDate != null ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={viewHref}>View</Link>
          </Button>
        ) : null}
      </div>
    )
  }
}

export function PayslipForEmployeesPage() {
  const searchParams = useSearchParams()
  const initialCollegeId = Number(searchParams.get('collegeId') ?? 0)

  const [collegeId, setCollegeId] = useState<number | null>(initialCollegeId || null)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [rows, setRows] = useState<EmpRow[]>([])
  const [loading, setLoading] = useState(false)
  const [collegesLoading, setCollegesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setCollegesLoading(true)
      try {
        const list = await listActiveCollegesForGeneralSettings()
        setColleges(
          list.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
        if (!collegeId && list.length > 0) {
          const cid = initialCollegeId || Number(list[0]!.collegeId)
          setCollegeId(cid)
        }
      } catch (e) {
        toastError(e, 'Failed to load colleges')
      } finally {
        setCollegesLoading(false)
      }
    })()
  }, [initialCollegeId])

  const loadEmployees = useCallback(async (cid: number) => {
    setLoading(true)
    setError(null)
    try {
      const [employees, payslips] = await Promise.all([
        listEmployeePayrollGroupByCollege(cid),
        listEmployeePayslipGenerationsByCollege(cid),
      ])
      setRows(enrichEmployeesWithPayslipMonths(employees, payslips))
    } catch (e) {
      setError(getErrorMessage(e))
      toastError(e, 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (collegeId) void loadEmployees(collegeId)
  }, [collegeId, loadEmployees])

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'firstName', headerName: 'Employee', minWidth: 150 },
      { field: 'departmentCode', headerName: 'Department', minWidth: 110 },
      { field: 'payrollGroupName', headerName: 'Payroll Group', minWidth: 140 },
      { field: 'paymentFrequency', headerName: 'Frequency', minWidth: 100 },
      {
        field: 'generatedDate',
        headerName: 'Payslip',
        minWidth: 110,
        valueFormatter: (p) =>
          p.value ? format(new Date(String(p.value)), 'MMM d, yyyy') : 'Not generated',
      },
      {
        headerName: 'Actions',
        minWidth: 160,
        flex: 0,
        cellRenderer: collegeId ? makePayslipActionsRenderer(collegeId) : undefined,
      },
    ],
    [collegeId],
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Payslip For Employees" />
      <FilterCard title="Filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            required
            className={FILTER_CARD_SELECT_CLASS}
            value={collegeId != null ? String(collegeId) : ''}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges}
            isLoading={collegesLoading}
            placeholder="Select college"
          />
        </div>
      </FilterCard>
      {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}
      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} />
      </TableCard>
    </PageContainer>
  )
}
