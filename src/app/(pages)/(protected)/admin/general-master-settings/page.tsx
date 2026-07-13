'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon, Settings2 } from 'lucide-react'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listGeneralMasters } from '@/services'
import type { GeneralMaster } from '@/types/general-master'
import GeneralMasterDetailsModal from './GeneralMasterDetailsModal'
import GeneralMasterModal from './GeneralMasterModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<GeneralMaster>,
  generalMasterCode: { field: 'generalMasterCode', headerName: 'General Master Code', minWidth: 170, flex: 1 } as ColDef<GeneralMaster>,
  generalMasterDisplayName: { field: 'generalMasterDisplayName', headerName: 'General Master Name', minWidth: 210, flex: 1.2 } as ColDef<GeneralMaster>,
  generalMasterDescription: { field: 'generalMasterDescription', headerName: 'Description', minWidth: 210, flex: 1.2 } as ColDef<GeneralMaster>,
  actions: { headerName: 'Actions', minWidth: 220, width: 220, flex: 0 } as ColDef<GeneralMaster>,
}

function actionsRenderer(
  setEditing: (row: GeneralMaster | null) => void,
  setModalOpen: (open: boolean) => void,
  setDetailsRow: (row: GeneralMaster | null) => void,
  setDetailsOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<GeneralMaster>) => (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setDetailsRow(p.data ?? null); setDetailsOpen(true) }}
      >
        Add / Edit Details
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export default function GeneralMasterSettingsPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<GeneralMaster | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsRow, setDetailsRow] = useState<GeneralMaster | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.generalMasters.list(),
    queryFn: listGeneralMasters,
  })

  const columnDefs = useMemo<ColDef<GeneralMaster>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.generalMasterCode,
    COL_DEFS.generalMasterDisplayName,
    COL_DEFS.generalMasterDescription,
    { ...COL_DEFS.actions, cellRenderer: actionsRenderer(setRow, setOpen, setDetailsRow, setDetailsOpen) },
  ], [])

  return (
    <ListPage
      title="General Master Settings"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search general masters…', pdfDocumentTitle: 'General Master Settings' }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add General Master
        </Button>
      )}
      emptyState={
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Settings2 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No general masters found</p>
          <Button size="sm" className="mt-4" onClick={() => { setRow(null); setOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add General Master
          </Button>
        </div>
      }
    >
      <GeneralMasterModal open={open} onClose={() => { setOpen(false); setRow(null) }} row={row} onSaved={invalidate} />
      <GeneralMasterDetailsModal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setDetailsRow(null) }}
        row={detailsRow}
        onSaved={invalidate}
      />
    </ListPage>
  )
}

