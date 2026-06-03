'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, Settings2, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listGeneralMasters } from '@/services'
import type { GeneralMaster } from '@/types/general-master'
import GeneralMasterDetailsModal from '../general-master-settings/GeneralMasterDetailsModal'
import GeneralMasterModal from '../general-master-settings/GeneralMasterModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<GeneralMaster>,
  generalMasterCode: { field: 'generalMasterCode', headerName: 'General Master Code', minWidth: 170, flex: 1 } as ColDef<GeneralMaster>,
  generalMasterDisplayName: { field: 'generalMasterDisplayName', headerName: 'General Master Name', minWidth: 210, flex: 1.2 } as ColDef<GeneralMaster>,
  generalMasterDescription: { field: 'generalMasterDescription', headerName: 'Description', minWidth: 210, flex: 1.2 } as ColDef<GeneralMaster>,
  actions: { headerName: 'Actions', minWidth: 220, width: 220, flex: 0 } as ColDef<GeneralMaster>,
}

function makeActionsRenderer(
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
        aria-label="Edit general master"
        onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export default function GeneralSettingsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<GeneralMaster | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsRow, setDetailsRow] = useState<GeneralMaster | null>(null)

  const { data: settings, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.generalMasters.list(),
    queryFn: listGeneralMasters,
  })

  const columnDefs = useMemo<ColDef<GeneralMaster>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.generalMasterCode,
      COL_DEFS.generalMasterDisplayName,
      COL_DEFS.generalMasterDescription,
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingSetting, setModalOpen, setDetailsRow, setDetailsOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">General Master Settings</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && settings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Settings2 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No general masters found</p>
              </div>
            ) : (
              <DataTable
                rowData={settings}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search general masters…', pdfDocumentTitle: 'General Master Settings' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingSetting(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add General Master
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <GeneralMasterModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSetting(null) }}
        row={editingSetting}
        onSaved={invalidate}
      />
      <GeneralMasterDetailsModal
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setDetailsRow(null) }}
        row={detailsRow}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
