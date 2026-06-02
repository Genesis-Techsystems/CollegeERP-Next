'use client'

import { useMemo, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listDepartmentHeads } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { DepartmentHeadsModal } from './DepartmentHeadsModal'

type DeptHeadRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<DeptHeadRow>,
  college: { field: 'collegeCode', headerName: 'College Code', minWidth: 110 } as ColDef<DeptHeadRow>,
  department: { field: 'departmentCode', headerName: 'Department', minWidth: 110 } as ColDef<DeptHeadRow>,
  course: { field: 'courseName', headerName: 'Course', minWidth: 100 } as ColDef<DeptHeadRow>,
  group: { field: 'groupCode', headerName: 'Group', minWidth: 90 } as ColDef<DeptHeadRow>,
  room: { field: 'roomName', headerName: 'Room', minWidth: 90 } as ColDef<DeptHeadRow>,
  employee: { field: 'employeeName', headerName: 'Employee', minWidth: 140 } as ColDef<DeptHeadRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<DeptHeadRow>,
}

function statusRenderer(p: ICellRendererParams<DeptHeadRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

export function DepartmentHeadsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.hrPayroll.departmentHeads(),
    queryFn: listDepartmentHeads,
  })

  const columnDefs = useMemo<ColDef<DeptHeadRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.department,
      COL_DEFS.course,
      COL_DEFS.group,
      COL_DEFS.room,
      COL_DEFS.employee,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QK.hrPayroll.departmentHeads() })
  }

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Department Heads
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
            searchPlaceholder: 'Search department heads…',
            pdfDocumentTitle: 'Department Heads',
          }}
          toolbarTrailing={(
            <Button
              type="button"
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => setModalOpen(true)}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add
            </Button>
          )}
        />
      </TableCard>

      <DepartmentHeadsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingRows={rows}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
