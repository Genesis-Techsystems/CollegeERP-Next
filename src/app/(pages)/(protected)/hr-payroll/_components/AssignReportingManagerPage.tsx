'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { PencilIcon, Settings2 } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Select, type SelectOption } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import {
  assignEmployeeReportingManager,
  getEmployeeByIdForHr,
  listActiveDesignationsForHr,
  listEmployeeReportingByEmployee,
  searchEmployeesForManagerAssign,
} from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { toast } from 'sonner'
import { toastError, toastSuccess } from '@/lib/toast'
import { EditReportingManagerModal } from './EditReportingManagerModal'

type ReportRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<ReportRow>,
  manager: { field: 'managerEmpName', headerName: 'Manager', minWidth: 180 } as ColDef<ReportRow>,
  designation: { field: 'desEmpName', headerName: 'Designation', minWidth: 160 } as ColDef<ReportRow>,
  dateRange: { headerName: 'Date', minWidth: 220 } as ColDef<ReportRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<ReportRow>,
  actions: { headerName: 'Actions', minWidth: 90, flex: 0, width: 90 } as ColDef<ReportRow>,
}

function managerRenderer(p: ICellRendererParams<ReportRow>) {
  const name = p.data?.managerEmpName
  const num = p.data?.managerEmpNumber
  if (!name && !num) return null
  return (
    <span>
      {name != null ? String(name) : ''}
      {num != null && num !== '' ? (
        <span className="text-[hsl(var(--primary))]"> ({String(num)})</span>
      ) : null}
    </span>
  )
}

function statusRenderer(p: ICellRendererParams<ReportRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function formatAngularDate(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'MMMM d, yyyy')
}

function dateRangeFormatter(_value: unknown, data: ReportRow | undefined): string {
  const from = formatAngularDate(data?.fromDate)
  const to = formatAngularDate(data?.toDate)
  if (!from && !to) return '—'
  if (from && to) return `${from} - ${to}`
  return from || to
}

function employeeLabel(row: Record<string, unknown>): string {
  const name = String(row.firstName ?? '')
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : ''
  return `${name}${num}`.trim() || String(row.employeeId ?? '')
}

