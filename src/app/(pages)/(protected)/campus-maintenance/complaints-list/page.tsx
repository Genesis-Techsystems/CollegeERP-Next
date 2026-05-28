'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, PencilIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { listCampusIssues } from '@/services/campus-maintenance'
import type { CampusIssue } from '@/types/campus-maintenance'
import { rowIndexGetter } from '@/lib/utils'
import ComplaintOverviewModal from './ComplaintOverviewModal'

function statusClass(code: string) {
  switch (code) {
    case 'INPROGRESS': return 'bg-blue-100 text-blue-700'
    case 'DONE':       return 'bg-green-100 text-green-700'
    case 'REJECTED':   return 'bg-red-100 text-red-700'
    case 'CLOSED':     return 'bg-gray-100 text-gray-600'
    default:           return 'bg-slate-100 text-slate-600'
  }
}

// ─── Column shape ─────────────────────────────────────────────────────────────

const COL_DEFS = {
  siNo:       { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CampusIssue>,
  issueTitle: { field: 'issueTitle', headerName: 'Complaint Title', minWidth: 200, flex: 2 } as ColDef<CampusIssue>,
  priority:   { field: 'issuepriorityCatDisplayName', headerName: 'Priority', minWidth: 100, flex: 0.8 } as ColDef<CampusIssue>,
  date:       { field: 'issueLogDate', headerName: 'Complaint Date', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  raisedBy:   { field: 'raisedEmpName', headerName: 'Raised By', minWidth: 150, flex: 1.2 } as ColDef<CampusIssue>,
  expectedOn: { field: 'expectedResolvedOn', headerName: 'Expected Resolve', minWidth: 130, flex: 1 } as ColDef<CampusIssue>,
  status:     { field: 'aprvrejstatusCatCode', headerName: 'Status', minWidth: 110, flex: 0.9 } as ColDef<CampusIssue>,
  actions:    { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<CampusIssue>,
}

// ─── Renderers ────────────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const code = p.data?.aprvrejstatusCatCode ?? ''
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass(code)}`}>
      {code}
    </span>
  )
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

export default function ComplaintsListPage() {
  const router = useRouter()
  const [overviewIssue, setOverviewIssue] = useState<CampusIssue | null>(null)

  const { data: issues, isLoading, invalidate } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.list(),
    queryFn: listCampusIssues,
  })

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.issueTitle,
      COL_DEFS.priority,
      COL_DEFS.date,
      COL_DEFS.raisedBy,
      COL_DEFS.expectedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (issue) => router.push(`/campus-maintenance/add-complaints?id=${issue.managementIssueId}`),
          setOverviewIssue,
        ),
      },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Complaints List</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <DataTable
              rowData={issues}
              columnDefs={columnDefs}
              loading={isLoading}
              pagination
              toolbar={{
                search: true,
                searchPlaceholder: 'Search complaints…',
                pdfDocumentTitle: 'Complaints List',
              }}
            />
          </div>
        </div>
      </div>

      <ComplaintOverviewModal
        open={overviewIssue !== null}
        onClose={() => setOverviewIssue(null)}
        issue={overviewIssue}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
