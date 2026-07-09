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
import { listCourseGroupsAdmin } from '@/services'
import type { CourseGroup } from '@/types/course-group'
import CourseGroupModal from './CourseGroupModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CourseGroup>,
  university: { colId: 'university', headerName: 'University', minWidth: 130, flex: 1 } as ColDef<CourseGroup>,
  course: { colId: 'course', headerName: 'Course', minWidth: 140, flex: 1 } as ColDef<CourseGroup>,
  code: { colId: 'groupCode', field: 'groupCode', headerName: 'Course Group Code', minWidth: 150, flex: 1 } as ColDef<CourseGroup>,
  name: { colId: 'groupName', field: 'groupName', headerName: 'Course Group Name', minWidth: 170, flex: 1.2 } as ColDef<CourseGroup>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<CourseGroup>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CourseGroup>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<CourseGroup>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: CourseGroup | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<CourseGroup>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function CourseGroupsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<CourseGroup | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.courseGroups.list(), queryFn: listCourseGroupsAdmin })
  const columnDefs = useMemo<ColDef<CourseGroup>[]>(() => [
    COLS.siNo,
    { ...COLS.university, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['universityCode', 'universityName']) },
    { ...COLS.course, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseCode', 'courseName']) },
    COLS.code,
    COLS.name,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Course Groups</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbarTrailing={
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Course Group
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search subject groups…', pdfDocumentTitle: 'Subject groups' }}
          />
        </div>
      </div>
      <CourseGroupModal
        key={getCrudModalKey(row, open, 'courseGroupId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
