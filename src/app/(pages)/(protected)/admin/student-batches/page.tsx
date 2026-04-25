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
import { listStudentBatches } from '@/services'
import type { StudentBatch } from '@/types/student-batch'
import StudentBatchModal from './StudentBatchModal'

const COLS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentBatch>,
  section: { headerName: 'Section', minWidth: 130, flex: 1 } as ColDef<StudentBatch>,
  batch: { headerName: 'Batch', minWidth: 130, flex: 1 } as ColDef<StudentBatch>,
  college: { headerName: 'College', minWidth: 130, flex: 1 } as ColDef<StudentBatch>,
  group: { headerName: 'Subject Group', minWidth: 140, flex: 1 } as ColDef<StudentBatch>,
  year: { headerName: 'Semester', minWidth: 110, flex: 0.8 } as ColDef<StudentBatch>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<StudentBatch>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<StudentBatch>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<StudentBatch>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: StudentBatch | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<StudentBatch>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function StudentBatchesPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<StudentBatch | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.studentBatches.list(), queryFn: listStudentBatches })
  const filtered = useMemo(() => !search.trim() ? data : data.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase()))), [data, search])
  const columnDefs = useMemo<ColDef<StudentBatch>[]>(() => [
    COLS.siNo,
    { ...COLS.section, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupSectionCode', 'groupSectionName']) },
    { ...COLS.batch, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['batchCode', 'batchName']) },
    { ...COLS.college, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['collegeCode', 'collegeName']) },
    { ...COLS.group, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupCode', 'groupName']) },
    { ...COLS.year, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseYearCode', 'courseYearName']) },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Student Batches</h2>
          <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}><PlusIcon className="h-4 w-4 mr-1" />Add Student Batch</Button>
        </div>
        <div className="p-3"><SearchInput className="max-w-sm" placeholder="Search student batches..." value={search} onChange={setSearch} /></div>
        <div className="px-3 pb-3"><DataTable rowData={filtered} columnDefs={columnDefs} loading={isLoading} pagination /></div>
      </div>
      <StudentBatchModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
