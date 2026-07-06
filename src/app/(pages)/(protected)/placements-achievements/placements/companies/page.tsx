'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, EyeIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCompanies } from '@/services/placements'
import type { Company } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import CompanyModal from './CompanyModal'

export default function CompaniesPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<Company | null>(null)

  const { data, isLoading, invalidate } = useCrudList<Company>({
    queryKey: QK.companies.list(),
    queryFn: listCompanies,
  })

  const columnDefs = useMemo<ColDef<Company>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'companyname', headerName: 'Company Name', minWidth: 160, flex: 2 },
    { field: 'location', headerName: 'Location', minWidth: 120, flex: 1 },
    { field: 'phoneNumber', headerName: 'Phone', minWidth: 110, flex: 1 },
    {
      field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8,
      cellRenderer: (p: ICellRendererParams<Company>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {p.data?.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 110, flex: 0,
      cellRenderer: (p: ICellRendererParams<Company>) => {
        const row = p.data
        if (!row) return null
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => { setEditData(row); setModalOpen(true) }}>
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
              onClick={() => router.push(`/placements-achievements/placements/company-contacts?companyId=${row.companyId}&companyname=${encodeURIComponent(row.companyname)}`)}>
              <EyeIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      },
    },
  ], [router])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              title="Companies"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search companies…', pdfDocumentTitle: 'Companies' }}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>+ Add Company</Button>
              }
            />
          </div>
        </div>
      </div>
      <CompanyModal open={modalOpen} onClose={() => setModalOpen(false)} editData={editData} onSaved={invalidate} />
    </PageContainer>
  )
}
