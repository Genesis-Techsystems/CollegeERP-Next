'use client'

import { EyeIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import type { ColDef } from 'ag-grid-community'
import { MINIO_URL } from '@/config/constants/api'
import type { InvPoItemRow, InvPurchaseOrderRow } from '@/types/e-office'
import { rowIndexGetter } from '@/lib/utils'

const ITEM_COLS: ColDef<InvPoItemRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'itemName', headerName: 'Item', minWidth: 140, flex: 1 },
  { field: 'unitPrice', headerName: 'Unit Price', minWidth: 90 },
  { field: 'orderQuantity', headerName: 'Qty', minWidth: 70, flex: 0 },
  { field: 'itemDiscountPercentage', headerName: 'Disc %', minWidth: 70, flex: 0 },
  { field: 'itemTotalCost', headerName: 'Total', minWidth: 90, flex: 0 },
]

function openDoc(path?: string) {
  if (!path) return
  const url = /^https?:\/\//i.test(path) ? path : `${MINIO_URL}${path}`
  window.open(url, '_blank', 'width=700,height=600')
}

export function ViewPaymentNoteDialog({
  open,
  onClose,
  row,
}: {
  open: boolean
  onClose: () => void
  row: InvPurchaseOrderRow | null
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Note — {row?.pono ?? ''}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <dl className="space-y-2">
            <div><dt className="text-muted-foreground inline">PO Date: </dt><dd className="inline">{row?.poDate ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground inline">PO Type: </dt><dd className="inline">{row?.potypeCatdetDisplayName ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground inline">Status: </dt><dd className="inline">{row?.poWorkFlowName ?? '—'}</dd></div>
          </dl>
          <dl className="space-y-2">
            <div><dt className="text-muted-foreground inline">Supplier: </dt><dd className="inline">{row?.supplierName ?? '—'}</dd></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Payment Note</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDoc(row?.wfDocumentPath)}>
                <EyeIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Comparative Stmt</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDoc(row?.poRefFilePath1)}>
                <EyeIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">PO Reference</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDoc(row?.poRefFilePath2)}>
                <EyeIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </dl>
        </div>
        <DataTable
          rowData={row?.invPoItems ?? []}
          columnDefs={ITEM_COLS}
          pagination={false}
        />
      </DialogContent>
    </Dialog>
  )
}
