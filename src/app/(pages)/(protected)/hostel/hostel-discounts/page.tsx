'use client'

import { useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { getErrorMessage } from '@/lib/errors'
import { ListPage } from '@/components/layout'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHostelDiscounts } from '@/services'
import type { HostelDiscount } from '@/types/hostel'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<HostelDiscount>,
  hstlDiscountName: { field: 'hstlDiscountName', headerName: 'Discount', minWidth: 140 } as ColDef<HostelDiscount>,
  discountType: { field: 'discountType', headerName: 'Type', minWidth: 90 } as ColDef<HostelDiscount>,
  discountValue: { field: 'discountValue', headerName: 'Value', minWidth: 90 } as ColDef<HostelDiscount>,
  hostelCode: { field: 'hostelCode', headerName: 'Hostel', minWidth: 100 } as ColDef<HostelDiscount>,
  validFrom: { field: 'validFrom', headerName: 'From', minWidth: 100 } as ColDef<HostelDiscount>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<HostelDiscount>,
}

function statusRenderer(p: ICellRendererParams<HostelDiscount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

export default function HostelDiscountsPage() {
  const { data: rows, isLoading, isError, error, refetch } = useCrudList({
    queryKey: QK.hostel.discounts(),
    queryFn: listHostelDiscounts,
  })

  const columnDefs = useMemo<ColDef<HostelDiscount>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hstlDiscountName,
      COL_DEFS.discountType,
      COL_DEFS.discountValue,
      COL_DEFS.hostelCode,
      COL_DEFS.validFrom,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <ListPage
      title="Hostel Discounts"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{ search: true, pdfDocumentTitle: 'Hostel Discounts' }}
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load discounts"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    />
  )
}
