'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listWorkflowMemberAuthorizations } from '@/services'
import type { WorkflowMemberAuthorization } from '@/types/workflow-member-authorization'
import WorkflowMemberAuthorizationModal from './WorkflowMemberAuthorizationModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<WorkflowMemberAuthorization>,
  collegeCode: { colId: 'collegeCode', headerName: 'College Code', minWidth: 130, flex: 1 } as ColDef<WorkflowMemberAuthorization>,
  storeName: { colId: 'storeName', field: 'storeName', headerName: 'Store', minWidth: 120, flex: 1 } as ColDef<WorkflowMemberAuthorization>,
  wfForCode: { colId: 'wfForCode', field: 'wfForCode', headerName: 'Work Flow Code', minWidth: 130, flex: 1 } as ColDef<WorkflowMemberAuthorization>,
  wfStage: { colId: 'wfStage', field: 'wfStage', headerName: 'Work Flow Stage', minWidth: 130, flex: 1 } as ColDef<WorkflowMemberAuthorization>,
  roleName: { colId: 'roleName', headerName: 'Role', minWidth: 120, flex: 1 } as ColDef<WorkflowMemberAuthorization>,
  employeeName: { colId: 'employeeName', headerName: 'Employee', minWidth: 130, flex: 1 } as ColDef<WorkflowMemberAuthorization>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<WorkflowMemberAuthorization>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<WorkflowMemberAuthorization>,
}

function statusRenderer(p: ICellRendererParams<WorkflowMemberAuthorization>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionRenderer(setRow: (r: WorkflowMemberAuthorization | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<WorkflowMemberAuthorization>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function WorkflowMemberAuthorizationPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<WorkflowMemberAuthorization | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.workflowMemberAuthorizations.list(),
    queryFn: listWorkflowMemberAuthorizations,
  })

  const columnDefs = useMemo<ColDef<WorkflowMemberAuthorization>[]>(() => [
    COLS.siNo,
    { ...COLS.collegeCode, valueGetter: (p) => p.data?.collegeCode ?? '-' },
    { ...COLS.storeName, valueGetter: (p) => p.data?.storeName ?? '-' },
    { ...COLS.wfForCode, valueGetter: (p) => p.data?.wfForCode ?? p.data?.wfForName ?? '-' },
    { ...COLS.wfStage, valueGetter: (p) => p.data?.wfStageName ?? p.data?.wfStage ?? '-' },
    { ...COLS.roleName, valueGetter: (p) => p.data?.roleName ?? '-' },
    { ...COLS.employeeName, valueGetter: (p) => p.data?.employeeName ?? '-' },
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Workflow Member Authorization
          </h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbarTrailing={(
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Workflow Authorization
              </Button>
            )}
            toolbar={{ search: true, searchPlaceholder: 'Search workflow authorizations…', pdfDocumentTitle: 'Workflow Authorizations' }}
          />
        </div>
      </div>
      <WorkflowMemberAuthorizationModal
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
