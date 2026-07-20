'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { toastError } from '@/lib/toast'
import {
  getCollegeById,
  listActiveCollegesForGeneralSettings,
  listActiveEmployeesForPayrollAssign,
  listAllActiveEmployeePayrollGroups,
  listDepartmentsByCollege,
} from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown> & { payroll?: string }

function toCollegeOptions(
  colleges: Array<{
    collegeId?: number | string
    collegeCode?: string | null
    collegeName?: string | null
  }>,
): SelectOption[] {
  return colleges
    .map((c) => {
      const id = Number(c.collegeId)
      if (!id) return null
      return {
        value: String(id),
        label: String(c.collegeCode ?? c.collegeName ?? id),
      }
    })
    .filter((o): o is SelectOption => o != null)
}

export function AssignEmployeeToGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const payrollGroupId = Number(searchParams.get('payrollGroupId') ?? 0)
  const paramCollegeId = Number(searchParams.get('collegeId') ?? 0)
  const paramDepartmentId = searchParams.get('departmentId')

  const [collegeId, setCollegeId] = useState<number | null>(
    paramCollegeId || null,
  )
  const [departmentId, setDepartmentId] = useState<number | null>(
    paramDepartmentId != null && paramDepartmentId !== ''
      ? Number(paramDepartmentId)
      : null,
  )
  const [collegeOptions, setCollegeOptions] = useState<SelectOption[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<SelectOption[]>([])
  const [assignments, setAssignments] = useState<EmpRow[]>([])
  const [assignmentsReady, setAssignmentsReady] = useState(false)
  const [employees, setEmployees] = useState<EmpRow[]>([])
  const [collegesLoading, setCollegesLoading] = useState(true)
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const backHref = `/hr-payroll/payroll/payroll-group/assigned-employees?payrollGroupId=${payrollGroupId}&collegeId=${paramCollegeId || collegeId || ''}`

  // Angular loads College + employeepayrollgroup separately — never couple them in
  // Promise.all (assignment failure was wiping college options).
  useEffect(() => {
    void (async () => {
      setCollegesLoading(true)
      try {
        // Angular: listDetailsById(College, 'true', isActive)
        let options = toCollegeOptions(await listActiveCollegesForGeneralSettings())

        // Ensure URL college appears even if list is empty/partial
        if (
          paramCollegeId &&
          !options.some((o) => Number(o.value) === paramCollegeId)
        ) {
          try {
            const one = await getCollegeById(paramCollegeId)
            if (one) {
              options = [...options, ...toCollegeOptions([one])]
            } else {
              options = [
                ...options,
                { value: String(paramCollegeId), label: String(paramCollegeId) },
              ]
            }
          } catch {
            options = [
              ...options,
              { value: String(paramCollegeId), label: String(paramCollegeId) },
            ]
          }
        }

        setCollegeOptions(options)
        if (!paramCollegeId && options.length > 0) {
          setCollegeId(Number(options[0].value))
        } else if (paramCollegeId) {
          setCollegeId(paramCollegeId)
        }
      } catch (e) {
        toastError(e, 'Failed to load colleges')
        if (paramCollegeId) {
          setCollegeOptions([
            { value: String(paramCollegeId), label: String(paramCollegeId) },
          ])
          setCollegeId(paramCollegeId)
        }
      } finally {
        setCollegesLoading(false)
      }
    })()
  }, [paramCollegeId])

  useEffect(() => {
    void (async () => {
      try {
        // Angular: listByTwoIds(employeepayrollgroup, 'true', '999', isActive, size)
        const activeAssignments = await listAllActiveEmployeePayrollGroups()
        setAssignments(activeAssignments)
      } catch (e) {
        toastError(e, 'Failed to load payroll assignments')
        setAssignments([])
      } finally {
        setAssignmentsReady(true)
      }
    })()
  }, [])

  const loadDepartments = useCallback(
    async (cid: number, preferDeptId?: number | null) => {
      setDepartmentsLoading(true)
      setEmployees([])
      try {
        const depts = await listDepartmentsByCollege(cid)
        const options: SelectOption[] = [
          { value: '0', label: 'All' },
          ...depts.map((d) => ({
            value: String(d.departmentId),
            label: String(d.deptCode ?? d.deptName ?? d.departmentId),
          })),
        ]
        setDepartmentOptions(options)
        if (preferDeptId != null && preferDeptId !== undefined) {
          setDepartmentId(preferDeptId)
        } else if (depts.length > 0) {
          setDepartmentId(Number(depts[0].departmentId))
        } else {
          setDepartmentId(0)
        }
      } catch (e) {
        toastError(e, 'Failed to load departments')
        setDepartmentOptions([{ value: '0', label: 'All' }])
        setDepartmentId(0)
      } finally {
        setDepartmentsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!collegeId) return
    const prefer =
      paramDepartmentId != null && paramDepartmentId !== ''
        ? Number(paramDepartmentId)
        : undefined
    void loadDepartments(collegeId, prefer)
  }, [collegeId, loadDepartments, paramDepartmentId])

  const handleGetEmployees = useCallback(async () => {
    if (!collegeId) {
      toastError(new Error('Select a college'), 'College is required')
      return
    }
    setLoadingEmployees(true)
    setError(null)
    try {
      const rows = await listActiveEmployeesForPayrollAssign({
        collegeId,
        departmentId,
      })
      const assignedIds = new Set(
        assignments.map((a) => Number(a.employeeId)),
      )
      setEmployees(
        rows.map((r) => ({
          ...r,
          payroll: assignedIds.has(Number(r.employeeId))
            ? 'Assigned'
            : 'Not Assigned',
        })),
      )
    } catch (e) {
      setError(getErrorMessage(e))
      toastError(e, 'Failed to load employees')
    } finally {
      setLoadingEmployees(false)
    }
  }, [collegeId, departmentId, assignments])

  useEffect(() => {
    if (
      paramDepartmentId == null ||
      paramDepartmentId === '' ||
      !collegeId ||
      !assignmentsReady
    ) {
      return
    }
    void handleGetEmployees()
    // Auto-load once when returning from emp-payroll with departmentId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramDepartmentId, collegeId, assignmentsReady])

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
      {
        field: 'empCategoryName',
        headerName: 'Employee Category',
        minWidth: 140,
        valueFormatter: (p) =>
          String(p.data?.empCategoryName ?? p.data?.empCatName ?? '—'),
      },
      {
        field: 'payroll',
        headerName: 'Payroll group',
        minWidth: 120,
      },
      {
        headerName: 'Actions',
        minWidth: 150,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<EmpRow>) => {
          // Angular: Assigned → "—"; Not Assigned → "Add to this group"
          if (String(p.data?.payroll) === 'Assigned') {
            return <span className="text-muted-foreground px-2">—</span>
          }
          const empId = Number(p.data?.employeeId ?? 0)
          if (!empId || !payrollGroupId || !collegeId) return null
          const deptId = Number(
            p.data?.empDeptId ?? p.data?.departmentId ?? departmentId ?? 0,
          )
          const href = `/hr-payroll/payroll/payroll-group/assigned-employees/add-employee/emp-payroll?payrollGroupId=${payrollGroupId}&empId=${empId}&collegeId=${collegeId}&departmentId=${deptId}`
          return (
            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-primary">
              <Link href={href}>Add to this group</Link>
            </Button>
          )
        },
      },
    ],
    [payrollGroupId, collegeId, departmentId],
  )

  if (!payrollGroupId) {
    return (
      <PageContainer className="space-y-4">
        <p className="text-sm text-muted-foreground">Missing payroll group.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/hr-payroll/payroll/payroll-group">Back</Link>
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3">
          <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
            Add Employees
          </h1>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Filter
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full max-w-[220px] space-y-1.5">
            <Select
              label="College"
              required
              value={collegeId != null ? String(collegeId) : null}
              onChange={(v) => {
                setCollegeId(v ? Number(v) : null)
                setDepartmentId(null)
                setEmployees([])
              }}
              options={collegeOptions}
              placeholder="Select college"
              isLoading={collegesLoading}
              clearable={false}
            />
          </div>
          <div className="w-full max-w-[220px] space-y-1.5">
            <Select
              label="Department"
              value={departmentId != null ? String(departmentId) : null}
              onChange={(v) => {
                setDepartmentId(v != null && v !== '' ? Number(v) : 0)
                setEmployees([])
              }}
              options={departmentOptions}
              placeholder="Select department"
              isLoading={departmentsLoading}
              clearable={false}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-[30px]"
            disabled={!collegeId || loadingEmployees}
            onClick={() => void handleGetEmployees()}
          >
            {loadingEmployees ? 'Loading…' : 'Get List'}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive px-1">{error}</p> : null}

      {employees.length > 0 || loadingEmployees ? (
        <div className="app-card overflow-hidden">
          <TableCard withHeaderBorder={false} className="border-0 shadow-none rounded-none">
            <DataTable
              title="Employees"
              subtitle=""
              rowData={employees}
              columnDefs={columnDefs}
              loading={loadingEmployees}
              pagination
              paginationPageSize={10}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search',
                columnPicker: true,
              }}
            />
          </TableCard>
        </div>
      ) : null}

      <Button variant="outline" size="sm" onClick={() => router.push(backHref)}>
        Back
      </Button>
    </PageContainer>
  )
}
