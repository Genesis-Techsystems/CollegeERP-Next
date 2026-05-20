'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Blocks, PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listBlocks } from '@/services'
import type { Block } from '@/types/block'
import BlockModal from './BlockModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Block>,
  blockName: { field: 'blockName', headerName: 'Block', minWidth: 160, flex: 1.2 } as ColDef<Block>,
  blockCode: { field: 'blockCode', headerName: 'Code', minWidth: 95, flex: 0.75 } as ColDef<Block>,
  buildingName: { field: 'buildingName', headerName: 'Building', minWidth: 150, flex: 1 } as ColDef<Block>,
  noOfFloors: { field: 'noOfFloors', headerName: 'Floors', minWidth: 90, flex: 0.7 } as ColDef<Block>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Block>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<Block>,
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function statusRenderer(p: ICellRendererParams<Block>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: Block | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Block>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit block"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function BlocksPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)

  const { data: blocks, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.blocks.list(),
    queryFn: listBlocks,
  })

  const columnDefs = useMemo<ColDef<Block>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.blockName,
      COL_DEFS.blockCode,
      COL_DEFS.buildingName,
      COL_DEFS.noOfFloors,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingBlock, setModalOpen) },
    ],
    [setEditingBlock, setModalOpen],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Blocks</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Blocks className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No blocks found</p>
              </div>
            ) : (
              <DataTable
                rowData={blocks}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search blocks…', pdfDocumentTitle: 'Blocks' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingBlock(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Block
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <BlockModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBlock(null) }}
        block={editingBlock}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
