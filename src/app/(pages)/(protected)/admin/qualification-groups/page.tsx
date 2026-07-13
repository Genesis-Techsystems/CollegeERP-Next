'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listQualificationGroups } from '@/services'
import type { QualificationGroup } from '@/types/qualification-group'
import QualificationGroupModal from './QualificationGroupModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<QualificationGroup>,
  qualificationName: { colId: 'qualificationName', field: 'qualificationName', headerName: 'Qualification Name', minWidth: 170, flex: 1.2 } as ColDef<QualificationGroup>,
  qualificationGroupCode: { colId: 'qualificationGroupCode', field: 'qualificationGroupCode', headerName: 'Qualification Group Code', minWidth: 170, flex: 1.1 } as ColDef<QualificationGroup>,
  qualificationGroupName: { colId: 'qualificationGroupName', field: 'qualificationGroupName', headerName: 'Qualification Group Name', minWidth: 190, flex: 1.2 } as ColDef<QualificationGroup>,
  sortOrder: { colId: 'sortOrder', field: 'sortOrder', headerName: 'Sort Order', minWidth: 100, flex: 0.8 } as ColDef<QualificationGroup>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<QualificationGroup>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<QualificationGroup>,
}

function statusRenderer(p: ICellRendererParams<QualificationGroup>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}
function actionRenderer(setRow: (r: QualificationGroup | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<QualificationGroup>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function QualificationGroupsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<QualificationGroup | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.qualificationGroups.list(),
    queryFn: listQualificationGroups,
  })

  const columnDefs = useMemo<ColDef<QualificationGroup>[]>(() => [
    COLS.siNo,
    COLS.qualificationName,
    COLS.qualificationGroupCode,
    COLS.qualificationGroupName,
    COLS.sortOrder,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <ListPage
      title="Qualification Groups"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search qualification groups…', pdfDocumentTitle: 'Qualification Groups' }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Qualification Group
        </Button>
      )}
    >
      <QualificationGroupModal
        key={getCrudModalKey(row, open, 'qualificationGroupId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
