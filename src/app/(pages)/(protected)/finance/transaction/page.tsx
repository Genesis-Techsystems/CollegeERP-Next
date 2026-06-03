'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { ExternalLinkIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { DATE_FORMATS } from '@/config/constants/app'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFinTransactions } from '@/services'
import type { FinTransaction } from '@/types/finance'
import TransactionModal from './TransactionModal'

const COL_DEFS = {
  siNo: { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 } as ColDef<FinTransaction>,
  accountentityName: { field: 'accountentityName', headerName: 'Entity Name', minWidth: 110, flex: 1 } as ColDef<FinTransaction>,
  vouchertypeCatdetCode: { field: 'vouchertypeCatdetCode', headerName: 'Transaction Type', minWidth: 120, flex: 0.9 } as ColDef<FinTransaction>,
  transactionNumber: { field: 'transactionNumber', headerName: 'Transaction Number', minWidth: 120, flex: 0.9 } as ColDef<FinTransaction>,
  title: { field: 'title', headerName: 'Transaction', minWidth: 130, flex: 1.1 } as ColDef<FinTransaction>,
  finCategoryCode: { field: 'finCategoryCode', headerName: 'Category', minWidth: 90, flex: 0.8 } as ColDef<FinTransaction>,
  finSubCategoryCode: { field: 'finSubCategoryCode', headerName: 'Sub Category', minWidth: 100, flex: 0.8 } as ColDef<FinTransaction>,
  transactionDate: { field: 'transactionDate', headerName: 'Date', minWidth: 95, flex: 0.7 } as ColDef<FinTransaction>,
  amount: { field: 'amount', headerName: 'Amount', minWidth: 90, flex: 0.7 } as ColDef<FinTransaction>,
  voucherUrl: { field: 'voucherUrl', headerName: 'Voucher', minWidth: 80, flex: 0, width: 80 } as ColDef<FinTransaction>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<FinTransaction>,
}

function formatTxnDate(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? String(value) : format(d, DATE_FORMATS.DISPLAY)
}

function dateRenderer(p: ICellRendererParams<FinTransaction>) {
  return <span className="text-xs">{formatTxnDate(p.value)}</span>
}

function amountRenderer(p: ICellRendererParams<FinTransaction>) {
  const n = Number(p.value)
  if (Number.isNaN(n)) return <span className="text-xs">{String(p.value ?? '')}</span>
  return <span className="text-xs tabular-nums">{n.toLocaleString('en-IN')}</span>
}

function voucherRenderer(p: ICellRendererParams<FinTransaction>) {
  const url = p.data?.voucherUrl
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center text-xs text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLinkIcon className="h-3.5 w-3.5" />
    </a>
  )
}

function makeActionsRenderer(
  setEditing: (row: FinTransaction | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinTransaction>) => (
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

export default function TransactionPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<FinTransaction | null>(null)

  const { data, isLoading, invalidate } = useCrudList<FinTransaction>({
    queryKey: QK.finTransactions.list(),
    queryFn: listFinTransactions,
  })

  const columnDefs = useMemo<ColDef<FinTransaction>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.accountentityName,
      COL_DEFS.vouchertypeCatdetCode,
      COL_DEFS.transactionNumber,
      COL_DEFS.title,
      COL_DEFS.finCategoryCode,
      COL_DEFS.finSubCategoryCode,
      { ...COL_DEFS.transactionDate, cellRenderer: dateRenderer },
      { ...COL_DEFS.amount, cellRenderer: amountRenderer },
      { ...COL_DEFS.voucherUrl, cellRenderer: voucherRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search transactions…',
                pdfDocumentTitle: 'Transactions',
              }}
              toolbarLeading={<h2 className="app-card-title">Transactions</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Transaction
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
