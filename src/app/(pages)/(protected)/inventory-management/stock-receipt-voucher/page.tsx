'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvStockReceiptVouchers } from '@/services'
import type { InvStockReceiptVoucher } from '@/types/inventory'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvStockReceiptVoucher>,
  srvNo: { field: 'srvNo', headerName: 'SRV No', minWidth: 110 } as ColDef<InvStockReceiptVoucher>,
  storeName: { field: 'storeName', headerName: 'Store', minWidth: 120 } as ColDef<InvStockReceiptVoucher>,
  supplierName: { field: 'supplierName', headerName: 'Supplier', minWidth: 140 } as ColDef<InvStockReceiptVoucher>,
  srvDate: { field: 'srvDate', headerName: 'SRV Date', minWidth: 110 } as ColDef<InvStockReceiptVoucher>,
  deliverychallanno: { field: 'deliverychallanno', headerName: 'Delivery Challan No', minWidth: 140 } as ColDef<InvStockReceiptVoucher>,
  srvActualAmount: { field: 'srvActualAmount', headerName: 'SRV Amount', minWidth: 110 } as ColDef<InvStockReceiptVoucher>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvStockReceiptVoucher>,
}

function statusRenderer(p: ICellRendererParams<InvStockReceiptVoucher>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function StockReceiptVoucherPage() {
  const router = useRouter()

  const { data: rows, isLoading } = useCrudList<InvStockReceiptVoucher>({
    queryKey: QK.invStockReceiptVouchers.list(),
    queryFn: listInvStockReceiptVouchers,
  })

  const columnDefs = useMemo<ColDef<InvStockReceiptVoucher>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.srvNo,
      COL_DEFS.storeName,
      COL_DEFS.supplierName,
      COL_DEFS.srvDate,
      COL_DEFS.deliverychallanno,
      COL_DEFS.srvActualAmount,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <ListPage
      title="Stock Receipt Voucher"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search stock receipt vouchers…',
        pdfDocumentTitle: 'Stock Receipt Voucher',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          onClick={() => router.push('/inventory-management/stock-receipt-voucher/add')}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Stock Receipt Voucher
        </Button>
      )}
    />
  )
}
