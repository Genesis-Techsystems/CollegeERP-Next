'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { PencilIcon, PlusIcon, UsersRound } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import {
  listActiveCollegesForGeneralSettings,
  listEmployeeReportingByEmployee,
  searchEmployeesForHr,
} from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'

type ReportRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<ReportRow>,
  manager: { field: 'managerEmpName', headerName: 'Manager', minWidth: 180 } as ColDef<ReportRow>,
  designation: { field: 'desEmpName', headerName: 'Designation', minWidth: 160 } as ColDef<ReportRow>,
  dateRange: { headerName: 'Date', minWidth: 200 } as ColDef<ReportRow>,
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

export function ReportingManagerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [collegesLoading, setCollegesLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setCollegesLoading(true)
      try {
        const orgId = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
        const all = await listActiveCollegesForGeneralSettings()
        const filtered = orgId
          ? all.filter((c) => Number(c.organizationId) === orgId)
          : all
        setColleges(
          filtered.map((c) => ({
            value: String(c.collegeId),
            label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
          })),
        )

        const cId = searchParams.get('cId')
        const eId = searchParams.get('eId')
        const eN = searchParams.get('eN')
        if (cId) {
          const cid = Number(cId)
          setCollegeId(cid)
          if (eN && eN.length >= 4) {
            const list = await searchEmployeesForHr(eN, cid)
            setEmployeeRows(list)
            setEmployeeOptions(
              list.map((e) => ({
                value: String(e.employeeId),
                label: employeeLabel(e),
              })),
            )
            if (eId) setEmployeeId(Number(eId))
          }
        }
      } catch (e) {
        toastError(e, 'Failed to load colleges')
      } finally {
        setCollegesLoading(false)
      }
    })()
  }, [searchParams])

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.employeeReporting(employeeId ?? undefined),
    queryFn: () => listEmployeeReportingByEmployee(employeeId!),
    enabled: employeeId != null && employeeId > 0,
  })

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!collegeId) return
      const q = term.trim()
      if (q.length < 4) {
        setEmployeeRows([])
        setEmployeeOptions([])
        return
      }
      setEmployeeSearchLoading(true)
      try {
        const list = await searchEmployeesForHr(q, collegeId)
        setEmployeeRows(list)
        setEmployeeOptions(
          list.map((e) => ({
            value: String(e.employeeId),
            label: employeeLabel(e),
          })),
        )
      } catch (e) {
        toastError(e, 'Employee search failed')
        setEmployeeRows([])
        setEmployeeOptions([])
      } finally {
        setEmployeeSearchLoading(false)
      }
    },
    [collegeId],
  )

  const employeeSelectOptions = useMemo(() => {
    if (!employeeId) return employeeOptions
    const id = String(employeeId)
    if (employeeOptions.some((o) => o.value === id)) return employeeOptions
    const row = employeeRows.find((e) => String(e.employeeId) === id)
    if (!row) return employeeOptions
    return [{ value: id, label: employeeLabel(row) }, ...employeeOptions]
  }, [employeeId, employeeOptions, employeeRows])

  function handleCollegeChange(v: string | null) {
    const id = v ? Number(v) : null
    setCollegeId(id)
    setEmployeeId(null)
    setEmployeeOptions([])
    setEmployeeRows([])
  }

  const columnDefs = useMemo<ColDef<ReportRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.manager, cellRenderer: managerRenderer },
      COL_DEFS.designation,
      {
        ...COL_DEFS.dateRange,
        valueFormatter: (p) => dateRangeFormatter(p.value, p.data),
      },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: () => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit reporting manager"
            disabled
            title="Edit — coming soon"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  function assignReportingManager() {
    if (!employeeId) return
    router.push(`/hr-payroll/employee/assign-reporting-manager?employeeId=${employeeId}`)
  }

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={(
          <span className="inline-flex items-center gap-2">
            <UsersRound className="h-4 w-4 shrink-0" aria-hidden />
            Reporting Manager
          </span>
        )}
        defaultOpen
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-3">
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="College"
              required
              value={collegeId ? String(collegeId) : null}
              onChange={handleCollegeChange}
              options={colleges}
              placeholder="Select college"
              searchable
              isLoading={collegesLoading}
            />
          </div>
          <div className="sm:col-span-5">
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Employee"
              value={employeeId ? String(employeeId) : null}
              onChange={(v) => setEmployeeId(v ? Number(v) : null)}
              options={employeeSelectOptions}
              placeholder="Search by name or employee id (min 4 chars)"
              searchable
              onSearch={onEmployeeSearch}
              isLoading={employeeSearchLoading}
              disabled={!collegeId}
            />
          </div>
        </div>
      </FilterCard>

      {employeeId ? (
        <>
          {error ? (
            <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p>
          ) : null}
          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={isFetching}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search',
                pdfDocumentTitle: 'Reporting Manager',
              }}
              toolbarTrailing={(
                <Button
                  type="button"
                  size="sm"
                  className="h-[30px] px-3 text-[12px]"
                  onClick={assignReportingManager}
                >
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  Add Reporting Manager
                </Button>
              )}
            />
          </TableCard>
        </>
      ) : null}
    </PageContainer>
  )
}
