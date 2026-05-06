'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Building2, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { MINIO_URL } from '@/config/constants/api'
import noImgLogo from '@/assets/images/no-img-logo.png'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listColleges } from '@/services'
import type { College } from '@/types/college'
import CollegeModal from './CollegeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<College>,
  logo: { headerName: 'Logo', field: 'logo', minWidth: 64, width: 64, flex: 0 } as ColDef<College>,
  orgCode: { field: 'orgCode', headerName: 'Org', minWidth: 95, flex: 0.75 } as ColDef<College>,
  universityCode: { field: 'universityCode', headerName: 'Univ', minWidth: 95, flex: 0.75 } as ColDef<College>,
  collegeCode: { field: 'collegeCode', headerName: 'Code', minWidth: 95, flex: 0.75 } as ColDef<College>,
  collegeName: { field: 'collegeName', headerName: 'College', minWidth: 160, flex: 1.35 } as ColDef<College>,
  address: { field: 'address', headerName: 'Address', minWidth: 180, flex: 1.15 } as ColDef<College>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<College>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<College>,
}

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function logoRenderer(p: ICellRendererParams<College>) {
  return (
    <img
      src={p.data?.logo ? `${MINIO_URL}${p.data.logo}` : noImgLogo.src}
      alt="logo"
      className="h-8 w-8 rounded object-contain"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = noImgLogo.src }}
    />
  )
}

function statusRenderer(p: ICellRendererParams<College>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: College | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<College>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit college"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CollegesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCollege, setEditingCollege] = useState<College | null>(null)

  const { data: colleges, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.colleges.list(),
    queryFn: listColleges,
  })

  const columnDefs = useMemo<ColDef<College>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.logo, cellRenderer: logoRenderer },
      COL_DEFS.orgCode,
      COL_DEFS.universityCode,
      COL_DEFS.collegeCode,
      COL_DEFS.collegeName,
      COL_DEFS.address,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingCollege, setModalOpen) },
    ],
    [setEditingCollege, setModalOpen],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Colleges</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!loading && colleges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Building2 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No colleges found</p>
              </div>
            ) : (
              <DataTable
                rowData={colleges}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search colleges…', pdfDocumentTitle: 'Colleges' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingCollege(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add College
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <CollegeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCollege(null) }}
        college={editingCollege}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
