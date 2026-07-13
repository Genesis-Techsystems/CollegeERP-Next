'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvPurchaseOrders } from '@/services'
import type { InvPurchaseOrderListRow } from '@/types/inventory'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvPurchaseOrderListRow>,
  pono: { field: 'pono', headerName: 'P.O. Number', minWidth: 110 } as ColDef<InvPurchaseOrderListRow>,
  poDate: { field: 'poDate', headerName: 'P.O. Date', minWidth: 110 } as ColDef<InvPurchaseOrderListRow>,
  poType: { field: 'potypeCatdetDisplayName', headerName: 'PO Type', minWidth: 120 } as ColDef<InvPurchaseOrderListRow>,
  poActualAmount: { field: 'poActualAmount', headerName: 'PO Amount', minWidth: 110 } as ColDef<InvPurchaseOrderListRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvPurchaseOrderListRow>,
  actions: { headerName: 'Actions', minWidth: 86, flex: 0, width: 86 } as ColDef<InvPurchaseOrderListRow>,
}

function statusRenderer(p: ICellRendererParams<InvPurchaseOrderListRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvPurchaseOrderListRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit purchase order"
        onClick={() => {
          const params = new URLSearchParams({ id: String(row.poId ?? '') })
          router.push(`/inventory-management/purchase-order/edit?${params}`)
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function PurchaseOrdersPage() {
  const router = useRouter()

  const { data: rows, isLoading } = useCrudList<InvPurchaseOrderListRow>({
    queryKey: QK.invPurchaseOrders.list(),
    queryFn: listInvPurchaseOrders,
  })

  const columnDefs = useMemo<ColDef<InvPurchaseOrderListRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.poType,
      COL_DEFS.poActualAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  return (
    <ListPage
      title="Purchase Orders"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search purchase orders…',
        pdfDocumentTitle: 'Purchase Orders',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          onClick={() => router.push('/inventory-management/purchase-order/add')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Purchase Order
        </Button>
      )}
    />
  )
}