export function AssignReportingManagerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const employeeIdParam = Number(searchParams.get('employeeId') ?? 0)

  const [managerEmpId, setManagerEmpId] = useState<number | null>(null)
  const [selectedManager, setSelectedManager] = useState<Record<string, unknown> | null>(null)
  const [managerOptions, setManagerOptions] = useState<SelectOption[]>([])
  const [managerRows, setManagerRows] = useState<Record<string, unknown>[]>([])
  const [managerSearchLoading, setManagerSearchLoading] = useState(false)
  const [designationId, setDesignationId] = useState<number | null>(null)
  const [designationOptions, setDesignationOptions] = useState<SelectOption[]>([])
  const [fromDate, setFromDate] = useState<Date>(new Date())
  const [toDate, setToDate] = useState<Date>(new Date())
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editRow, setEditRow] = useState<ReportRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const {
    data: employee,
    isLoading: employeeLoading,
    error: employeeError,
  } = useQuery({
    queryKey: QK.hrPayroll.employeeDetail(employeeIdParam),
    queryFn: () => getEmployeeByIdForHr(employeeIdParam),
    enabled: employeeIdParam > 0,
  })

  const {
    data: assignedRows = [],
    isFetching: tableLoading,
    error: tableError,
  } = useQuery({
    queryKey: QK.hrPayroll.employeeReporting(employeeIdParam),
    queryFn: () => listEmployeeReportingByEmployee(employeeIdParam),
    enabled: employeeIdParam > 0,
  })

  useEffect(() => {
    void listActiveDesignationsForHr().then((rows) => {
      setDesignationOptions(
        rows.map((d) => ({
          value: String(d.designationId),
          label: String(d.designationName ?? d.designationId),
        })),
      )
    })
  }, [])

  useEffect(() => {
    if (employee?.designationId) {
      setDesignationId(Number(employee.designationId))
    }
  }, [employee])

  useEffect(() => {
    if (fromDate > toDate) setToDate(fromDate)
  }, [fromDate, toDate])

  const onManagerSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 4) {
      setManagerRows([])
      setManagerOptions([])
      return
    }
    setManagerSearchLoading(true)
    try {
      const list = await searchEmployeesForManagerAssign(q)
      setManagerRows(list)
      setManagerOptions(
        list.map((e) => ({
          value: String(e.employeeId),
          label: employeeLabel(e),
        })),
      )
    } catch (e) {
      toastError(e, 'Employee search failed')
      setManagerRows([])
      setManagerOptions([])
    } finally {
      setManagerSearchLoading(false)
    }
  }, [])

  const managerSelectOptions = useMemo(() => {
    if (!managerEmpId) return managerOptions
    const id = String(managerEmpId)
    if (managerOptions.some((o) => o.value === id)) return managerOptions
    const row = managerRows.find((e) => String(e.employeeId) === id)
    if (!row) return managerOptions
    return [{ value: id, label: employeeLabel(row) }, ...managerOptions]
  }, [managerEmpId, managerOptions, managerRows])

  function handleManagerChange(v: string | null) {
    const id = v ? Number(v) : null
    setManagerEmpId(id)
    setSelectedManager(id ? (managerRows.find((e) => Number(e.employeeId) === id) ?? null) : null)
  }

  function invalidateTable() {
    void queryClient.invalidateQueries({ queryKey: QK.hrPayroll.employeeReporting(employeeIdParam) })
  }

  async function handleSave() {
    if (!employee || !managerEmpId || !designationId) {
      toastError(new Error('Please select reporting manager and designation'))
      return
    }
    if (Number(employee.employeeId) === managerEmpId) {
      toast.info('You cannot assign the same employee as their own reporting manager')
      return
    }
    if (fromDate > toDate) {
      toast.info('From date should be less than or equal to To date')
      return
    }

    setSaving(true)
    try {
      await assignEmployeeReportingManager({
        managerEmpId,
        empDesignationId: designationId,
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        isActive,
        empId: employee.employeeId,
        organizationId: employee.organizationId,
      })
      toastSuccess('Reporting manager assigned')
      setManagerEmpId(null)
      setSelectedManager(null)
      setManagerOptions([])
      setManagerRows([])
      setFromDate(new Date())
      setToDate(new Date())
      invalidateTable()
    } catch (err) {
      toastError(err, 'Failed to assign reporting manager')
    } finally {
      setSaving(false)
    }
  }

  function goBack() {
    if (!employee) {
      router.push('/hr-payroll/employee/reporting-manager')
      return
    }
    const params = new URLSearchParams({
      cId: String(employee.collegeId ?? ''),
      eId: String(employee.employeeId ?? ''),
      eN: String(employee.empNumber ?? ''),
    })
    router.push(`/hr-payroll/employee/reporting-manager?${params.toString()}`)
  }

  const columnDefs = useMemo<ColDef<ReportRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.manager, cellRenderer: managerRenderer },
      COL_DEFS.designation,
      { ...COL_DEFS.dateRange, valueFormatter: (p) => dateRangeFormatter(p.value, p.data) },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<ReportRow>) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit"
            onClick={() => {
              setEditRow(p.data ?? null)
              setEditOpen(true)
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  if (!employeeIdParam) {
    return (
      <PageContainer className="p-6">
        <p className="text-sm text-muted-foreground">Missing employee. Open this page from Reporting Manager.</p>
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={goBack}>
          Back
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5 pb-16">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))] inline-flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden />
          Assign Reporting Manager
        </h1>
      </div>

      {employeeLoading ? (
        <p className="text-sm text-muted-foreground px-1">Loading employee…</p>
      ) : null}
      {employeeError ? (
        <p className="text-sm text-destructive px-1">{getErrorMessage(employeeError)}</p>
      ) : null}

      {employee ? (
        <div className="app-card overflow-hidden p-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[13px] border border-slate-200 rounded-md p-3 bg-slate-50/50">
            <p>
              Employee:{' '}
              <span className="text-[hsl(var(--primary))] font-medium">
                {String(employee.firstName ?? '')}
              </span>{' '}
              ({String(employee.empNumber ?? '')})
            </p>
            <p>
              Department:{' '}
              <span className="text-[hsl(var(--primary))]">
                {String(employee.deptName ?? employee.departmentCode ?? '—')}
              </span>
            </p>
            <p>
              Designation:{' '}
              <span className="text-[hsl(var(--primary))]">{String(employee.designationName ?? '—')}</span>
            </p>
            <p>
              Mobile No: <span className="text-[hsl(var(--primary))]">{String(employee.mobile ?? '—')}</span>
            </p>
          </div>

          <Select
            label="Reporting Manager"
            value={managerEmpId ? String(managerEmpId) : null}
            onChange={handleManagerChange}
            options={managerSelectOptions}
            placeholder="Search by name or employee id (min 4 chars)"
            searchable
            onSearch={onManagerSearch}
            isLoading={managerSearchLoading}
          />

          {selectedManager ? (
            <div className="flex gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-3">
              {selectedManager.photoPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={String(selectedManager.photoPath)}
                  alt=""
                  className="h-14 w-14 rounded object-cover border border-slate-200"
                />
              ) : (
                <div className="h-14 w-14 rounded bg-slate-200 border border-slate-200" />
              )}
              <div className="text-[13px] space-y-0.5 min-w-0">
                <p className="font-medium text-foreground">
                  {String(selectedManager.firstName ?? '')}
                  {selectedManager.empNumber != null ? (
                    <span className="text-[hsl(var(--primary))]">
                      {' '}
                      ({String(selectedManager.empNumber)})
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground">
                  {String(selectedManager.collegeCode ?? '')}
                  {selectedManager.empDeptName ? ` / ${String(selectedManager.empDeptName)}` : ''}
                </p>
                <p className="text-muted-foreground">{String(selectedManager.mobile ?? '')}</p>
              </div>
            </div>
          ) : null}

          {selectedManager ? (
            <>
              <p className="text-[13px] font-semibold border-b border-slate-200 pb-2">
                Assign Reporting Manager
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
                <Select
                  label="Employee Designation"
                  required
                  value={designationId ? String(designationId) : null}
                  onChange={(v) => setDesignationId(v ? Number(v) : null)}
                  options={designationOptions}
                  placeholder="Select designation"
                  searchable
                />
                <DatePicker label="From Date" required value={fromDate} onChange={(d) => d && setFromDate(d)} />
                <DatePicker
                  label="To Date"
                  required
                  value={toDate}
                  onChange={(d) => d && setToDate(d)}
                  minDate={fromDate}
                />
                <div className="flex items-center gap-2 pb-1">
                  <Checkbox
                    id="assign-rm-active"
                    checked={isActive}
                    onCheckedChange={(c) => setIsActive(c === true)}
                  />
                  <Label htmlFor="assign-rm-active" className="text-[13px] font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
                <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
                  Save
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="app-card overflow-hidden px-4 py-3">
        <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Assigned Reporting Managers
        </h2>
      </div>

      {tableError ? (
        <p className="text-sm text-destructive px-1">{getErrorMessage(tableError)}</p>
      ) : null}

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={assignedRows}
          columnDefs={columnDefs}
          loading={tableLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search',
            pdfDocumentTitle: 'Assigned Reporting Managers',
          }}
        />
      </TableCard>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={goBack}>
          Back
        </Button>
      </div>

      <EditReportingManagerModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditRow(null)
        }}
        row={editRow}
        onSaved={invalidateTable}
      />
    </PageContainer>
  )
}
