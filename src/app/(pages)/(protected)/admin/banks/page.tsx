'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listBanks } from '@/services'
import type { Bank } from '@/types/bank'
import BankModal from './BankModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Bank>,
  college: { colId: 'college', headerName: 'College', minWidth: 90, flex: 0.8 } as ColDef<Bank>,
  bankName: { colId: 'bankName', field: 'bankName', headerName: 'Bank Name', minWidth: 120, flex: 1 } as ColDef<Bank>,
  branchCode: { colId: 'branchCode', field: 'branchCode', headerName: 'Branch', minWidth: 90, flex: 0.8 } as ColDef<Bank>,
  bankCode: { colId: 'bankCode', field: 'bankCode', headerName: 'Code', minWidth: 80, flex: 0.7 } as ColDef<Bank>,
  accountNo: { colId: 'accountNo', field: 'accountNo', headerName: 'Account', minWidth: 120, flex: 1 } as ColDef<Bank>,
  ifscCode: { colId: 'ifscCode', field: 'ifscCode', headerName: 'IFSC', minWidth: 95, flex: 0.8 } as ColDef<Bank>,
  address: { colId: 'address', field: 'address', headerName: 'Address', minWidth: 120, flex: 1 } as ColDef<Bank>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Bank>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Bank>,
}

function statusRenderer(p: ICellRendererParams<Bank>) { return <StatusBadge status={p.data?.isActive ?? false} /> }
function actionRenderer(setRow: (r: Bank | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<Bank>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function BanksPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<Bank | null>(null)
  const { data, isLoading, invalidate } = useCrudList({ queryKey: QK.banks.list(), queryFn: listBanks })

  const columnDefs = useMemo<ColDef<Bank>[]>(() => [
    COLS.siNo,
    { ...COLS.college, valueGetter: (p) => p.data?.collegeCode ?? '-' },
    COLS.bankName,
    COLS.branchCode,
    COLS.bankCode,
    COLS.accountNo,
    COLS.ifscCode,
    {
      ...COLS.address,
      tooltipField: 'address',
      cellStyle: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <ListPage
      title="Banks"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search banks…', pdfDocumentTitle: 'Banks' }}
      toolbarTrailing={
        <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Bank
        </Button>
      }
    >
      <BankModal
        key={getCrudModalKey(row, open, 'bankId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
