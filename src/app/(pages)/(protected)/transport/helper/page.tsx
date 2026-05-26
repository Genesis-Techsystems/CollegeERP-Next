'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { getErrorMessage } from '@/lib/errors'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHelpers } from '@/services'
import type { Helper } from '@/types/transport'
import { TransportPageTitle } from '../_components/TransportPageTitle'
import { HelperModal } from './HelperModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Helper>,
  helperName: { field: 'helperName', headerName: 'Helper Name', minWidth: 150 } as ColDef<Helper>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 120 } as ColDef<Helper>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<Helper>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Helper>,
}

function statusRenderer(p: ICellRendererParams<Helper>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: Helper | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Helper>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit helper"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function HelperPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Helper | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.transport.helpers(),
    queryFn: listHelpers,
  })

  const columnDefs = useMemo<ColDef<Helper>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.helperName,
      COL_DEFS.mobileNumber,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <TransportPageTitle title="Helper" />

      <TableCard withHeaderBorder={false}>
        {isError ? (
          <EmptyState
            title="Could not load helpers"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : (
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search helpers…',
              pdfDocumentTitle: 'Helpers',
            }}
            toolbarTrailing={(
              <Button
                size="sm"
                className="h-[30px] px-3 text-[12px]"
                onClick={() => {
                  setEditing(null)
                  setModalOpen(true)
                }}
              >
                <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                Add Helper
              </Button>
            )}
          />
        )}
      </TableCard>

      <HelperModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
