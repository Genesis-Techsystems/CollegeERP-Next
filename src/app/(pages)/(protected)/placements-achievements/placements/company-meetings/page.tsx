'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { ListPage } from '@/components/layout'

import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCompanyMeetings } from '@/services/placements'
import type { CompanyMeeting } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import CompanyMeetingModal from './CompanyMeetingModal'

export default function CompanyMeetingsPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<CompanyMeeting | null>(null)

  const { data, isLoading, invalidate } = useCrudList<CompanyMeeting>({
    queryKey: QK.companyMeetings.list(),
    queryFn: listCompanyMeetings,
  })

  const columnDefs = useMemo<ColDef<CompanyMeeting>[]>(() => [
    { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
    { field: 'meetingTitle', headerName: 'Meeting Title', minWidth: 160, flex: 2 },
    { field: 'companyname', headerName: 'Company', minWidth: 130, flex: 1 },
    { field: 'meetingOn', headerName: 'Meeting On', minWidth: 110, flex: 1 },
    { field: 'meetingTypeCatdetName', headerName: 'Type', minWidth: 110, flex: 1 },
    { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.8 },
    {
      field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.8,
      cellRenderer: (p: ICellRendererParams<CompanyMeeting>) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.data?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {p.data?.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 80, flex: 0,
      cellRenderer: (p: ICellRendererParams<CompanyMeeting>) => {
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
    <ListPage
              title="Company Meetings"
              rowData={data}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{ search: true, searchPlaceholder: 'Search meetings…', pdfDocumentTitle: 'Company Meetings' }}
              toolbarTrailing={
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>+ Add Meeting</Button>
              }
            >
      <CompanyMeetingModal open={modalOpen} onClose={() => setModalOpen(false)} editData={editData} onSaved={invalidate} />
    </ListPage>
  )
}
