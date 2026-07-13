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
import { listInvBrands } from '@/services'
import type { InvBrand } from '@/types/inventory'
import BrandMasterModal from './BrandMasterModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvBrand>,
  orgCode: { field: 'orgCode', headerName: 'Organisation', minWidth: 120, flex: 1 } as ColDef<InvBrand>,
  brandCode: { field: 'brandCode', headerName: 'Brand Code', minWidth: 110, flex: 0.9 } as ColDef<InvBrand>,
  brandName: { field: 'brandName', headerName: 'Brand Name', minWidth: 160, flex: 1.2 } as ColDef<InvBrand>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<InvBrand>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<InvBrand>,
}

function statusRenderer(p: ICellRendererParams<InvBrand>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvBrand | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvBrand>) => (
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

export default function BrandMasterPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvBrand | null>(null)

  const { data, isLoading, invalidate } = useCrudList<InvBrand>({
    queryKey: QK.invBrands.list(),
    queryFn: listInvBrands,
  })

  const columnDefs = useMemo<ColDef<InvBrand>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.brandCode,
      COL_DEFS.brandName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Brand Master"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search brands…', pdfDocumentTitle: 'Brand Master' }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Brand
        </Button>
      )}
    >
      <BrandMasterModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
