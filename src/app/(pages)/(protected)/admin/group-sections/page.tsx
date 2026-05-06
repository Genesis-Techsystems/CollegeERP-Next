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
import { listGroupSectionsAdmin } from '@/services'
import type { GroupSection } from '@/types/group-section'
import GroupSectionModal from './GroupSectionModal'

const COLS = {
  courseGroup: { colId: 'courseGroup', headerName: 'Course group', minWidth: 150, flex: 1 } as ColDef<GroupSection>,
  courseYear: { colId: 'courseYear', headerName: 'course year', minWidth: 130, flex: 1 } as ColDef<GroupSection>,
  academicYear: { colId: 'academicYear', headerName: 'Acadamic year', minWidth: 140, flex: 1 } as ColDef<GroupSection>,
  section: { colId: 'section', headerName: 'section', minWidth: 160, flex: 1.1 } as ColDef<GroupSection>,
  sortOrder: { colId: 'sortOrder', headerName: 'sort order', minWidth: 110, flex: 0.8 } as ColDef<GroupSection>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<GroupSection>,
  actions: { colId: 'actions', headerName: 'action', minWidth: 86, width: 86, flex: 0 } as ColDef<GroupSection>,
}
function pick(r: Record<string, unknown>, keys: string[]) { for (const k of keys) { const v = r[k]; if (typeof v === 'string' && v.trim()) return v } return '' }
function statusRenderer(p: ICellRendererParams<GroupSection>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: GroupSection | null) => void, setOpen: (b: boolean) => void) { return (p: ICellRendererParams<GroupSection>) => <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}><PencilIcon className="h-3.5 w-3.5" /></Button> }

export default function GroupSectionsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<GroupSection | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.groupSections.list(), queryFn: listGroupSectionsAdmin })
  const columnDefs = useMemo<ColDef<GroupSection>[]>(() => [
    { ...COLS.courseGroup, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupCode', 'groupName', 'courseGroupCode']) },
    { ...COLS.courseYear, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['courseYearCode', 'courseYearName']) },
    { ...COLS.academicYear, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['academicYear', 'academicYearCode', 'academicYearName']) },
    { ...COLS.section, valueGetter: (p) => pick((p.data ?? {}) as Record<string, unknown>, ['groupSectionName', 'groupSectionCode']) },
    { ...COLS.sortOrder, valueGetter: (p) => (p.data as Record<string, unknown>)?.sortOrder ?? '' },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Sections</h2>
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
                Add Section
              </Button>
            }
            toolbar={{ search: true, searchPlaceholder: 'Search sections…', pdfDocumentTitle: 'Group sections' }}
          />
        </div>
      </div>
      <GroupSectionModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
    </PageContainer>
  )
}
