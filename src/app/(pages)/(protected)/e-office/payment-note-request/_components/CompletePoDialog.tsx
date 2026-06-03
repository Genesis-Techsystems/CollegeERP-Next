'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { completePurchaseOrder } from '@/services'
import type { InvPoItemRow, InvPurchaseOrderRow } from '@/types/e-office'
import { rowIndexGetter } from '@/lib/utils'

const ITEM_COLS: ColDef<InvPoItemRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'itemName', headerName: 'Item', minWidth: 120, flex: 1 },
  { field: 'orderQuantity', headerName: 'Qty', minWidth: 70, flex: 0 },
  { field: 'unitPrice', headerName: 'Unit Price', minWidth: 90, flex: 0 },
  { field: 'itemDiscountPercentage', headerName: 'Disc %', minWidth: 70, flex: 0 },
  { field: 'itemTotalCost', headerName: 'Total', minWidth: 90, flex: 0 },
]

const STATUS_OPTIONS = [
  { value: '332', label: 'Complete' },
  { value: '333', label: 'Reject' },
]

export function CompletePoDialog({
  open,
  onClose,
  row,
  onCompleted,
}: {
  open: boolean
  onClose: () => void
  row: InvPurchaseOrderRow | null
  onCompleted: () => void
}) {
  const [statusId, setStatusId] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!row?.poId || !statusId) throw new Error('PO and status are required')
      await completePurchaseOrder(row.poId, Number(statusId))
    },
    onSuccess: () => {
      toastSuccess('Purchase order updated.')
      onCompleted()
      onClose()
      setStatusId(null)
    },
    onError: (err) => toastError(getErrorMessage(err)),
  })

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Complete Purchase Order"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
      isSubmitting={mutation.isPending}
      submitLabel="Save"
      size="lg"
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
        <div><dt className="text-muted-foreground">PO No</dt><dd>{row?.pono}</dd></div>
        <div><dt className="text-muted-foreground">Date</dt><dd>{row?.poDate}</dd></div>
        <div><dt className="text-muted-foreground">Store</dt><dd>{row?.storeName}</dd></div>
        <div><dt className="text-muted-foreground">Status</dt><dd>{row?.poWorkFlowName}</dd></div>
      </dl>
      <DataTable
        rowData={row?.invPoItems ?? []}
        columnDefs={ITEM_COLS}
        height="auto"
        pagination={false}
      />
      <div className="mt-4">
        <Select
          label="Update Status"
          value={statusId}
          onChange={setStatusId}
          options={STATUS_OPTIONS}
          placeholder="Select status"
        />
      </div>
    </FormModal>
  )
}
