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
import { listGroupSectionsAdmin } from '@/services'
import type { GroupSection } from '@/types/group-section'
import GroupSectionModal from './GroupSectionModal'

const COLS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<GroupSection>,
  college: { headerName: 'College', minWidth: 130, flex: 1 } as ColDef<GroupSection>,
  group: { headerName: 'Subject Group', minWidth: 140, flex: 1 } as ColDef<GroupSection>,
  year: { headerName: 'Semester', minWidth: 120, flex: 0.9 } as ColDef<GroupSection>,
  code: { field: 'groupSectionCode', headerName: 'Section Code', minWidth: 130, flex: 1 } as ColDef<GroupSection>,
  name: { field: 'groupSectionName', headerName: 'Section Name', minWidth: 160, flex: 1.1 } as ColDef<GroupSection>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<GroupSection>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<GroupSection>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<GroupSection>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: GroupSection | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<GroupSection>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function GroupSectionsPage() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<GroupSection | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.groupSections.list(), queryFn: listGroupSectionsAdmin })
  const filtered = useMemo(() => !search.trim() ? data : data.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(search.toLowerCase()))), [data, search])
  const columnDefs = useMemo<ColDef<GroupSection>[]>(() => [
    COLS.siNo,
    { ...COLS.college, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['collegeCode', 'collegeName']) },
    { ...COLS.group, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupCode', 'groupName']) },
    { ...COLS.year, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseYearCode', 'courseYearName']) },
    COLS.code,
    COLS.name,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Sections</h2>
          <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}><PlusIcon className="h-4 w-4 mr-1" />Add Section</Button>
        </div>
        <div className="p-3"><SearchInput className="max-w-sm" placeholder="Search sections..." value={search} onChange={setSearch} /></div>
        <div className="px-3 pb-3"><DataTable rowData={filtered} columnDefs={columnDefs} loading={isLoading} pagination /></div>
      </div>
      <GroupSectionModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
