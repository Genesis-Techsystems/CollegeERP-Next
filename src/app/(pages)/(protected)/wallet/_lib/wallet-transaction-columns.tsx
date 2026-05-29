import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { format } from 'date-fns'
import { rowIndexGetter } from '@/lib/utils'
import type { UnivPaymentWalletTransaction } from '@/types/univ-wallet'

export const WALLET_TXN_COL_DEFS = {
  siNo: { headerName: 'Sl.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivPaymentWalletTransaction>,
  transactionDate: { field: 'transactionDate', headerName: 'Transaction Date', minWidth: 130, flex: 1 } as ColDef<UnivPaymentWalletTransaction>,
  transactionNo: { headerName: 'Transaction No', minWidth: 130, flex: 1 } as ColDef<UnivPaymentWalletTransaction>,
  transactionTypeName: { field: 'transactionTypeName', headerName: 'Transaction Type', minWidth: 130, flex: 1 } as ColDef<UnivPaymentWalletTransaction>,
  transactionMode: { headerName: 'Transaction Mode', minWidth: 130, flex: 1 } as ColDef<UnivPaymentWalletTransaction>,
  amount: { field: 'amount', headerName: 'Transaction Amount', minWidth: 130, flex: 1 } as ColDef<UnivPaymentWalletTransaction>,
  towards: { headerName: 'Towards', minWidth: 160, flex: 1.2 } as ColDef<UnivPaymentWalletTransaction>,
}

export function txnNoValue(row?: UnivPaymentWalletTransaction | null) {
  return row?.transactionNo?.trim() || row?.referenceNumber?.trim() || '—'
}

export function txnModeValue(row?: UnivPaymentWalletTransaction | null) {
  return row?.transactionMode?.trim() || row?.transactionType?.trim() || row?.transactionTypeName?.trim() || '—'
}

export function txnTowardsValue(row?: UnivPaymentWalletTransaction | null) {
  return row?.towards?.trim() || row?.description?.trim() || '—'
}

export function txnTypeValue(row?: UnivPaymentWalletTransaction | null) {
  return row?.transactionTypeName?.trim() || row?.transactionType?.trim() || '—'
}

function txnNoRenderer(p: ICellRendererParams<UnivPaymentWalletTransaction>) {
  return <span className="text-xs">{txnNoValue(p.data)}</span>
}

function txnModeRenderer(p: ICellRendererParams<UnivPaymentWalletTransaction>) {
  return <span className="text-xs">{txnModeValue(p.data)}</span>
}

function txnTowardsRenderer(p: ICellRendererParams<UnivPaymentWalletTransaction>) {
  return <span className="text-xs">{txnTowardsValue(p.data)}</span>
}

function txnTypeRenderer(p: ICellRendererParams<UnivPaymentWalletTransaction>) {
  return <span className="text-xs">{txnTypeValue(p.data)}</span>
}

export function amountRenderer(p: ICellRendererParams<UnivPaymentWalletTransaction>) {
  const n = Number(p.value)
  if (Number.isNaN(n)) return <span className="text-xs">{String(p.value ?? '—')}</span>
  return <span className="text-xs tabular-nums">{n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}

export function dateRenderer(p: ICellRendererParams<UnivPaymentWalletTransaction>) {
  if (!p.value) return null
  const d = new Date(String(p.value))
  return (
    <span className="text-xs">
      {Number.isNaN(d.getTime()) ? String(p.value) : format(d, 'dd MMM yyyy')}
    </span>
  )
}

export function buildWalletTransactionColumnDefs(): ColDef<UnivPaymentWalletTransaction>[] {
  return [
    WALLET_TXN_COL_DEFS.siNo,
    { ...WALLET_TXN_COL_DEFS.transactionDate, cellRenderer: dateRenderer },
    { ...WALLET_TXN_COL_DEFS.transactionNo, cellRenderer: txnNoRenderer },
    { ...WALLET_TXN_COL_DEFS.transactionTypeName, cellRenderer: txnTypeRenderer },
    { ...WALLET_TXN_COL_DEFS.transactionMode, cellRenderer: txnModeRenderer },
    { ...WALLET_TXN_COL_DEFS.amount, cellRenderer: amountRenderer },
    { ...WALLET_TXN_COL_DEFS.towards, cellRenderer: txnTowardsRenderer },
  ]
}
