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
import { listCourses } from '@/services'
import type { Course } from '@/types/course'
import CourseModal from './CourseModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Course>,
  univ: { colId: 'universityCode', field: 'universityCode', headerName: 'University', minWidth: 120, flex: 0.9 } as ColDef<Course>,
  code: { colId: 'courseCode', field: 'courseCode', headerName: 'Course Code', minWidth: 110, flex: 0.8 } as ColDef<Course>,
  name: { colId: 'courseName', field: 'courseName', headerName: 'Course Name', minWidth: 160, flex: 1.2 } as ColDef<Course>,
  short: { colId: 'courseShortName', field: 'courseShortName', headerName: 'Course Short Name', minWidth: 110, flex: 0.8 } as ColDef<Course>,
  duration: { colId: 'duration', field: 'duration', headerName: 'Duration', minWidth: 90, flex: 0.6 } as ColDef<Course>,
  inTake: { colId: 'inTake', field: 'inTake', headerName: 'Intake', minWidth: 90, flex: 0.6 } as ColDef<Course>,
  type: { colId: 'courseTypeName', field: 'courseTypeName', headerName: 'Course Type', minWidth: 130, flex: 0.9 } as ColDef<Course>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Course>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Course>,
}
function statusRenderer(p: ICellRendererParams<Course>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: Course | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<Course>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function CoursesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Course | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.courses.list(), queryFn: listCourses })
  const colDefs = useMemo<ColDef<Course>[]>(() => [COLS.siNo, COLS.univ, COLS.code, COLS.name, COLS.short, COLS.duration, COLS.inTake, COLS.type, { ...COLS.isActive, cellRenderer: statusRenderer }, { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) }], [])
  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Courses</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={colDefs}
            loading={isLoading}
            pagination
            toolbarTrailing={
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Course
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search subjects…', pdfDocumentTitle: 'Subjects' }}
          />
        </div>
      </div>
      <CourseModal
        key={getCrudModalKey(row, open, 'courseId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
