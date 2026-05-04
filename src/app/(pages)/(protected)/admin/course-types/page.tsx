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
import { rowIndexGetter } from '@/lib/utils'
import { listCourseTypes } from '@/services'
import type { CourseType } from '@/types/course-type'
import CourseTypeModal from './CourseTypeModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CourseType>,
  university: { colId: 'university', headerName: 'University', minWidth: 140, flex: 1 } as ColDef<CourseType>,
  code: { colId: 'courseTypeCode', headerName: 'Course Type Code', minWidth: 150, flex: 1 } as ColDef<CourseType>,
  name: { colId: 'courseTypeName', headerName: 'Course Type Name', minWidth: 170, flex: 1.2 } as ColDef<CourseType>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<CourseType>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CourseType>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<CourseType>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: CourseType | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<CourseType>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function CourseTypesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<CourseType | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.courseTypes.list(), queryFn: listCourseTypes })
  const columnDefs = useMemo<ColDef<CourseType>[]>(() => [
    COLS.siNo,
    { ...COLS.university, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['universityCode', 'universityName']) },
    { ...COLS.code, field: 'courseTypeCode' },
    { ...COLS.name, field: 'courseTypeName' },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Subject Types</h2>
          <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}><PlusIcon className="h-4 w-4 mr-1" />Add Subject Type</Button>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{ search: true, searchPlaceholder: 'Search subject types…', pdfDocumentTitle: 'Subject types' }}
          />
        </div>
      </div>
      <CourseTypeModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
