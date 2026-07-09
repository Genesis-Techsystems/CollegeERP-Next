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
import { listStudentCategories } from '@/services'
import type { StudentCategory } from '@/types/student-category'
import StudentCategoryModal from './StudentCategoryModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentCategory>,
  orgName: { colId: 'orgName', headerName: 'Organization', minWidth: 130, flex: 1 } as ColDef<StudentCategory>,
  studentCategory: { colId: 'studentCategory', field: 'studentCategory', headerName: 'Student Category', minWidth: 160, flex: 1.2 } as ColDef<StudentCategory>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<StudentCategory>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<StudentCategory>,
}

function statusRenderer(p: ICellRendererParams<StudentCategory>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionRenderer(setRow: (r: StudentCategory | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<StudentCategory>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function StudentCategoriesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<StudentCategory | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.studentCategories.list(),
    queryFn: listStudentCategories,
  })

  const columnDefs = useMemo<ColDef<StudentCategory>[]>(() => [
    COLS.siNo,
    { ...COLS.orgName, valueGetter: (p) => p.data?.orgCode ?? p.data?.orgName ?? '-' },
    COLS.studentCategory,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Student Categories
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
                Add Student Category
              </Button>
            )}
            toolbar={{ search: true, searchPlaceholder: 'Search student categories…', pdfDocumentTitle: 'Student Categories' }}
          />
        </div>
      </div>
      <StudentCategoryModal
        key={getCrudModalKey(row, open, 'studentCatId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
