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
import { listCommitteePositions } from '@/services'
import type { UnivCommitteePosition } from '@/types/committees'
import CommitteePositionModal from './CommitteePositionModal'

const organizationId = () => Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivCommitteePosition>,
  organizationName: { field: 'organizationName', headerName: 'Organisation', minWidth: 130, flex: 1 } as ColDef<UnivCommitteePosition>,
  committeePossitoinName: { field: 'committeePossitoinName', headerName: 'Committee Position', minWidth: 180, flex: 1.2 } as ColDef<UnivCommitteePosition>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<UnivCommitteePosition>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<UnivCommitteePosition>,
}

function statusRenderer(p: ICellRendererParams<UnivCommitteePosition>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: UnivCommitteePosition | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<UnivCommitteePosition>) => (
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

export default function CreateCommitteePositionPage() {
  const orgId = organizationId()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<UnivCommitteePosition | null>(null)

  const { data, isLoading, invalidate } = useCrudList<UnivCommitteePosition>({
    queryKey: QK.committeePositions.list(orgId),
    queryFn: () => listCommitteePositions(orgId),
    enabled: orgId > 0,
  })

  const columnDefs = useMemo<ColDef<UnivCommitteePosition>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.organizationName,
      COL_DEFS.committeePossitoinName,
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
              toolbar={{ search: true, searchPlaceholder: 'Search positions…', pdfDocumentTitle: 'Committee Positions' }}
              toolbarLeading={<h2 className="app-card-title">Create Committee Position</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Position
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <CommitteePositionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        organizationId={orgId}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
