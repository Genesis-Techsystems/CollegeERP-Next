'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { MonthYearPicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { toast } from 'sonner'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  enrichMonthlyPayslipEmployees,
  generateMonthlyPayslips,
  listActiveCollegesForGeneralSettings,
  listDepartmentsByCollege,
  listEmployeePayrollGroupByCollege,
  listEmployeePayslipGenerationsByDate,
  sendPayslipEmails,
} from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown>

function makeMonthlyViewRenderer(
  collegeId: number,
  departmentId: number,
  payslipDate: Date,
) {
  return (p: ICellRendererParams<EmpRow>) => {
    if (p.data?.generatedDate == null) return null
    const q = new URLSearchParams({
      payslipMonth: String(p.data.generatedDate),
      status: String(p.data.status ?? ''),
      empPayrollGroupId: String(p.data.empPayrollGroupId ?? ''),
      payrollGroupId: String(p.data.payrollGroupId ?? ''),
      empPayslipGenerationId: String(p.data.empPayslipGenerationId ?? ''),
      empId: String(p.data.employeeId ?? ''),
      collegeId: String(collegeId),
      departmentId: String(departmentId),
      date: format(payslipDate, 'yyyy-MM-dd'),
    })
    return (
      <Button asChild size="sm" variant="ghost">
        <Link href={`/hr-payroll/payroll/monthly-playslip/view-monthly-payslip?${q}`}>View</Link>
      </Button>
    )
  }
}

export function MonthlyPayslipPage() {
  const searchParams = useSearchParams()
  const [collegeId, setCollegeId] = useState<number | null>(
    Number(searchParams.get('collegeId') ?? 0) || null,
  )
  const [departmentId, setDepartmentId] = useState<number | null>(
    Number(searchParams.get('departmentId') ?? 0) || null,
  )
  const [payslipDate, setPayslipDate] = useState<Date>(() => {
    const d = searchParams.get('date')
    return d ? new Date(d) : new Date()
  })

  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [departments, setDepartments] = useState<SelectOption[]>([])
  const [rows, setRows] = useState<EmpRow[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const list = await listActiveCollegesForGeneralSettings()
      setColleges(
        list.map((c) => ({
          value: String(c.collegeId),
          label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
        })),
      )
      if (collegeId == null && list.length > 0) {
        const cid = Number(searchParams.get('collegeId') ?? 0) || Number(list[0]!.collegeId)
        setCollegeId(cid)
      }
    })()
  }, [collegeId, searchParams])

  const loadDepartments = useCallback(async (cid: number) => {
    const depts = await listDepartmentsByCollege(cid)
    const opts: SelectOption[] = [
      { value: '0', label: 'All' },
      ...depts.map((d) => ({
        value: String(d.departmentId),
        label: String(d.deptCode ?? d.deptName ?? d.departmentId),
      })),
    ]
    setDepartments(opts)
    if (departmentId == null && opts.length > 0) setDepartmentId(Number(opts[0]!.value))
  }, [departmentId])

  const loadGrid = useCallback(async () => {
    if (!collegeId || departmentId == null) return
    setLoading(true)
    try {
      const dateYmd = format(payslipDate, 'yyyy-MM-dd')
      let employees = await listEmployeePayrollGroupByCollege(collegeId)
      if (departmentId !== 0) {
        employees = employees.filter((e) => Number(e.departmentId) === departmentId)
      }
      const payslips = await listEmployeePayslipGenerationsByDate(dateYmd)
      const merged = enrichMonthlyPayslipEmployees(employees, payslips, payslipDate)
      setRows(merged)
      if (merged.length === 0) toast.message('No payslips found for the selected criteria')
    } catch (e) {
      toastError(e, 'Failed to load monthly payslips')
    } finally {
      setLoading(false)
    }
  }, [collegeId, departmentId, payslipDate])

  useEffect(() => {
    if (collegeId) void loadDepartments(collegeId)
  }, [collegeId, loadDepartments])

  useEffect(() => {
    void loadGrid()
  }, [loadGrid])

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'firstName', headerName: 'Employee', minWidth: 150 },
      { field: 'departmentCode', headerName: 'Department', minWidth: 100 },
      { field: 'empCatName', headerName: 'Category', minWidth: 110 },
      {
        field: 'generatedDate',
        headerName: 'Payslip Month',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(String(p.value)), 'MMM yyyy') : '—'),
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
        minWidth: 80,
        flex: 0,
        cellRenderer:
          collegeId != null && departmentId != null
            ? makeMonthlyViewRenderer(collegeId, departmentId, payslipDate)
            : undefined,
      },
    ],
    [collegeId, departmentId, payslipDate],
  )

  const buildPayload = () => {
    if (!collegeId) return null
    const base = {
      collegeId,
      payslipGenerationDate: payslipDate,
      payslipMonth: payslipDate,
    }
    if (departmentId !== 0) return { ...base, departmentId }
    return base
  }

  const handleGenerate = async () => {
    const payload = buildPayload()
    if (!payload) return
    setBusy(true)
    try {
      await generateMonthlyPayslips(payload)
      toastSuccess('Monthly payslips generated')
      await loadGrid()
    } catch (e) {
      toastError(e, 'Generate failed')
    } finally {
      setBusy(false)
    }
  }

  const handleEmail = async () => {
    const payload = buildPayload()
    if (!payload) return
    setBusy(true)
    try {
      await sendPayslipEmails(payload)
      toastSuccess('Payslip emails sent')
    } catch (e) {
      toastError(e, 'Email failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Monthly Payslip" />
      <FilterCard title="Filters">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="College"
            required
            className={FILTER_CARD_SELECT_CLASS}
            value={collegeId != null ? String(collegeId) : ''}
            onChange={(v) => {
              setCollegeId(v ? Number(v) : null)
              setDepartmentId(null)
            }}
            options={colleges}
            placeholder="College"
          />
          <Select
            label="Department"
            required
            className={FILTER_CARD_SELECT_CLASS}
            value={departmentId != null ? String(departmentId) : ''}
            onChange={(v) => setDepartmentId(v ? Number(v) : null)}
            options={departments}
            placeholder="Department"
          />
          <MonthYearPicker
            label="Payslip month"
            value={payslipDate}
            onChange={(d) => d && setPayslipDate(d)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void loadGrid()} disabled={loading}>
            Search
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void handleGenerate()} disabled={busy}>
            Generate monthly payslip
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleEmail()} disabled={busy}>
            Email payslips
          </Button>
        </div>
      </FilterCard>
      <TableCard withHeaderBorder={false}>
        <DataTable rowData={rows} columnDefs={columnDefs} loading={loading} />
      </TableCard>
    </PageContainer>
  )
}
