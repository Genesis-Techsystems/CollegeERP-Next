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
      className="h-8 w-8 p-0"
      aria-label="Edit university"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function UniversityPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null)

  const { data: universities, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.universities.list(),
    queryFn: listUniversities,
  })

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
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">University</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && universities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No universities found</p>
              </div>
            ) : (
              <DataTable
                rowData={universities}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search universities…', pdfDocumentTitle: 'University' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingUniversity(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add University
                  </Button>
                }
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
