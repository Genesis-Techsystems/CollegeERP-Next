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
import { listFinAccountTypes } from '@/services'
import type { FinAccountType } from '@/types/finance'
import AccountTypesModal from './AccountTypesModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FinAccountType>,
  accounttypeCode: { field: 'accounttypeCode', headerName: 'Code', minWidth: 100, flex: 0.8 } as ColDef<FinAccountType>,
  accounttypeName: { field: 'accounttypeName', headerName: 'Name', minWidth: 140, flex: 1 } as ColDef<FinAccountType>,
  majorAccountTypeGDCode: { field: 'majorAccountTypeGDCode', headerName: 'Major Type', minWidth: 110, flex: 0.9 } as ColDef<FinAccountType>,
  parentAccounttypeCode: { field: 'parentAccounttypeCode', headerName: 'Parent', minWidth: 100, flex: 0.8 } as ColDef<FinAccountType>,
  entityCode: { field: 'entityCode', headerName: 'Entity', minWidth: 90, flex: 0.7 } as ColDef<FinAccountType>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<FinAccountType>,
  isGroupAccount: { field: 'isGroupAccount', headerName: 'Group', minWidth: 80, flex: 0.6 } as ColDef<FinAccountType>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<FinAccountType>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<FinAccountType>,
}

function groupRenderer(p: ICellRendererParams<FinAccountType>) {
  return <StatusBadge status={p.data?.isGroupAccount ?? false} label={p.data?.isGroupAccount ? 'Yes' : 'No'} />
}

function statusRenderer(p: ICellRendererParams<FinAccountType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FinAccountType | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FinAccountType>) => (
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

export default function AccountTypesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<FinAccountType | null>(null)

  const { data, isLoading, invalidate } = useCrudList<FinAccountType>({
    queryKey: QK.finAccountTypes.list(),
    queryFn: listFinAccountTypes,
  })

  const columnDefs = useMemo<ColDef<FinAccountType>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.accounttypeCode,
      COL_DEFS.accounttypeName,
      COL_DEFS.majorAccountTypeGDCode,
      COL_DEFS.parentAccounttypeCode,
      COL_DEFS.entityCode,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isGroupAccount, cellRenderer: groupRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
              title="Account Types"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search account types…', pdfDocumentTitle: 'Account Types' }}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Account Type
                </Button>
              )}
            >
      <AccountTypesModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
