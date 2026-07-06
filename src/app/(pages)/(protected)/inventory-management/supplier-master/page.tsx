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
import { listInvSuppliersMaster } from '@/services'
import type { InvSupplier } from '@/types/inventory'
import SupplierMasterModal from './SupplierMasterModal'

const COL_DEFS = {
  siNo: { headerName: 'Sl.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<InvSupplier>,
  supplierName: { field: 'supplierName', headerName: 'Supplier Name', minWidth: 150, flex: 1.1 } as ColDef<InvSupplier>,
  contact1Name: { field: 'contact1Name', headerName: 'Contact Name', minWidth: 130, flex: 1 } as ColDef<InvSupplier>,
  contact1Phone: { field: 'contact1Phone', headerName: 'Contact Phone', minWidth: 120, flex: 0.9 } as ColDef<InvSupplier>,
  contact1Email: { field: 'contact1Email', headerName: 'Contact Email', minWidth: 150, flex: 1 } as ColDef<InvSupplier>,
  cstno: { field: 'cstno', headerName: 'CST No', minWidth: 100, flex: 0.8 } as ColDef<InvSupplier>,
  gstno: { field: 'gstno', headerName: 'GST No', minWidth: 120, flex: 0.9 } as ColDef<InvSupplier>,
  startdate: { field: 'startdate', headerName: 'Start Date', minWidth: 110, flex: 0.9 } as ColDef<InvSupplier>,
  enddate: { field: 'enddate', headerName: 'End Date', minWidth: 110, flex: 0.9 } as ColDef<InvSupplier>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 110, flex: 0.9 } as ColDef<InvSupplier>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<InvSupplier>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<InvSupplier>,
}

function statusRenderer(p: ICellRendererParams<InvSupplier>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: InvSupplier | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<InvSupplier>) => (
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

export default function SupplierMasterPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<InvSupplier | null>(null)

  const { data, isLoading, invalidate } = useCrudList<InvSupplier>({
    queryKey: QK.invSuppliersMaster.list(),
    queryFn: listInvSuppliersMaster,
  })

  const columnDefs = useMemo<ColDef<InvSupplier>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.supplierName,
      COL_DEFS.contact1Name,
      COL_DEFS.contact1Phone,
      COL_DEFS.contact1Email,
      COL_DEFS.cstno,
      COL_DEFS.gstno,
      COL_DEFS.startdate,
      COL_DEFS.enddate,
      COL_DEFS.orgCode,
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
              title="Supplier Master"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search', pdfDocumentTitle: 'Supplier Master' }}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Supplier Master
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <SupplierMasterModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
