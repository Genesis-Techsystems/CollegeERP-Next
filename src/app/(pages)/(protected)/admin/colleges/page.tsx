'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Building2, PencilIcon, PlusIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'
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
  siNo: {
    headerName: 'SI.No',
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<College>,
  logo: {
    headerName: 'Image',
    field: 'logo',
    minWidth: 80,
    width: 80,
    flex: 0,
    filter: false,
    sortable: false,
  } as ColDef<College>,
  orgCode: {
    field: 'orgCode',
    headerName: 'Organization',
    minWidth: 110,
    flex: 0.85,
  } as ColDef<College>,
  universityCode: {
    field: 'universityCode',
    headerName: 'University',
    minWidth: 110,
    flex: 0.85,
  } as ColDef<College>,
  collegeCode: {
    field: 'collegeCode',
    headerName: 'College Code',
    minWidth: 115,
    flex: 0.85,
  } as ColDef<College>,
  collegeName: {
    field: 'collegeName',
    headerName: 'College Name',
    minWidth: 170,
    flex: 1.35,
  } as ColDef<College>,
  sortOrder: {
    field: 'sortOrder',
    headerName: 'Sort order',
    minWidth: 100,
    width: 110,
    flex: 0,
  } as ColDef<College>,
  address: {
    field: 'address',
    headerName: 'Address',
    minWidth: 200,
    flex: 1.2,
    cellClass: 'overflow-hidden',
  } as ColDef<College>,
  mobileNumber: {
    field: 'mobileNumber',
    headerName: 'Mobile No',
    minWidth: 120,
    flex: 0.9,
  } as ColDef<College>,
  isActive: {
    field: 'isActive',
    headerName: 'Status',
    minWidth: 90,
    flex: 0.7,
  } as ColDef<College>,
  actions: {
    headerName: 'Actions',
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<College>,
}

/** Angular: MINIO + college.logo; empty → circular NO LOGO placeholder. */
function collegeLogoSrc(logo?: string | null): string {
  const raw = String(logo ?? '').trim()
  if (!raw) return noImgLogo.src
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw
  if (raw.startsWith('/assets/')) return raw
  const base = String(MINIO_URL ?? '').replace(/\/?$/, '/')
  return `${base}${raw.replace(/^\/+/, '')}`
}

function logoRenderer(p: ICellRendererParams<College>) {
  return (
    <img
      src={collegeLogoSrc(p.data?.logo)}
      alt="logo"
      className="h-9 w-9 rounded-full object-cover"
      onError={(e) => {
        ;(e.currentTarget as HTMLImageElement).src = noImgLogo.src
      }}
    />
  )
}

function statusRenderer(p: ICellRendererParams<College>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function addressRenderer(p: ICellRendererParams<College>) {
  const text = p.data?.address ?? ''
  return (
    <div className="min-w-0 w-full truncate text-[13px] text-foreground" title={text}>
      {text}
    </div>
  )
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
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CollegesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCollege, setEditingCollege] = useState<College | null>(null)

  const {
    data: colleges,
    isLoading: loading,
    invalidate,
  } = useCrudList({
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
      COL_DEFS.sortOrder,
      { ...COL_DEFS.address, cellRenderer: addressRenderer },
      COL_DEFS.mobileNumber,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditingCollege, setModalOpen),
      },
    ],
    [],
  )

  return (
    <ListPage
      title="Colleges"
      rowData={colleges}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search colleges…',
        pdfDocumentTitle: 'Colleges',
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditingCollege(null)
            setModalOpen(true)
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add College
        </Button>
      }
      emptyState={
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No colleges found</p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => {
              setEditingCollege(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add College
          </Button>
        </div>
      }
    >
      <CollegeModal
        key={editingCollege?.collegeId ?? "add-college"}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingCollege(null)
        }}
        college={editingCollege}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
