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
import { listScholarshipTypes } from '@/services'
import type { ScholarshipType } from '@/types/scholarship'
import { ScholarshipTypeModal } from './ScholarshipTypeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<ScholarshipType>,
  orgCode: { field: 'orgCode', headerName: 'Org', minWidth: 90, flex: 0.7 } as ColDef<ScholarshipType>,
  universityCode: { field: 'universityCode', headerName: 'University', minWidth: 100, flex: 0.8 } as ColDef<ScholarshipType>,
  scholarshipTypeCode: { field: 'scholarshipTypeCode', headerName: 'Type Code', minWidth: 120, flex: 0.9 } as ColDef<ScholarshipType>,
  scholarshipTypeDesc: { field: 'scholarshipTypeDesc', headerName: 'Description', minWidth: 180, flex: 1.2 } as ColDef<ScholarshipType>,
  sortOrder: { field: 'sortOrder', headerName: 'Sort', minWidth: 70, flex: 0 } as ColDef<ScholarshipType>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<ScholarshipType>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<ScholarshipType>,
}

function statusRenderer(p: ICellRendererParams<ScholarshipType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: ScholarshipType | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<ScholarshipType>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit scholarship type"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function ScholarshipTypePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScholarshipType | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.scholarshipTypes.list(),
    queryFn: listScholarshipTypes,
  })

  const columnDefs = useMemo<ColDef<ScholarshipType>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgCode,
      COL_DEFS.universityCode,
      COL_DEFS.scholarshipTypeCode,
      COL_DEFS.scholarshipTypeDesc,
      COL_DEFS.sortOrder,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Scholarship Type
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
            searchPlaceholder: 'Search scholarship types…',
            pdfDocumentTitle: 'Scholarship Types',
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
              Add Scholarship Type
            </Button>
          )}
        />
      </TableCard>

      <ScholarshipTypeModal
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
