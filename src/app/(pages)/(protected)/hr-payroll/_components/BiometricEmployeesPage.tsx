'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { FingerprintIcon, TimerIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { DATE_FORMATS } from '@/config/constants/app'
import {
  listActiveCollegesForGeneralSettings,
  listBiometricShiftDetails,
  updateBiometricAttendanceEmployee,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'
import { toast } from 'sonner'
import { MapEmployeeModal } from './MapEmployeeModal'
import { EmployeeShiftChangeModal } from './EmployeeShiftChangeModal'

type BioRow = Record<string, unknown>

const PAGE_SIZE = 50

function formatDisplayDate(value: unknown, hasShift: boolean): string {
  if (!hasShift) return '—'
  if (value == null || value === '') return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, DATE_FORMATS.DISPLAY)
}

function formatShiftTime(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = String(value)
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (!match) return raw
  let hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours < 12 ? 'AM' : 'PM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${suffix}`
}

function shiftLabel(row: BioRow | undefined): string {
  const shift = row?.shiftDTO as BioRow | undefined
  if (!shift) return '—'
  const name = String(shift.shiftName ?? '')
  const begin = formatShiftTime(shift.beginTime)
  const end = formatShiftTime(shift.endTime)
  if (!name && !begin && !end) return '—'
  return `${name} (${begin} - ${end})`
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', minWidth: 70, flex: 0 } as ColDef<BioRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<BioRow>,
  category: { field: 'categoryName', headerName: 'Category', minWidth: 110 } as ColDef<BioRow>,
  startDate: { field: 'startAttendanceDate', headerName: 'Start Attendance Date', minWidth: 140 } as ColDef<BioRow>,
  latestDate: { field: 'latestattendanceDate', headerName: 'Latest Attendance Date', minWidth: 150 } as ColDef<BioRow>,
  biometric: { field: 'employeeName', headerName: 'Biometric Employee', minWidth: 150 } as ColDef<BioRow>,
  numericCode: { field: 'numericCode', headerName: 'Number Code', minWidth: 110 } as ColDef<BioRow>,
  shift: { headerName: 'Shift', minWidth: 180 } as ColDef<BioRow>,
  user: { field: 'userName', headerName: 'User', minWidth: 100 } as ColDef<BioRow>,
  employee: { headerName: 'Employee', minWidth: 180 } as ColDef<BioRow>,
  actions: { headerName: 'Actions', minWidth: 160, flex: 0, width: 160 } as ColDef<BioRow>,
}

