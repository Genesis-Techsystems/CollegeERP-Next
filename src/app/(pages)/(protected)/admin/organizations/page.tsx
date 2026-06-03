'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, Building2, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/common/components/data-display'
import OrganizationModal from './OrganizationModal'
import { listOrganizations } from '@/services/admin/organization'
import type { Organization } from '@/types/organization'
import { MINIO_URL } from '@/config/constants/api'
import noImgLogo from '@/assets/images/no-img-logo.png'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'

// ─── Column shape (pure data, no renderers) ────────────────────────────────

const COL_DEFS = {
  siNo:         { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<Organization>,
  logo:         { headerName: 'Logo', field: 'logoPath', minWidth: 64, width: 64, flex: 0 } as ColDef<Organization>,
  orgName:      { field: 'orgName', headerName: 'Organization Name', minWidth: 150, flex: 1.2 } as ColDef<Organization>,
  orgCode:      { field: 'orgCode', headerName: 'Org Code', minWidth: 110, flex: 0.9 } as ColDef<Organization>,
  address:      { field: 'address', headerName: 'Address', minWidth: 150, flex: 1.2 } as ColDef<Organization>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 110, flex: 0.9 } as ColDef<Organization>,
  email:        { field: 'email', headerName: 'Email', minWidth: 150, flex: 1.1 } as ColDef<Organization>,
  isActive:     { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<Organization>,
  actions:      { headerName: 'Actions', minWidth: 86, flex: 0, width: 86 } as ColDef<Organization>,
}

// ─── Cell renderers ────────────────────────────────────────────────────────

function logoRenderer(p: ICellRendererParams<Organization>) {
  return (
    <img
      src={p.data?.logoPath ? `${MINIO_URL}${p.data.logoPath}` : noImgLogo.src}
      alt="logo"
      className="h-8 w-8 rounded object-contain"
      onError={(e) => { (e.currentTarget as HTMLImageElement).src = noImgLogo.src }}
    />
  )
}

function statusRenderer(p: ICellRendererParams<Organization>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (org: Organization | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<Organization>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit organisation"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  // ── Fetch organizations ─────────────────────────────────────────────────
  const { data: organizations, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.organizations.list(),
    queryFn: listOrganizations,
  })

  // ── Column definitions ──────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<Organization>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.logo,     cellRenderer: logoRenderer },
      COL_DEFS.orgName,
      COL_DEFS.orgCode,
      COL_DEFS.address,
      COL_DEFS.mobileNumber,
      COL_DEFS.email,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions,  cellRenderer: makeActionsRenderer(setEditingOrg, setModalOpen) },
    ],
    [setEditingOrg, setModalOpen],
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Organisation</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {!loading && organizations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No organizations found</p>
              </div>
            ) : (
              <DataTable
                rowData={organizations}
                columnDefs={columnDefs}
                loading={loading}
                pagination
                toolbar={{ search: true, searchPlaceholder: 'Search organisations…', pdfDocumentTitle: 'Organisation' }}
                toolbarTrailing={
                  <Button size="sm" onClick={() => { setEditingOrg(null); setModalOpen(true) }}>
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Organisation
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>

      <OrganizationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingOrg(null) }}
        organization={editingOrg}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
