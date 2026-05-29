'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listUnivPaymentWallets } from '@/services'
import type { UnivPaymentWallet } from '@/types/univ-wallet'
import { WalletPageLoading } from '../_components/WalletPageLoading'
import { PaymentWalletModal } from './PaymentWalletModal'

const DataTable = dynamic(
  () => import('@/common/components/table').then((m) => ({ default: m.DataTable })),
  { loading: () => <WalletPageLoading /> },
)

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivPaymentWallet>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 100, flex: 0.8 } as ColDef<UnivPaymentWallet>,
  studentCode: { field: 'studentCode', headerName: 'Student code', minWidth: 110, flex: 0.9 } as ColDef<UnivPaymentWallet>,
  studentName: { field: 'studentName', headerName: 'Student name', minWidth: 140, flex: 1.2 } as ColDef<UnivPaymentWallet>,
  walletBalance: { field: 'walletBalance', headerName: 'Balance', minWidth: 100, flex: 0.8 } as ColDef<UnivPaymentWallet>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<UnivPaymentWallet>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<UnivPaymentWallet>,
}

function balanceRenderer(p: ICellRendererParams<UnivPaymentWallet>) {
  const n = Number(p.value)
  if (Number.isNaN(n)) return <span className="text-xs">{String(p.value ?? '')}</span>
  return <span className="text-xs tabular-nums">{n.toLocaleString('en-IN')}</span>
}

function statusRenderer(p: ICellRendererParams<UnivPaymentWallet>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: UnivPaymentWallet | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<UnivPaymentWallet>) => (
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

export function PaymentWalletPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<UnivPaymentWallet | null>(null)

  const { data, isLoading, invalidate } = useCrudList<UnivPaymentWallet>({
    queryKey: QK.univPaymentWallets.list(),
    queryFn: listUnivPaymentWallets,
  })

  const columnDefs = useMemo(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.studentCode,
      COL_DEFS.studentName,
      { ...COL_DEFS.walletBalance, cellRenderer: balanceRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
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
                searchPlaceholder: 'Search wallets…',
                pdfDocumentTitle: 'Payment Wallet',
              }}
              toolbarLeading={<h2 className="app-card-title">Payment Wallet</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add wallet
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <PaymentWalletModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
