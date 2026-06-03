'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'
import type { InvInternalIndentItemRow, InvInternalIndentRow } from '@/types/e-office'
import { rowIndexGetter } from '@/lib/utils'

const ITEM_COLS: ColDef<InvInternalIndentItemRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'itemCode', headerName: 'Item Code', minWidth: 100 },
  { field: 'itemName', headerName: 'Item', minWidth: 140, flex: 1 },
  { field: 'indentQuantity', headerName: 'Qty', minWidth: 80, flex: 0 },
]

export function ViewItemRequestDialog({
  open,
  onClose,
  row,
}: {
  open: boolean
  onClose: () => void
  row: InvInternalIndentRow | null
}) {
  const items = row?.invInternalIndentitems ?? []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Indent {row?.internalIndNo ?? ''}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <dt className="text-muted-foreground">Store</dt>
            <dd>{row?.storeCode ?? row?.storeName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{row?.indentDate ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Purpose</dt>
            <dd>{row?.purpose ?? '—'}</dd>
          </div>
        </dl>
        <DataTable
          rowData={items}
          columnDefs={ITEM_COLS}
          height="auto"
          pagination={false}
        />
      </DialogContent>
    </Dialog>
  )
}
