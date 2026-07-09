'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listDepartments } from '@/services'
import type { Department } from '@/types/department'
import DepartmentModal from './DepartmentModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Department>,
  collegeCode: { colId: 'collegeCode', headerName: 'College Code', minWidth: 130, flex: 1 } as ColDef<Department>,
  deptCode: { colId: 'deptCode', field: 'deptCode', headerName: 'Department Code', minWidth: 150, flex: 1 } as ColDef<Department>,
  deptName: { colId: 'deptName', field: 'deptName', headerName: 'Department Name', minWidth: 170, flex: 1.2 } as ColDef<Department>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Department>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Department>,
}

function statusRenderer(p: ICellRendererParams<Department>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}
function actionRenderer(setRow: (r: Department | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<Department>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DepartmentsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Department | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.departments.list(),
    queryFn: listDepartments,
  })

  const columnDefs = useMemo<ColDef<Department>[]>(() => [
    COLS.siNo,
    { ...COLS.collegeCode, valueGetter: (p) => p.data?.collegeCode ?? '-' },
    COLS.deptCode,
    COLS.deptName,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Departments
          </h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbarTrailing={(
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Department
              </Button>
            )}
            toolbar={{ search: true, searchPlaceholder: 'Search departments…', pdfDocumentTitle: 'Departments' }}
          />
        </div>
      </div>
      <DepartmentModal
        key={getCrudModalKey(row, open, 'departmentId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
