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
import { listInvUoms } from '@/services'
import type { InvUom } from '@/types/inventory'
import UomMasterModal from './UomMasterModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvUom>,
  orgCode: { field: 'orgCode', headerName: 'Organisation', minWidth: 120, flex: 1 } as ColDef<InvUom>,
  uomCode: { field: 'uomCode', headerName: 'UOM Code', minWidth: 110, flex: 0.9 } as ColDef<InvUom>,
  uomName: { field: 'uomName', headerName: 'UOM Name', minWidth: 160, flex: 1.2 } as ColDef<InvUom>,
  conversionqty: { field: 'conversionqty', headerName: 'Conversion Qty', minWidth: 120, flex: 0.8 } as ColDef<InvUom>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<InvUom>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<InvUom>,
}

function statusRenderer(p: ICellRendererParams<InvUom>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvUom | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvUom>) => (
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

export default function UomMasterPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvUom | null>(null)

  const { data, isLoading, invalidate } = useCrudList<InvUom>({
    queryKey: QK.invUoms.list(),
    queryFn: listInvUoms,
  })

  const columnDefs = useMemo<ColDef<InvUom>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.uomCode,
      COL_DEFS.uomName,
      COL_DEFS.conversionqty,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="UOM Master"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search UOMs…', pdfDocumentTitle: 'UOM Master' }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add UOM
        </Button>
      )}
    >
      <UomMasterModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
