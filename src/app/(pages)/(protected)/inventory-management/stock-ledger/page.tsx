'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listInvStockLedgers } from '@/services'
import type { InvStockLedger } from '@/types/inventory'
import StockLedgerModal from './StockLedgerModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvStockLedger>,
  storeName: { field: 'storeName', headerName: 'Store', minWidth: 110 } as ColDef<InvStockLedger>,
  itemName: { field: 'itemName', headerName: 'Item', minWidth: 140, flex: 1 } as ColDef<InvStockLedger>,
  transactionDate: {
    field: 'transactionDate',
    headerName: 'Trans. Date',
    minWidth: 110,
  } as ColDef<InvStockLedger>,
  transactionno: {
    field: 'transactionno',
    headerName: 'Trans. Number',
    minWidth: 120,
  } as ColDef<InvStockLedger>,
  totalprice: { field: 'totalprice', headerName: 'Total Price', minWidth: 100 } as ColDef<InvStockLedger>,
  transactionType: {
    field: 'invTranstypeCatdetCode',
    headerName: 'Transaction Type',
    minWidth: 130,
  } as ColDef<InvStockLedger>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100 } as ColDef<InvStockLedger>,
  actions: { headerName: 'Actions', minWidth: 86, flex: 0, width: 86 } as ColDef<InvStockLedger>,
}

function statusRenderer(p: ICellRendererParams<InvStockLedger>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvStockLedger | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvStockLedger>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit stock ledger"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function StockLedgerPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvStockLedger | null>(null)

  const { data: rows, isLoading, invalidate } = useCrudList<InvStockLedger>({
    queryKey: QK.invStockLedgers.list(),
    queryFn: listInvStockLedgers,
  })

  const columnDefs = useMemo<ColDef<InvStockLedger>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.storeName,
      COL_DEFS.itemName,
      COL_DEFS.transactionDate,
      COL_DEFS.transactionno,
      COL_DEFS.totalprice,
      COL_DEFS.transactionType,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h2 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">Stock Ledger</h2>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search stock ledger…',
            pdfDocumentTitle: 'Stock Ledger',
          }}
          toolbarTrailing={(
            <Button
              size="sm"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => {
                setEditData(null)
                setModalOpen(true)
              }}
            >
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
              Add Stock Ledger
            </Button>
          )}
        />
      </TableCard>

      <StockLedgerModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditData(null)
        }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
