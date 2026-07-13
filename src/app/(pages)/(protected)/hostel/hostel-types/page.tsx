'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { EmptyState } from '@/common/components/feedback'
import { StatusBadge } from '@/common/components/data-display'
import { getErrorMessage } from '@/lib/errors'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHostelTypes } from '@/services'
import type { HostelType } from '@/types/hostel'
import { HostelTypeModal } from './HostelTypeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<HostelType>,
  hostelTypeCode: { field: 'hostelTypeCode', headerName: 'Code', minWidth: 120 } as ColDef<HostelType>,
  hostelTypeName: { field: 'hostelTypeName', headerName: 'Name', minWidth: 160 } as ColDef<HostelType>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 120 } as ColDef<HostelType>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<HostelType>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<HostelType>,
}

function statusRenderer(p: ICellRendererParams<HostelType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: HostelType | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<HostelType>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit hostel type"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function HostelTypesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HostelType | null>(null)

  const { data: rows, isLoading, isError, error, refetch, invalidate } = useCrudList({
    queryKey: QK.hostel.types(),
    queryFn: listHostelTypes,
  })

  const columnDefs = useMemo<ColDef<HostelType>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hostelTypeCode,
      COL_DEFS.hostelTypeName,
      COL_DEFS.orgCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Hostel Types"
      rowData={isError ? [] : rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: 'Search hostel types…',
        exportPdf: true,
        pdfDocumentTitle: 'Hostel Types',
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Hostel Type
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load hostel types"
            description={getErrorMessage(error)}
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <HostelTypeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={editing}
        onSaved={() => void invalidate()}
      />
    </ListPage>
  )
}
