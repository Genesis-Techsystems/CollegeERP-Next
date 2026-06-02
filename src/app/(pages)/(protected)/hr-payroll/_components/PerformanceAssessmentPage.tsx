'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { BookOpen, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { listPerformanceAssessmentByEmployee, searchEmployeesForHr } from '@/services'
import type { SessionUser } from '@/types/user'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'

type PerfRow = Record<string, unknown>

function readStorage(key: string): string {
  if (typeof globalThis.window === 'undefined') return ''
  return globalThis.localStorage.getItem(key) ?? ''
}

/** Principal / HOD / admin can search and pick any employee (Angular `dataSecStaff === false`). */
function canPickEmployee(user: SessionUser | null | undefined): boolean {
  if (user) {
    if (user.isAdmin || user.isPrincipal || user.isManagement) return true
    const role = (user.roleName ?? '').toUpperCase()
    if (role.includes('HOD')) return true
  }
  const isPrincipal =
    readStorage('isPRINCIPAL') === 'true' || readStorage('isPrincipal') === 'true'
  const isHod = readStorage('isHOD') === 'true'
  const isAdmin = readStorage('isAdmin') === 'true'
  return isPrincipal || isHod || isAdmin
}

function employeeOptionLabel(row: Record<string, unknown>): string {
  const num = row.empNumber != null ? String(row.empNumber) : ''
  const name = row.firstName != null ? ` (${String(row.firstName)})` : ''
  const meta = [row.collegeCode, row.empDeptName, row.designation].filter(Boolean).join(' / ')
  return [num + name, meta].filter(Boolean).join(' — ') || String(row.employeeId ?? '')
}

function formatFeedbackDate(value: unknown): string {
  if (value == null || value === '') return '—'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'dd MMM, yyyy')
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<PerfRow>,
  employee: { headerName: 'Employee', minWidth: 180 } as ColDef<PerfRow>,
  feedbackDate: { field: 'feedbackDate', headerName: 'Date', minWidth: 120 } as ColDef<PerfRow>,
  overallRating: { field: 'overallRating', headerName: 'Overall Rating', minWidth: 120 } as ColDef<PerfRow>,
  actions: { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<PerfRow>,
}

export function PerformanceAssessmentPage() {
  const router = useRouter()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId: loggedInEmployeeId } = useLoginEmployeeId(user, sessionLoading)
  const collegeId = user?.collegeId ?? Number(readStorage('collegeId') || 0)
  const empNumber = readStorage('empNumber') || user?.userName || ''
  const isPrincipal = user?.isPrincipal ?? readStorage('isPRINCIPAL') === 'true'
  const staffLocked = !canPickEmployee(user)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Record<string, unknown> | null>(null)
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [employeeRows, setEmployeeRows] = useState<Record<string, unknown>[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [empDisplayName, setEmpDisplayName] = useState('')

  const { data: history = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.performanceAssessment(selectedEmployeeId ?? undefined),
    queryFn: () => listPerformanceAssessmentByEmployee(selectedEmployeeId!),
    enabled: selectedEmployeeId != null && selectedEmployeeId > 0,
  })

  const viewOnly =
    loggedInEmployeeId > 0 &&
    selectedEmployeeId != null &&
    loggedInEmployeeId !== selectedEmployeeId

  const loadEmployee = useCallback((row: Record<string, unknown>) => {
    const id = Number(row.employeeId)
    setSelectedEmployeeId(id)
    setSelectedEmployee(row)
    setEmpDisplayName(employeeOptionLabel(row))
  }, [])

  useEffect(() => {
    if (!staffLocked || !empNumber || !collegeId) return
    void (async () => {
      setEmployeeSearchLoading(true)
      try {
        const list = await searchEmployeesForHr(empNumber, collegeId)
        setEmployeeRows(list)
        setEmployeeOptions(
          list.map((e) => ({ value: String(e.employeeId), label: employeeOptionLabel(e) })),
        )
        if (list.length > 0) loadEmployee(list[0] as Record<string, unknown>)
      } catch (e) {
        toastError(e, 'Failed to load employee')
      } finally {
        setEmployeeSearchLoading(false)
      }
    })()
  }, [staffLocked, empNumber, collegeId, loadEmployee])

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
          list.map((e) => ({ value: String(e.employeeId), label: employeeOptionLabel(e) })),
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

  function handleEmployeeChange(v: string | null) {
    if (!v) {
      setSelectedEmployeeId(null)
      setSelectedEmployee(null)
      setEmpDisplayName('')
      return
    }
    const id = Number(v)
    const row = employeeRows.find((e) => Number(e.employeeId) === id)
    if (row) loadEmployee(row)
  }

  const openAssessment = useCallback(
    (assessmentFeedbackId?: number) => {
      if (!selectedEmployeeId || !selectedEmployee) return
      const params = new URLSearchParams({
        empId: String(selectedEmployeeId),
        empFirstName: empDisplayName,
        designation: String(selectedEmployee.designation ?? ''),
        empDeptName: String(selectedEmployee.empDeptName ?? selectedEmployee.deptName ?? ''),
      })
      if (assessmentFeedbackId) {
        params.set('assessmentFeedbackId', String(assessmentFeedbackId))
      }
      router.push(`/hr-payroll/employee/performance-assessment/add-performance?${params.toString()}`)
    },
    [selectedEmployeeId, selectedEmployee, empDisplayName, router],
  )

  const columnDefs = useMemo<ColDef<PerfRow>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.employee,
        valueFormatter: () => empDisplayName,
      },
      {
        ...COL_DEFS.feedbackDate,
        valueFormatter: (p) => formatFeedbackDate(p.value),
      },
      COL_DEFS.overallRating,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<PerfRow>) => {
          const id = Number(p.data?.assessmentFeedbackId ?? 0)
          return (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 px-2 text-[11px]"
              onClick={() => openAssessment(id || undefined)}
            >
              {viewOnly ? 'View' : 'Edit'}
            </Button>
          )
        },
      },
    ],
    [empDisplayName, viewOnly, openAssessment],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={(
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
            Faculty Performance Assessment
          </span>
        )}
        defaultOpen
      >
        <div className="max-w-xl">
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Employee"
            value={selectedEmployeeId ? String(selectedEmployeeId) : null}
            onChange={handleEmployeeChange}
            options={employeeOptions}
            placeholder="Search by name or employee id (min 4 chars)"
            searchable
            onSearch={onEmployeeSearch}
            isLoading={employeeSearchLoading}
            disabled={!sessionLoading && staffLocked}
            clearable={!staffLocked}
          />
        </div>
      </FilterCard>

      {selectedEmployeeId ? (
        <>
          <div className="app-card overflow-hidden px-4 py-3">
            <h2 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
              Faculty Performance History
            </h2>
          </div>

          {error ? (
            <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p>
          ) : null}

          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={history}
              columnDefs={columnDefs}
              loading={isFetching}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search',
                pdfDocumentTitle: 'Faculty Performance History',
              }}
              toolbarTrailing={
                !isPrincipal ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-[30px] px-3 text-[12px]"
                    onClick={() => openAssessment()}
                  >
                    <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                    Take Assessment
                  </Button>
                ) : null
              }
            />
          </TableCard>
        </>
      ) : null}
    </PageContainer>
  )
}
