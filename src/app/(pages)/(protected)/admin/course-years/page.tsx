'use client'
import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listCourseYearsAdmin } from '@/services'
import type { CourseYear } from '@/types/course-year'
import CourseYearModal from './CourseYearModal'

const COLS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CourseYear>,
  university: { headerName: 'University', minWidth: 130, flex: 1 } as ColDef<CourseYear>,
  course: { headerName: 'Course', minWidth: 130, flex: 1 } as ColDef<CourseYear>,
  yearNo: { field: 'yearNo', headerName: 'Year No', minWidth: 90, flex: 0.7 } as ColDef<CourseYear>,
  code: { field: 'courseYearCode', headerName: 'Semester Code', minWidth: 140, flex: 1 } as ColDef<CourseYear>,
  name: { field: 'courseYearName', headerName: 'Semester Name', minWidth: 160, flex: 1.1 } as ColDef<CourseYear>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<CourseYear>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CourseYear>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<CourseYear>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: CourseYear | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<CourseYear>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function CourseYearsPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<CourseYear | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.courseYears.list(), queryFn: listCourseYearsAdmin })
  const filtered = useMemo(() => !search.trim() ? data : data.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase()))), [data, search])
  const columnDefs = useMemo<ColDef<CourseYear>[]>(() => [
    COLS.siNo,
    { ...COLS.university, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['universityCode', 'universityName']) },
    { ...COLS.course, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseCode', 'courseName']) },
    COLS.yearNo,
    COLS.code,
    COLS.name,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Semester</h2>
          <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}><PlusIcon className="h-4 w-4 mr-1" />Add Semester</Button>
        </div>
        <div className="p-3"><SearchInput className="max-w-sm" placeholder="Search semesters..." value={search} onChange={setSearch} /></div>
        <div className="px-3 pb-3"><DataTable rowData={filtered} columnDefs={columnDefs} loading={isLoading} pagination /></div>
      </div>
      <CourseYearModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
