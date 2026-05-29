'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCompanyContactsByCompany } from '@/services/placements'
import type { CompanyContact } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import CompanyContactModal from './CompanyContactModal'

function CompanyContactsContent() {
  const params = useSearchParams()
  const companyId = Number(params.get('companyId') ?? 0)
  const companyname = params.get('companyname') ?? ''

  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<CompanyContact | null>(null)

  const { data, isLoading, invalidate } = useCrudList<CompanyContact>({
    queryKey: QK.companyContacts.byCompany(companyId),
    queryFn: () => listCompanyContactsByCompany(companyId),
    enabled: companyId > 0,
  })

  const columnDefs = useMemo<ColDef<CompanyContact>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'personName', headerName: 'Person Name', minWidth: 140, flex: 2 },
    { field: 'mobile', headerName: 'Mobile', minWidth: 110, flex: 1 },
    { field: 'designation', headerName: 'Designation', minWidth: 120, flex: 1 },
    { field: 'emailid', headerName: 'Email', minWidth: 150, flex: 1.5 },
    {
      field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8,
      cellRenderer: (p: ICellRendererParams<CompanyContact>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {p.data?.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 80, flex: 0,
      cellRenderer: (p: ICellRendererParams<CompanyContact>) => {
        if (!p.data) return null
        return (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
            onClick={() => { setEditData(p.data!); setModalOpen(true) }}>
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        )
      },
    },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search contacts…', pdfDocumentTitle: 'Company Contacts' }}
              toolbarLeading={
                <h2 className="app-card-title">
                  Company Contacts{companyname ? ` — ${companyname}` : ''}
                </h2>
              }
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>+ Add Contact</Button>
              }
            />
          </div>
        </div>
      </div>
      <CompanyContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        companyId={companyId}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}

export default function CompanyContactsPage() {
  return (
    <Suspense>
      <CompanyContactsContent />
    </Suspense>
  )
}
