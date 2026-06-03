'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeIcon, PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listPurchaseOrders } from '@/services'
import type { InvPurchaseOrderRow } from '@/types/e-office'
import { ViewPaymentNoteDialog } from './_components/ViewPaymentNoteDialog'
import { CompletePoDialog } from './_components/CompletePoDialog'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvPurchaseOrderRow>,
  pono: { field: 'pono', headerName: 'P.O. Number', minWidth: 110 } as ColDef<InvPurchaseOrderRow>,
  poDate: { field: 'poDate', headerName: 'P.O. Date', minWidth: 110 } as ColDef<InvPurchaseOrderRow>,
  poType: { field: 'potypeCatdetDisplayName', headerName: 'PO Type', minWidth: 100 } as ColDef<InvPurchaseOrderRow>,
  poNetCost: { field: 'poNetCost', headerName: 'PO Net Cost', minWidth: 110 } as ColDef<InvPurchaseOrderRow>,
  status: { field: 'poWorkFlowName', headerName: 'Status', minWidth: 120 } as ColDef<InvPurchaseOrderRow>,
  actions: { headerName: 'Actions', minWidth: 160, flex: 0, width: 160 } as ColDef<InvPurchaseOrderRow>,
}

export default function PaymentNoteRequestPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [viewRow, setViewRow] = useState<InvPurchaseOrderRow | null>(null)
  const [completeRow, setCompleteRow] = useState<InvPurchaseOrderRow | null>(null)

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: QK.eOffice.purchaseOrders(),
    queryFn: listPurchaseOrders,
  })

  const pending = useMemo(
    () => allOrders.filter((x) => x.poStatusCatdetId == null),
    [allOrders],
  )
  const completed = useMemo(
    () => allOrders.filter((x) => x.poStatusCatdetId != null),
    [allOrders],
  )

  const makeActions = (includeComplete: boolean) =>
    (p: ICellRendererParams<InvPurchaseOrderRow>) => {
      const row = p.data
      if (!row) return null
      return (
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="View PO"
            onClick={() => setViewRow(row)}
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit PO"
            onClick={() => {
              const params = new URLSearchParams({ poId: String(row.poId ?? '') })
              router.push(`/e-office/payment-note-request/edit-payment-note-request?${params}`)
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
          {includeComplete && (
            <Button
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => setCompleteRow(row)}
            >
              Complete
            </Button>
          )}
        </div>
      )
    }

  const columnDefs = useMemo<ColDef<InvPurchaseOrderRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.poType,
      COL_DEFS.poNetCost,
      COL_DEFS.status,
      { ...COL_DEFS.actions, cellRenderer: makeActions(true) },
    ],
    [router],
  )

  const completedColumnDefs = useMemo<ColDef<InvPurchaseOrderRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.poType,
      COL_DEFS.poNetCost,
      COL_DEFS.status,
      { ...COL_DEFS.actions, cellRenderer: makeActions(false) },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">Purchase Order</h2>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={pending}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search purchase orders…',
            pdfDocumentTitle: 'Payment Note Requests',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => router.push('/e-office/payment-note-request/add-payment-note-request')}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              New Purchase Order
            </Button>
          )}
        />
      </TableCard>

      {completed.length > 0 && (
        <>
          <div className="app-card overflow-hidden px-4 py-3">
            <h2 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">Completed Purchase Orders</h2>
          </div>
          <TableCard withHeaderBorder={false}>
            <DataTable
              rowData={completed}
              columnDefs={completedColumnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search completed…' }}
            />
          </TableCard>
        </>
      )}

      <ViewPaymentNoteDialog
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        row={viewRow}
      />

      <CompletePoDialog
        open={Boolean(completeRow)}
        onClose={() => setCompleteRow(null)}
        row={completeRow}
        onCompleted={() => void qc.invalidateQueries({ queryKey: QK.eOffice.purchaseOrders() })}
      />
    </PageContainer>
  )
}
