'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'

import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFinChequeBooks } from '@/services'
import type { FinChequeBook } from '@/types/finance'
import ChequeBookModal from './ChequeBookModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinChequeBook>,
  bankName: { field: 'bankName', headerName: 'Bank', minWidth: 120, flex: 1 } as ColDef<FinChequeBook>,
  bankAccountNo: { field: 'bankAccountNo', headerName: 'Account No', minWidth: 120, flex: 0.9 } as ColDef<FinChequeBook>,
  chequebookSerialNo: { field: 'chequebookSerialNo', headerName: 'Serial No', minWidth: 100, flex: 0.8 } as ColDef<FinChequeBook>,
  noOfChequeleafs: { field: 'noOfChequeleafs', headerName: 'Leaves', minWidth: 80, flex: 0.6 } as ColDef<FinChequeBook>,
  startNumber: { field: 'startNumber', headerName: 'Start', minWidth: 80, flex: 0.6 } as ColDef<FinChequeBook>,
  endNumber: { field: 'endNumber', headerName: 'End', minWidth: 80, flex: 0.6 } as ColDef<FinChequeBook>,
  noOfChequeLeafsIssued: { field: 'noOfChequeLeafsIssued', headerName: 'Issued', minWidth: 80, flex: 0.6 } as ColDef<FinChequeBook>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<FinChequeBook>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<FinChequeBook>,
}

function statusRenderer(p: ICellRendererParams<FinChequeBook>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FinChequeBook | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinChequeBook>) => (
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

export default function ChequeBookPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<FinChequeBook | null>(null)

  const { data, isLoading, invalidate } = useCrudList<FinChequeBook>({
    queryKey: QK.finChequeBooks.list(),
    queryFn: listFinChequeBooks,
  })

  const columnDefs = useMemo<ColDef<FinChequeBook>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.bankName,
      COL_DEFS.bankAccountNo,
      COL_DEFS.chequebookSerialNo,
      COL_DEFS.noOfChequeleafs,
      COL_DEFS.startNumber,
      COL_DEFS.endNumber,
      COL_DEFS.noOfChequeLeafsIssued,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
              title="Cheque Book"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search cheque books…', pdfDocumentTitle: 'Cheque Book' }}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Cheque Book
                </Button>
              )}
            >
      <ChequeBookModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
