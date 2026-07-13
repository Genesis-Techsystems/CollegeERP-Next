'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listCasteQuotas } from '@/services'
import type { CasteQuotaRow } from '@/types/admission'
import { CasteQuotaModal } from './CasteQuotaModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CasteQuotaRow>,
  orgName: { field: 'orgName', headerName: 'Org', minWidth: 90 } as ColDef<CasteQuotaRow>,
  caste: { field: 'caste', headerName: 'Caste', minWidth: 120, valueGetter: (p) => p.data?.caste ?? p.data?.casteQuota } as ColDef<CasteQuotaRow>,
  casteQuotaDescription: { field: 'casteQuotaDescription', headerName: 'Description', minWidth: 180, flex: 1.2 } as ColDef<CasteQuotaRow>,
  sortOrder: { field: 'sortOrder', headerName: 'Sort', minWidth: 70, flex: 0 } as ColDef<CasteQuotaRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<CasteQuotaRow>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CasteQuotaRow>,
}

function statusRenderer(p: ICellRendererParams<CasteQuotaRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: CasteQuotaRow | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<CasteQuotaRow>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit caste quota"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CasteQuotaPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CasteQuotaRow | null>(null)

  const { data: rows, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.admission.casteQuotas(),
    queryFn: listCasteQuotas,
  })

  const columnDefs = useMemo<ColDef<CasteQuotaRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.orgName,
      COL_DEFS.caste,
      COL_DEFS.casteQuotaDescription,
      COL_DEFS.sortOrder,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Caste Quota"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search caste quotas…',
        pdfDocumentTitle: 'Caste Quota',
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
          Add Caste Quota
        </Button>
      )}
    >
      <CasteQuotaModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
