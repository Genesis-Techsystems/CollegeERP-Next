'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon, Settings2 } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listGeneralSettings } from '@/services'
import type { GeneralSetting } from '@/types/general-setting'
import GeneralSettingModal from './GeneralSettingModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<GeneralSetting>,
  collegeCode: { headerName: 'College', minWidth: 120, flex: 1 } as ColDef<GeneralSetting>,
  settingName: { field: 'settingName', headerName: 'Setting Name', minWidth: 180, flex: 1.2 } as ColDef<GeneralSetting>,
  settingCode: { field: 'settingCode', headerName: 'Setting Code', minWidth: 150, flex: 1 } as ColDef<GeneralSetting>,
  settingValue: { field: 'settingValue', headerName: 'Setting Value', minWidth: 150, flex: 1 } as ColDef<GeneralSetting>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 110 } as ColDef<GeneralSetting>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<GeneralSetting>,
}

function statusRenderer(p: ICellRendererParams<GeneralSetting>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: GeneralSetting | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<GeneralSetting>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit general setting"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function GeneralSettingsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<GeneralSetting | null>(null)

  const { data: settings, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.generalSettings.list(),
    queryFn: listGeneralSettings,
  })

  const columnDefs = useMemo<ColDef<GeneralSetting>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.collegeCode, valueGetter: (p) => p.data?.collegeCode ?? '-' },
      COL_DEFS.settingName,
      COL_DEFS.settingCode,
      COL_DEFS.settingValue,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingSetting, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="General Settings"
      rowData={settings}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search general settings…', pdfDocumentTitle: 'General Settings' }}
      toolbarTrailing={
        <Button size="sm" onClick={() => { setEditingSetting(null); setModalOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add General Setting
        </Button>
      }
      emptyState={
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Settings2 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No general settings found</p>
          <Button size="sm" className="mt-4" onClick={() => { setEditingSetting(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add General Setting
          </Button>
        </div>
      }
    >
      <GeneralSettingModal
        key={getCrudModalKey(editingSetting, modalOpen, 'generalSettingId')}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSetting(null) }}
        setting={editingSetting}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
