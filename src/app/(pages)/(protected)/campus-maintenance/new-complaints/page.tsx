'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssuesByEmployee } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { rowIndexGetter } from '@/lib/utils'
import NewComplaintModal from './NewComplaintModal'
import { useSession } from '@/hooks/useSession'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'

// ─── Column shape ─────────────────────────────────────────────────────────────

const COL_DEFS = {
  siNo:       { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CampusIssue>,
  issueTitle: { field: 'issueTitle', headerName: 'Complaint Title', minWidth: 200, flex: 2 } as ColDef<CampusIssue>,
  college:    { field: 'collegeName', headerName: 'College', minWidth: 140, flex: 1.2 } as ColDef<CampusIssue>,
  raisedBy:   { field: 'raisedEmpName', headerName: 'Raised By', minWidth: 140, flex: 1 } as ColDef<CampusIssue>,
  status:     { field: 'aprvrejstatusCatCode', headerName: 'Status', minWidth: 110, flex: 0.9 } as ColDef<CampusIssue>,
  date:       { field: 'issueLogDate', headerName: 'Complaint Date', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  expectedOn: { field: 'expectedResolvedOn', headerName: 'Expected Resolve', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  actions:    { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<CampusIssue>,
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const code = p.data?.aprvrejstatusCatCode ?? ''
  const cls =
    code === 'INPROGRESS' ? 'bg-blue-100 text-blue-700'
    : code === 'DONE'     ? 'bg-green-100 text-green-700'
    : code === 'REJECTED' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-600'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{code}</span>
}

function makeActionsRenderer(
  onEdit: (issue: CampusIssue) => void,
  onView: (issue: CampusIssue) => void,
) {
  return (p: ICellRendererParams<CampusIssue>) => {
    const issue = p.data
    if (!issue) return null
    return issue.aprvrejstatusCatCode === 'CLOSED' ? (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onView(issue)}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
    ) : (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(issue)}>
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewComplaintsPage() {
  const { user, isLoading: sessionLoading } = useSession()
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)

  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<CampusIssue | null>(null)
  const [viewMode, setViewMode] = useState(false)

  const { data: issues, isLoading, invalidate } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.byEmployee(employeeId),
    queryFn: () => listCampusIssuesByEmployee(employeeId),
    enabled: employeeId > 0,
  })

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.issueTitle,
      COL_DEFS.college,
      COL_DEFS.raisedBy,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      COL_DEFS.date,
      COL_DEFS.expectedOn,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (issue) => { setEditData(issue); setViewMode(false); setModalOpen(true) },
          (issue) => { setEditData(issue); setViewMode(true); setModalOpen(true) },
        ),
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">My Complaints</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={issues}
              columnDefs={columnDefs}
              loading={isLoading || sessionLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search my complaints…',
                pdfDocumentTitle: 'My Complaints',
              }}
              toolbarTrailing={
                <Button
                  size="sm"
                  onClick={() => { setEditData(null); setViewMode(false); setModalOpen(true) }}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New Complaint
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <NewComplaintModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        viewMode={viewMode}
        raisedEmpId={employeeId}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
