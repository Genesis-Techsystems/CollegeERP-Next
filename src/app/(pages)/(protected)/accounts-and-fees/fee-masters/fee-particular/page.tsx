'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listFeeParticulars } from '@/services'
import type { FeeParticular } from '@/types/fee-particular'
import { FeeParticularModal } from './FeeParticularModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FeeParticular>,
  particularsCode: { field: 'particularsCode', headerName: 'Particular Code', minWidth: 130, flex: 0.9 } as ColDef<FeeParticular>,
  particularsName: { field: 'particularsName', headerName: 'Particular Name', minWidth: 180, flex: 1.2 } as ColDef<FeeParticular>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 110, flex: 0.8 } as ColDef<FeeParticular>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<FeeParticular>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<FeeParticular>,
}

function statusRenderer(p: ICellRendererParams<FeeParticular>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: FeeParticular | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<FeeParticular>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit fee particular"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function FeeParticularPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FeeParticular | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.feeParticulars.list(),
    queryFn: listFeeParticulars,
  })

  const columnDefs = useMemo<ColDef<FeeParticular>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.particularsCode,
      COL_DEFS.particularsName,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Fee Particulars
        </h1>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search fee particulars…',
            pdfDocumentTitle: 'Fee Particulars',
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
              Add Fee Particular
            </Button>
          )}
        />
      </TableCard>

      <FeeParticularModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        particular={editing}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}

