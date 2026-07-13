'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'

import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listRemunerationSettings } from '@/services'
import type { UnivRemunerationSetting } from '@/types/committees'
import RemunerationSettingModal from './RemunerationSettingModal'

const COL_DEFS = {
  organizationName: { field: 'organizationName', headerName: 'Organisation', minWidth: 130, flex: 1 } as ColDef<UnivRemunerationSetting>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 120, flex: 0.9 } as ColDef<UnivRemunerationSetting>,
  evaluatorRoleName: { field: 'evaluatorRoleName', headerName: 'Role', minWidth: 120, flex: 1 } as ColDef<UnivRemunerationSetting>,
  remunerationDesignationName: { field: 'remunerationDesignationName', headerName: 'Designation', minWidth: 140, flex: 1 } as ColDef<UnivRemunerationSetting>,
  amount: { field: 'amount', headerName: 'Amount', minWidth: 100, flex: 0.8 } as ColDef<UnivRemunerationSetting>,
  fromDate: { field: 'fromDate', headerName: 'From Date', minWidth: 110, flex: 0.8 } as ColDef<UnivRemunerationSetting>,
  toDate: { field: 'toDate', headerName: 'To Date', minWidth: 110, flex: 0.8 } as ColDef<UnivRemunerationSetting>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<UnivRemunerationSetting>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<UnivRemunerationSetting>,
}

function statusRenderer(p: ICellRendererParams<UnivRemunerationSetting>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: UnivRemunerationSetting | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<UnivRemunerationSetting>) => (
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

export default function RemunerationSettingsPage() {
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<UnivRemunerationSetting | null>(null)

  const { data, isLoading, invalidate } = useCrudList<UnivRemunerationSetting>({
    queryKey: QK.remunerationSettings.list(),
    queryFn: listRemunerationSettings,
  })

  const columnDefs = useMemo<ColDef<UnivRemunerationSetting>[]>(
    () => [
      COL_DEFS.organizationName,
      COL_DEFS.collegeCode,
      COL_DEFS.evaluatorRoleName,
      COL_DEFS.remunerationDesignationName,
      COL_DEFS.amount,
      COL_DEFS.fromDate,
      COL_DEFS.toDate,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
              title="Remuneration Settings"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search remuneration settings…', pdfDocumentTitle: 'Remuneration Settings' }}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Setting
                </Button>
              )}
            >
      <RemunerationSettingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        organizationId={organizationId}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