function makeActionsRenderer(
  onAssign: (row: BioRow) => void,
  onShift: (row: BioRow) => void,
) {
  return (p: ICellRendererParams<BioRow>) => {
    const row = p.data
    if (!row) return null
    const hasEmp = row.empId != null
    if (!hasEmp) {
      return (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-1 text-[12px] text-[#042956]"
          onClick={() => onAssign(row)}
        >
          Assign
        </Button>
      )
    }
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-[#00b8ff]"
          title="Change Biometric"
          onClick={() => onAssign(row)}
        >
          <FingerprintIcon className="h-3.5 w-3.5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Shifts"
          onClick={() => onShift(row)}
        >
          <TimerIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

function employeeCellRenderer(p: ICellRendererParams<BioRow>) {
  const row = p.data
  if (!row?.empId) return <span>—</span>
  const name = String(row.empName ?? '')
  const num = row.empNumber != null ? String(row.empNumber) : ''
  return (
    <span>
      {name}
      {num ? (
        <>
          {' '}
          (<span className="text-[hsl(var(--primary))] font-medium">{num}</span>)
        </>
      ) : null}
    </span>
  )
}

export function BiometricEmployeesPage() {
  const queryClient = useQueryClient()
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [collegesLoading, setCollegesLoading] = useState(true)
  const [fetchEnabled, setFetchEnabled] = useState(false)
  const [page, setPage] = useState(0)
  const [mapRow, setMapRow] = useState<BioRow | null>(null)
  const [shiftRow, setShiftRow] = useState<BioRow | null>(null)
  const [mapSaving, setMapSaving] = useState(false)

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
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
      } finally {
        setCollegesLoading(false)
      }
    })()
  }, [])

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: QK.hrPayroll.biometricEmployees(collegeId, page, PAGE_SIZE, unassignedOnly),
    queryFn: () =>
      listBiometricShiftDetails({
        collegeId: collegeId || undefined,
        page,
        pageSize: PAGE_SIZE,
        unassignedOnly,
      }),
    enabled: fetchEnabled,
  })

  const rows = data?.rows ?? []
  const totalCount = data?.totalCount ?? 0

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['HrPayroll', 'biometricEmployees'] })
  }, [queryClient])

  function handleGetList() {
    setPage(0)
    if (fetchEnabled) {
      void refetch()
    } else {
      setFetchEnabled(true)
    }
  }

  function handleCollegeChange(v: string | null) {
    setCollegeId(v ? Number(v) : null)
    setFetchEnabled(false)
    setPage(0)
  }

  function handleUnassignedChange(checked: boolean) {
    setUnassignedOnly(checked)
    setFetchEnabled(false)
    setPage(0)
  }

  const onAssign = useCallback((row: BioRow) => {
    setMapRow(row)
  }, [])

  const onShift = useCallback((row: BioRow) => {
    setShiftRow(row)
  }, [])

  async function handleMapSave(empId: number) {
    if (!mapRow) return
    const attendanceEmpsId = Number(mapRow.attendanceEmpsId ?? 0)
    if (!attendanceEmpsId) return

    const duplicate = rows.some(
      (r) =>
        r.attendanceEmpsId !== mapRow.attendanceEmpsId &&
        r.empId != null &&
        Number(r.empId) === empId,
    )
    if (duplicate) {
      toast.info('Already employee is assigned.')
      return
    }

    setMapSaving(true)
    try {
      await updateBiometricAttendanceEmployee(attendanceEmpsId, { ...mapRow, empId })
      toastSuccess('Employee mapped successfully')
      setMapRow(null)
      invalidate()
    } catch (e) {
      toastError(e, 'Failed to map employee')
    } finally {
      setMapSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<BioRow>[]>(
    () => [
      {
        ...COL_DEFS.siNo,
        valueGetter: (p: ValueGetterParams<BioRow>) => {
          const idx = p.node?.rowIndex ?? 0
          return idx + 1 + page * PAGE_SIZE
        },
      },
      COL_DEFS.college,
      COL_DEFS.category,
      {
        ...COL_DEFS.startDate,
        valueFormatter: (p) =>
          formatDisplayDate(p.value, (p.data?.shiftDTO as BioRow | undefined) != null),
      },
      {
        ...COL_DEFS.latestDate,
        valueFormatter: (p) =>
          formatDisplayDate(p.value, (p.data?.shiftDTO as BioRow | undefined) != null),
      },
      COL_DEFS.biometric,
      COL_DEFS.numericCode,
      { ...COL_DEFS.shift, valueFormatter: (p) => shiftLabel(p.data) },
      {
        ...COL_DEFS.user,
        valueFormatter: (p) => (p.value != null && p.value !== '' ? String(p.value) : '—'),
      },
      { ...COL_DEFS.employee, cellRenderer: employeeCellRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(onAssign, onShift) },
    ],
    [page, onAssign, onShift],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title="Biometric Employees" defaultOpen>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-[200px]">
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="College"
              value={collegeId != null ? String(collegeId) : null}
              onChange={handleCollegeChange}
              options={colleges}
              placeholder="Select"
              searchable
              clearable
              isLoading={collegesLoading}
            />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Checkbox
              id="unassigned"
              checked={unassignedOnly}
              onCheckedChange={(v) => handleUnassignedChange(v === true)}
            />
            <Label htmlFor="unassigned" className="cursor-pointer text-[12px]">
              Un Assigned
            </Label>
          </div>
          <Button type="button" size="sm" className="h-8" onClick={handleGetList}>
            Get List
          </Button>
        </div>
      </FilterCard>

      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}

      {fetchEnabled && rows.length > 0 ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isFetching}
            serverSide
            totalCount={totalCount}
            currentPage={page}
            paginationPageSize={PAGE_SIZE}
            onPageChange={(nextPage) => setPage(nextPage)}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search biometric employees…',
              pdfDocumentTitle: 'Biometric Employees',
            }}
          />
        </TableCard>
      ) : fetchEnabled && !isFetching && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1">No biometric employees found.</p>
      ) : null}

      <MapEmployeeModal
        open={mapRow != null}
        onClose={() => setMapRow(null)}
        row={mapRow}
        onSave={handleMapSave}
        isSubmitting={mapSaving}
      />

      <EmployeeShiftChangeModal
        open={shiftRow != null}
        onClose={(refreshed) => {
          setShiftRow(null)
          if (refreshed) invalidate()
        }}
        row={shiftRow}
      />
    </PageContainer>
  )
}
