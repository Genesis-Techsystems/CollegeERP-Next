'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { MailIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { ConfirmDialog } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  listEmployeeDetails,
  searchEmployeesForManagerAssign,
  sendEmployeeMails,
} from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown>
type ListMode = 'search' | 'all'
type MailTarget =
  | { kind: 'single'; row: EmpRow }
  | { kind: 'bulk' }
  | null

const COL_DEFS = {
  siNo: { headerName: 'Sl.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<EmpRow>,
  photo: {
    field: 'photoPath',
    headerName: 'Photo',
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<EmpRow>,
  empNumber: { field: 'empNumber', headerName: 'Emp no', minWidth: 120 } as ColDef<EmpRow>,
  firstName: { field: 'firstName', headerName: 'Employee Name', minWidth: 140 } as ColDef<EmpRow>,
  gender: { field: 'gender', headerName: 'Gender', minWidth: 90, flex: 0 } as ColDef<EmpRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<EmpRow>,
  dept: { field: 'deptName', headerName: 'Department', minWidth: 120 } as ColDef<EmpRow>,
  designation: { field: 'designationName', headerName: 'Designation', minWidth: 120 } as ColDef<EmpRow>,
  mobile: { field: 'mobile', headerName: 'Mobile No', minWidth: 110 } as ColDef<EmpRow>,
  email: { field: 'email', headerName: 'Email', minWidth: 160 } as ColDef<EmpRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<EmpRow>,
  actions: {
    headerName: 'Actions',
    minWidth: 120,
    flex: 0,
    width: 120,
    sortable: false,
    filter: false,
  } as ColDef<EmpRow>,
}

function statusRenderer(p: ICellRendererParams<EmpRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function photoRenderer(p: ICellRendererParams<EmpRow>) {
  const src = String(p.data?.photoPath ?? '').trim()
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center py-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-[10px] text-muted-foreground">
          —
        </div>
      </div>
    )
  }
  return (
    <div className="flex h-full items-center justify-center py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-9 w-9 rounded-full border object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    </div>
  )
}

function employeeOptionLabel(row: EmpRow): string {
  const name = String(row.firstName ?? '').trim()
  const num = String(row.empNumber ?? '').trim()
  if (name && num) return `${name} (${num})`
  return name || num || String(row.employeeId ?? '')
}

/** Map Angular employeesearch row fields onto list column fields. */
function normalizeSearchRow(row: EmpRow): EmpRow {
  return {
    ...row,
    deptName: row.deptName ?? row.empDeptName ?? '',
    designationName: row.designationName ?? row.designation ?? '',
  }
}

function makeActionsRenderer(
  onEdit: (row: EmpRow) => void,
  onMail: (row: EmpRow) => void,
) {
  return function ActionsRenderer(p: ICellRendererParams<EmpRow>) {
    if (!p.data) return null
    return (
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 px-0"
          title="Edit Employee"
          onClick={() => onEdit(p.data!)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 px-0"
          title="Send E-mail"
          onClick={() => onMail(p.data!)}
        >
          <MailIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export function EmployeeListPage() {
  const router = useRouter()
  const [mode, setMode] = useState<ListMode>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [searchOptions, setSearchOptions] = useState<SelectOption[]>([])
  const [searchRows, setSearchRows] = useState<EmpRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [mailTarget, setMailTarget] = useState<MailTarget>(null)
  const [mailSending, setMailSending] = useState(false)

  const {
    data: allRows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.hrPayroll.employees(),
    queryFn: listEmployeeDetails,
    enabled: mode === 'all',
  })

  const onEmployeeSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 4) {
      setSearchOptions([])
      return
    }
    setSearchLoading(true)
    try {
      const list = await searchEmployeesForManagerAssign(q)
      setSearchRows(list.map(normalizeSearchRow))
      setSearchOptions(
        list.map((e) => ({
          value: String(e.employeeId),
          label: employeeOptionLabel(e),
        })),
      )
    } catch (e) {
      toastError(e, 'Failed to search employees')
      setSearchOptions([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  function handleModeChange(next: ListMode) {
    setMode(next)
    setSelectedEmployeeId(null)
    setSearchOptions([])
    setSearchRows([])
  }

  function handleEdit(row: EmpRow) {
    const employeeId = Number(row.employeeId ?? 0)
    if (!employeeId) return
    const check = mode === 'search' ? 1 : 2
    router.push(
      `/hr-payroll/employee/edit-enrollement?employeeId=${employeeId}&check=${check}`,
    )
  }

  async function confirmSendMail() {
    if (!mailTarget) return
    const payload =
      mailTarget.kind === 'single'
        ? [
            {
              employeeId: Number(mailTarget.row.employeeId ?? 0),
              collegeId: Number(mailTarget.row.collegeId ?? 0),
            },
          ]
        : allRows.map((e) => ({
            employeeId: Number(e.employeeId ?? 0),
            collegeId: Number(e.collegeId ?? 0),
          }))

    const valid = payload.filter((p) => p.employeeId > 0)
    if (valid.length === 0) {
      toastError(new Error('No employees to send'), 'No employees to send')
      setMailTarget(null)
      return
    }

    setMailSending(true)
    try {
      await sendEmployeeMails(valid)
      toastSuccess('Credentials sent successfully.')
      setMailTarget(null)
    } catch (e) {
      toastError(e, 'Failed to send credentials')
    } finally {
      setMailSending(false)
    }
  }

  const displayRows = useMemo(() => {
    if (mode === 'all') return allRows
    if (!selectedEmployeeId) return []
    return searchRows.filter((r) => Number(r.employeeId) === selectedEmployeeId)
  }, [mode, allRows, selectedEmployeeId, searchRows])

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.photo, cellRenderer: photoRenderer },
      COL_DEFS.empNumber,
      COL_DEFS.firstName,
      COL_DEFS.gender,
      COL_DEFS.college,
      COL_DEFS.dept,
      COL_DEFS.designation,
      COL_DEFS.mobile,
      COL_DEFS.email,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(handleEdit, (row) =>
          setMailTarget({ kind: 'single', row }),
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  )

  const showTable = mode === 'all' || (mode === 'search' && selectedEmployeeId != null)

  const mailDescription =
    mailTarget?.kind === 'single'
      ? `Send Credentials To : ${employeeOptionLabel(mailTarget.row)}`
      : 'Send Credentials To : All Employees'

  return (
    <PageContainer className="space-y-5">
      {/* Angular radio group — no separate title card */}
      <div className="flex flex-wrap items-center gap-6 px-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="employee-list-mode"
            checked={mode === 'search'}
            onChange={() => handleModeChange('search')}
          />
          Search By Employee
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="employee-list-mode"
            checked={mode === 'all'}
            onChange={() => handleModeChange('all')}
          />
          All Employees
        </label>
      </div>

      {mode === 'search' ? (
        <div className="app-card overflow-hidden p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full max-w-md">
              <Select
                label="Employee"
                value={selectedEmployeeId ? String(selectedEmployeeId) : null}
                onChange={(v) => setSelectedEmployeeId(v ? Number(v) : null)}
                options={searchOptions}
                placeholder="Search by name or employee id (min 4 chars)"
                searchable
                onSearch={onEmployeeSearch}
                isLoading={searchLoading}
                clearable
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-[30px] shrink-0 px-3 text-[12px]"
              onClick={() => router.push('/hr-payroll/employee/employee-enrollement')}
            >
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              New Employee Admission
            </Button>
          </div>
        </div>
      ) : null}

      {error && mode === 'all' ? (
        <p className="px-1 text-sm text-destructive">{getErrorMessage(error)}</p>
      ) : null}

      {showTable ? (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={displayRows}
            columnDefs={columnDefs}
            loading={mode === 'all' ? isFetching : false}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Employee Search',
              pdfDocumentTitle: 'Employee List',
            }}
            toolbarTrailing={
              mode === 'all' ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-[30px] px-3 text-[12px]"
                    onClick={() => setMailTarget({ kind: 'bulk' })}
                  >
                    <MailIcon className="mr-1.5 h-3.5 w-3.5" />
                    Send Employee Credentials
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-[30px] px-3 text-[12px]"
                    onClick={() => router.push('/hr-payroll/employee/employee-enrollement')}
                  >
                    <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                    New Employee Admission
                  </Button>
                </div>
              ) : undefined
            }
          />
        </TableCard>
      ) : null}

      <ConfirmDialog
        open={mailTarget != null}
        title="Send Credentials"
        description={mailDescription}
        confirmLabel="Send"
        cancelLabel="Cancel"
        confirmFirst
        onConfirm={() => void confirmSendMail()}
        onCancel={() => {
          if (!mailSending) setMailTarget(null)
        }}
        isLoading={mailSending}
      />
    </PageContainer>
  )
}
