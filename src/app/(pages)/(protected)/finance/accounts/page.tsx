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
import { listAccountEntities } from '@/services'
import type { AccountEntity } from '@/types/finance'
import AccountsModal from './AccountsModal'

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AccountEntity>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 110, flex: 0.9 } as ColDef<AccountEntity>,
  entityCode: { field: 'entityCode', headerName: 'Entity Code', minWidth: 120, flex: 0.9 } as ColDef<AccountEntity>,
  entityName: { field: 'entityName', headerName: 'Entity Name', minWidth: 160, flex: 1.2 } as ColDef<AccountEntity>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<AccountEntity>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<AccountEntity>,
}

function statusRenderer(p: ICellRendererParams<AccountEntity>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: AccountEntity | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<AccountEntity>) => (
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

export default function AccountsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<AccountEntity | null>(null)

  const { data, isLoading, invalidate } = useCrudList<AccountEntity>({
    queryKey: QK.finAccountEntities.list(),
    queryFn: listAccountEntities,
  })

  const columnDefs = useMemo<ColDef<AccountEntity>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.entityCode,
      COL_DEFS.entityName,
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
              toolbar={{ search: true, searchPlaceholder: 'Search accounts…', pdfDocumentTitle: 'Accounts' }}
              toolbarLeading={<h2 className="app-card-title">Accounts</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Entity
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <AccountsModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
