'use client'

import { useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listEmployeeDetails } from '@/services'
import { rowIndexGetter } from '@/lib/utils'

type EmpRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<EmpRow>,
  empNumber: { field: 'empNumber', headerName: 'Emp No', minWidth: 100 } as ColDef<EmpRow>,
  firstName: { field: 'firstName', headerName: 'Name', minWidth: 140 } as ColDef<EmpRow>,
  gender: { field: 'gender', headerName: 'Gender', minWidth: 90, flex: 0 } as ColDef<EmpRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<EmpRow>,
  dept: { field: 'deptName', headerName: 'Department', minWidth: 120 } as ColDef<EmpRow>,
  designation: { field: 'designationName', headerName: 'Designation', minWidth: 120 } as ColDef<EmpRow>,
  mobile: { field: 'mobile', headerName: 'Mobile', minWidth: 110 } as ColDef<EmpRow>,
  email: { field: 'email', headerName: 'Email', minWidth: 160 } as ColDef<EmpRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<EmpRow>,
}

function statusRenderer(p: ICellRendererParams<EmpRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

export function EmployeeListPage() {
  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.employees(),
    queryFn: listEmployeeDetails,
  })

  const columnDefs = useMemo<ColDef<EmpRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.empNumber,
      COL_DEFS.firstName,
      COL_DEFS.gender,
      COL_DEFS.college,
      COL_DEFS.dept,
      COL_DEFS.designation,
      COL_DEFS.mobile,
      COL_DEFS.email,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Employee List
        </h1>
      </div>
      {error ? <p className="text-sm text-destructive px-1">{getErrorMessage(error)}</p> : null}
      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isFetching}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search employees…',
            pdfDocumentTitle: 'Employee List',
          }}
        />
      </TableCard>
    </PageContainer>
  )
}
