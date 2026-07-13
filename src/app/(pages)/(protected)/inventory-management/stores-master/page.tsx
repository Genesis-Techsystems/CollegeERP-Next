'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvStoresMaster } from '@/services'
import type { InvStore } from '@/types/inventory'
import StoreMasterModal from './StoreMasterModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvStore>,
  orgCode: { field: 'orgCode', headerName: 'Organisation', minWidth: 120, flex: 1 } as ColDef<InvStore>,
  storeCode: { field: 'storeCode', headerName: 'Store Code', minWidth: 110, flex: 0.9 } as ColDef<InvStore>,
  storeName: { field: 'storeName', headerName: 'Store Name', minWidth: 160, flex: 1.2 } as ColDef<InvStore>,
  empName: { field: 'empName', headerName: 'Store In-charge', minWidth: 140, flex: 1 } as ColDef<InvStore>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<InvStore>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<InvStore>,
}

function statusRenderer(p: ICellRendererParams<InvStore>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvStore | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvStore>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function StoresMasterPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvStore | null>(null)

  const { data, isLoading, invalidate } = useCrudList<InvStore>({
    queryKey: QK.invStoresMaster.list(),
    queryFn: listInvStoresMaster,
  })

  const columnDefs = useMemo<ColDef<InvStore>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.storeCode,
      COL_DEFS.storeName,
      COL_DEFS.empName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Stores Master"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search stores…', pdfDocumentTitle: 'Stores Master' }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Store
        </Button>
      )}
    >
      <StoreMasterModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
