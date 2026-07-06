'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFinBankAccounts } from '@/services'
import type { FinBankAccount } from '@/types/finance'
import BankAccountModal from './BankAccountModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinBankAccount>,
  entityName: { field: 'entityName', headerName: 'Entity', minWidth: 110, flex: 0.9 } as ColDef<FinBankAccount>,
  bankCode: { field: 'bankCode', headerName: 'Bank Code', minWidth: 100, flex: 0.8 } as ColDef<FinBankAccount>,
  bankName: { field: 'bankName', headerName: 'Bank', minWidth: 120, flex: 1 } as ColDef<FinBankAccount>,
  branchCode: { field: 'branchCode', headerName: 'Branch', minWidth: 90, flex: 0.7 } as ColDef<FinBankAccount>,
  bankAccountNo: { field: 'bankAccountNo', headerName: 'Account No', minWidth: 120, flex: 0.9 } as ColDef<FinBankAccount>,
  ifscCode: { field: 'ifscCode', headerName: 'IFSC', minWidth: 100, flex: 0.8 } as ColDef<FinBankAccount>,
  accountDescription: { field: 'accountDescription', headerName: 'Description', minWidth: 140, flex: 1 } as ColDef<FinBankAccount>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<FinBankAccount>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<FinBankAccount>,
}

function statusRenderer(p: ICellRendererParams<FinBankAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FinBankAccount | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinBankAccount>) => (
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

export default function BankAccountsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<FinBankAccount | null>(null)

  const { data, isLoading, invalidate } = useCrudList<FinBankAccount>({
    queryKey: QK.finBankAccounts.list(),
    queryFn: listFinBankAccounts,
  })

  const columnDefs = useMemo<ColDef<FinBankAccount>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.entityName,
      COL_DEFS.bankCode,
      COL_DEFS.bankName,
      COL_DEFS.branchCode,
      COL_DEFS.bankAccountNo,
      COL_DEFS.ifscCode,
      COL_DEFS.accountDescription,
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
              title="Bank Accounts"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search bank accounts…', pdfDocumentTitle: 'Bank Accounts' }}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Bank Account
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <BankAccountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
