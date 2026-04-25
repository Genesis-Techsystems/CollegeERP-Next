'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, MapPin, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import CampusModal from './CampusModal'
import { listCampuses } from '@/services/admin/campus'
import type { Campus } from '@/types/campus'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'

// ─── Column shape (pure data, no renderers) ────────────────────────────────

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Campus>,
  campusName: { field: 'campusName', headerName: 'Campus Name', minWidth: 150, flex: 1.2 } as ColDef<Campus>,
  campusCode: { field: 'campusCode', headerName: 'Campus Code', minWidth: 110, flex: 0.9 } as ColDef<Campus>,
  orgCode: { field: 'orgCode', headerName: 'Organization', minWidth: 120, flex: 1 } as ColDef<Campus>,
  districtName: { field: 'districtName', headerName: 'District', minWidth: 110, flex: 0.9 } as ColDef<Campus>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Campus>,
  actions: { headerName: 'Actions', minWidth: 90, flex: 0, width: 90 } as ColDef<Campus>,
}

// ─── Cell renderers ────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<Campus>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (campus: Campus | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Campus>) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5 mr-1" />
      Edit
    </Button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CampusPage() {
  const [searchValue, setSearchValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null)

  // ── Fetch campuses ──────────────────────────────────────────────────────
  const { data: campuses, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.campuses.list(),
    queryFn: listCampuses,
  })

  // ── Client-side search filter ───────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return campuses
    const lower = searchValue.toLowerCase()
    return campuses.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(lower))
    )
  }, [searchValue, campuses])

  // ── Column definitions ──────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<Campus>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.campusName,
      COL_DEFS.campusCode,
      COL_DEFS.orgCode,
      COL_DEFS.districtName,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingCampus, setModalOpen) },
    ],
    [setEditingCampus, setModalOpen],
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Campus</h2>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <SearchInput
            className="max-w-sm w-full"
            placeholder="Search campuses..."
            value={searchValue}
            onChange={setSearchValue}
          />
          <Button size="sm" onClick={() => { setEditingCampus(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Campus
          </Button>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!loading && filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <MapPin className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No campuses found</p>
              </div>
            ) : (
              <DataTable
                rowData={filteredData}
                columnDefs={columnDefs}
                loading={loading}
                pagination
              />
            )}
          </div>
        </div>
      </div>

      <CampusModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCampus(null) }}
        campus={editingCampus}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
