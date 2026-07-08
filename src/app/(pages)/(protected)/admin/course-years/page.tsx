'use client'
import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { useBreadcrumbLabel } from '@/common/components'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listCourseYearsAdmin } from '@/services'
import type { CourseYear } from '@/types/course-year'
import CourseYearModal from './CourseYearModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CourseYear>,
  university: { colId: 'university', headerName: 'University', minWidth: 130, flex: 1 } as ColDef<CourseYear>,
  course: { colId: 'course', headerName: 'Course', minWidth: 130, flex: 1 } as ColDef<CourseYear>,
  yearNo: { colId: 'yearNo', field: 'yearNo', headerName: 'Year No', minWidth: 90, flex: 0.7 } as ColDef<CourseYear>,
  sortOrder: { colId: 'sortOrder', field: 'sortOrder', headerName: 'Sort Order', minWidth: 100, flex: 0.7 } as ColDef<CourseYear>,
  code: { colId: 'courseYearCode', field: 'courseYearCode', headerName: 'Semester Code', minWidth: 140, flex: 1 } as ColDef<CourseYear>,
  name: { colId: 'courseYearName', field: 'courseYearName', headerName: 'Semester Name', minWidth: 160, flex: 1.1 } as ColDef<CourseYear>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<CourseYear>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CourseYear>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<CourseYear>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: CourseYear | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<CourseYear>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function CourseYearsPage() {
  useBreadcrumbLabel('Semester')
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<CourseYear | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.courseYears.list(), queryFn: listCourseYearsAdmin })
  const columnDefs = useMemo<ColDef<CourseYear>[]>(() => [
    COLS.siNo,
    { ...COLS.university, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['universityCode', 'universityName']) },
    { ...COLS.course, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseCode', 'courseName']) },
    COLS.yearNo,
    COLS.sortOrder,
    COLS.code,
    COLS.name,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Semester</h2>
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
                Add Semester
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search semesters…', pdfDocumentTitle: 'Semesters' }}
          />
        </div>
      </div>
      <CourseYearModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
