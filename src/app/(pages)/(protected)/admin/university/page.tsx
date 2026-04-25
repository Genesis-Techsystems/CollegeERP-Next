'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Building2, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { MINIO_URL } from '@/config/constants/api'
import noImgLogo from '@/assets/images/no-img-logo.png'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listUniversities } from '@/services'
import type { University } from '@/types/university'
import UniversityModal from './UniversityModal'

function toSearchText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

const COL_DEFS = {
  siNo:         { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<University>,
  logo:         { headerName: 'Logo', field: 'logoFileName', minWidth: 64, width: 64, flex: 0 } as ColDef<University>,
  universityName: { field: 'universityName', headerName: 'University Name', minWidth: 160, flex: 1.2 } as ColDef<University>,
  universityCode: { field: 'universityCode', headerName: 'University Code', minWidth: 120, flex: 0.9 } as ColDef<University>,
  address:      { field: 'address', headerName: 'Address', minWidth: 150, flex: 1.1 } as ColDef<University>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 110, flex: 0.8 } as ColDef<University>,
  isActive:     { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<University>,
  actions:      { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<University>,
}

function logoRenderer(p: ICellRendererParams<University>) {
  return (
    <img
      src={p.data?.logoFileName ? `${MINIO_URL}${p.data.logoFileName}` : noImgLogo.src}
      alt="logo"
      className="h-8 w-8 rounded object-contain"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = noImgLogo.src }}
    />
  )
}

function statusRenderer(p: ICellRendererParams<University>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: University | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<University>) => (
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

export default function UniversityPage() {
  const [searchValue, setSearchValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)

  const { data: universities, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.universities.list(),
    queryFn: listUniversities,
  })

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return universities
    const lower = searchValue.toLowerCase()
    return universities.filter((row) =>
      Object.values(row).some((val) => toSearchText(val).toLowerCase().includes(lower)),
    )
  }, [searchValue, universities])

  const columnDefs = useMemo<ColDef<University>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.logo, cellRenderer: logoRenderer },
      COL_DEFS.universityName,
      COL_DEFS.universityCode,
      COL_DEFS.address,
      COL_DEFS.mobileNumber,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingUniversity, setModalOpen) },
    ],
    [setEditingUniversity, setModalOpen],
  )

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">University</h2>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <SearchInput
            className="max-w-sm w-full"
            placeholder="Search universities..."
            value={searchValue}
            onChange={setSearchValue}
          />
          <Button size="sm" onClick={() => { setEditingUniversity(null); setModalOpen(true) }}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add University
          </Button>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            {!loading && filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Building2 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No universities found</p>
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

      <UniversityModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUniversity(null) }}
        university={editingUniversity}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
