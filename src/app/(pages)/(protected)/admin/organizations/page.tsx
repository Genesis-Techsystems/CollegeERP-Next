'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, Building2 } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable, TableRowActions } from '@/common/components/table'
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

const COL_DEFS = {
  siNo:         { headerName: 'SL.No', valueGetter: rowIndexGetter, width: 72, flex: 0, filter: false, sortable: false } as ColDef<Organization>,
  logo:         { headerName: 'Logo', field: 'logoPath', minWidth: 72, width: 72, flex: 0, filter: false, sortable: false } as ColDef<Organization>,
  orgName:      { field: 'orgName', headerName: 'Organization Name', minWidth: 160, flex: 1.2 } as ColDef<Organization>,
  orgCode:      { field: 'orgCode', headerName: 'Organization Code', minWidth: 120, flex: 0.9 } as ColDef<Organization>,
  address:      { field: 'address', headerName: 'Address', minWidth: 160, flex: 1.2 } as ColDef<Organization>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile Number', minWidth: 120, flex: 0.9 } as ColDef<Organization>,
  email:        { field: 'email', headerName: 'Email', minWidth: 160, flex: 1.1 } as ColDef<Organization>,
  isActive:     { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0.7 } as ColDef<Organization>,
  actions:      { headerName: 'Actions', colId: 'actions', minWidth: 100, flex: 0, width: 100, filter: false, sortable: false } as ColDef<Organization>,
}

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
    <TableRowActions
      onEdit={() => { setEditing(p.data ?? null); setModalOpen(true) }}
      editLabel="Edit organization"
    />
  )
}

export default function OrganizationsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  const { data: organizations, isLoading: loading, invalidate } = useCrudList({
    queryKey: QK.organizations.list(),
    queryFn: listOrganizations,
  })

  const columnDefs = useMemo<ColDef<Organization>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.logo, cellRenderer: logoRenderer },
      COL_DEFS.orgName,
      COL_DEFS.orgCode,
      COL_DEFS.address,
      COL_DEFS.mobileNumber,
      COL_DEFS.email,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditingOrg, setModalOpen) },
    ],
    [setEditingOrg, setModalOpen],
  )

  return (
    <PageContainer className="space-y-4">
      {!loading && organizations.length === 0 ? (
        <div className="app-card flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">No organizations found</p>
          <Button
            size="sm"
            className="mt-4"
            data-table-primary-action
            onClick={() => { setEditingOrg(null); setModalOpen(true) }}
          >
            <PlusIcon className="mr-1.5 h-4 w-4" />
            New Organization
          </Button>
        </div>
      ) : (
        <DataTable
          title="Organizations"
          bordered
          rowData={organizations}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{ searchPlaceholder: 'Search organizations…', pdfDocumentTitle: 'Organizations' }}
          toolbarTrailing={
            <Button
              size="sm"
              data-table-primary-action
              onClick={() => { setEditingOrg(null); setModalOpen(true) }}
            >
              <PlusIcon className="mr-1.5 h-4 w-4" />
              New Organization
            </Button>
          }
        />
      )}

      <OrganizationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingOrg(null) }}
        organization={editingOrg}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
