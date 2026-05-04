'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, SlidersHorizontal, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listGeneralSettings } from '@/services'
import type { GeneralSetting } from '@/types/general-setting'
import GeneralSettingModal from './GeneralSettingModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<GeneralSetting>,
  college: { headerName: 'College', minWidth: 110, flex: 0.8 } as ColDef<GeneralSetting>,
  settingCode: { headerName: 'Setting Code', minWidth: 130, flex: 0.95 } as ColDef<GeneralSetting>,
  settingName: { headerName: 'Setting', minWidth: 180, flex: 1.3 } as ColDef<GeneralSetting>,
  settingValue: { headerName: 'Setting value', minWidth: 160, flex: 1.2 } as ColDef<GeneralSetting>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<GeneralSetting>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<GeneralSetting>,
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function statusRenderer(p: ICellRendererParams<GeneralSetting>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function collegeRenderer(p: ICellRendererParams<GeneralSetting>) {
  const row = p.data as Record<string, unknown> | undefined
  const value =
    row?.collegeCode ??
    row?.collegeName ??
    (typeof row?.college === 'string' ? row.college : undefined) ??
    ((row?.college as Record<string, unknown> | undefined)?.collegeCode) ??
    ((row?.college as Record<string, unknown> | undefined)?.collegeName)
  return <span>{toSearchText(value)}</span>
}

function settingCodeRenderer(p: ICellRendererParams<GeneralSetting>) {
  const row = p.data as Record<string, unknown> | undefined
  return <span>{toSearchText(row?.settingCode ?? row?.code)}</span>
}

function settingNameRenderer(p: ICellRendererParams<GeneralSetting>) {
  const row = p.data as Record<string, unknown> | undefined
  return <span>{toSearchText(row?.settingName ?? row?.setting)}</span>
}

function settingValueRenderer(p: ICellRendererParams<GeneralSetting>) {
  const row = p.data as Record<string, unknown> | undefined
  return <span>{toSearchText(row?.settingValue ?? row?.value)}</span>
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
  const [searchValue, setSearchValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSetting, setEditingSetting] = useState<GeneralSetting | null>(null)

  const { data: settings, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.generalSettings.list(),
    queryFn: listGeneralSettings,
  })

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return settings
    const lower = searchValue.toLowerCase()
    return settings.filter((row) =>
      Object.values(row).some((val) => toSearchText(val).toLowerCase().includes(lower)),
    )
  }, [searchValue, settings])

  const columnDefs = useMemo<ColDef<GeneralSetting>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.college, cellRenderer: collegeRenderer },
      { ...COL_DEFS.settingCode, cellRenderer: settingCodeRenderer },
      { ...COL_DEFS.settingName, cellRenderer: settingNameRenderer },
      { ...COL_DEFS.settingValue, cellRenderer: settingValueRenderer },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingSetting, setModalOpen) },
    ],
    [setEditingSetting, setModalOpen],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">General Settings</h2>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <SearchInput
            className="w-full max-w-sm"
            placeholder="Search settings…"
            value={searchValue}
            onChange={setSearchValue}
          />
          <Button size="sm" onClick={() => { setEditingSetting(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Setting
          </Button>
        </div>
        <div className="px-3 pb-3">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!loading && filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <SlidersHorizontal className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No settings found</p>
              </div>
            ) : (
              <DataTable rowData={filteredData} columnDefs={columnDefs} loading={loading} pagination />
            )}
          </div>
        </div>
      </div>

      <GeneralSettingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSetting(null) }}
        setting={editingSetting}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
