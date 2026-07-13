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
import { listInvPurchaseReturns } from '@/services'
import type { InvPurchaseReturn } from '@/types/inventory'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvPurchaseReturn>,
  purchaseReturnNo: { field: 'purchaseReturnNo', headerName: 'Return No', minWidth: 110 } as ColDef<InvPurchaseReturn>,
  storeName: { field: 'storeName', headerName: 'Store', minWidth: 120 } as ColDef<InvPurchaseReturn>,
  supplierName: { field: 'supplierName', headerName: 'Supplier', minWidth: 140 } as ColDef<InvPurchaseReturn>,
  purchaseReturnDate: { field: 'purchaseReturnDate', headerName: 'Return Date', minWidth: 110 } as ColDef<InvPurchaseReturn>,
  returnAmount: { field: 'returnAmount', headerName: 'Return Amount', minWidth: 120 } as ColDef<InvPurchaseReturn>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvPurchaseReturn>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<InvPurchaseReturn>,
}

function statusRenderer(p: ICellRendererParams<InvPurchaseReturn>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<InvPurchaseReturn>) => {
    const row = p.data
    if (!row?.purchaseReturnId) return null
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Edit purchase return"
        onClick={() => {
          const params = new URLSearchParams({ id: String(row.purchaseReturnId) })
          router.push(`/inventory-management/purchase-returns/edit?${params}`)
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function PurchaseReturnsPage() {
  const router = useRouter()

  const { data: rows, isLoading } = useCrudList<InvPurchaseReturn>({
    queryKey: QK.invPurchaseReturns.list(),
    queryFn: listInvPurchaseReturns,
  })

  const columnDefs = useMemo<ColDef<InvPurchaseReturn>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.purchaseReturnNo,
      COL_DEFS.storeName,
      COL_DEFS.supplierName,
      COL_DEFS.purchaseReturnDate,
      COL_DEFS.returnAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  return (
    <ListPage
      title="Purchase Returns"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search purchase returns…',
        pdfDocumentTitle: 'Purchase Returns',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          onClick={() => router.push('/inventory-management/purchase-returns/add')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Purchase Return
        </Button>
      )}
    />
  )
}
