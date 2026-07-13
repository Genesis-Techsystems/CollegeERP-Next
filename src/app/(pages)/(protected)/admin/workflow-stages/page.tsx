'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listWorkflowStages } from '@/services'
import type { WorkflowStage } from '@/types/workflow-stage'
import WorkflowStageModal from './WorkflowStageModal'

const COLS = {
  siNo: { colId: 'siNo', headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<WorkflowStage>,
  orgCode: { colId: 'orgCode', headerName: 'Organization', minWidth: 120, flex: 1 } as ColDef<WorkflowStage>,
  collegeCode: { colId: 'collegeCode', headerName: 'College', minWidth: 120, flex: 1 } as ColDef<WorkflowStage>,
  wfCode: { colId: 'wfCode', field: 'wfCode', headerName: 'Workflow Code', minWidth: 100, flex: 0.9 } as ColDef<WorkflowStage>,
  wfName: { colId: 'wfName', field: 'wfName', headerName: 'Workflow Name', minWidth: 140, flex: 1.1 } as ColDef<WorkflowStage>,
  wfStage: { colId: 'wfStage', field: 'wfStage', headerName: 'Workflow Stage', minWidth: 90, flex: 0.8 } as ColDef<WorkflowStage>,
  wfFor: { colId: 'wfFor', field: 'wfFor', headerName: 'Workflow For', minWidth: 110, flex: 1 } as ColDef<WorkflowStage>,
  wfStatus: { colId: 'wfStatus', field: 'wfStatus', headerName: 'Workflow Status', minWidth: 100, flex: 1 } as ColDef<WorkflowStage>,
  availableFor: { colId: 'availableFor', field: 'availableFor', headerName: 'Available For', minWidth: 120, flex: 1 } as ColDef<WorkflowStage>,
  isActive: { colId: 'isActive', field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<WorkflowStage>,
  actions: { colId: 'actions', headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<WorkflowStage>,
}

function statusRenderer(p: ICellRendererParams<WorkflowStage>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}
function actionRenderer(setRow: (r: WorkflowStage | null) => void, setOpen: (b: boolean) => void) {
  return (p: ICellRendererParams<WorkflowStage>) => (
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setRow(p.data ?? null); setOpen(true) }}>
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function WorkflowStagesPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<WorkflowStage | null>(null)
  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.workflowStages.list(),
    queryFn: listWorkflowStages,
  })

  const columnDefs = useMemo<ColDef<WorkflowStage>[]>(() => [
    COLS.siNo,
    { ...COLS.orgCode, valueGetter: (p) => p.data?.orgCode ?? '-' },
    { ...COLS.collegeCode, valueGetter: (p) => p.data?.collegeCode ?? '-' },
    COLS.wfCode,
    COLS.wfName,
    COLS.wfStage,
    COLS.wfFor,
    COLS.wfStatus,
    COLS.availableFor,
    { ...COLS.isActive, cellRenderer: statusRenderer },
    { ...COLS.actions, cellRenderer: actionRenderer(setRow, setOpen) },
  ], [])

  return (
    <ListPage
      title="Workflow Stages"
      rowData={data}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{ search: true, searchPlaceholder: 'Search workflow stages…', pdfDocumentTitle: 'Workflow Stages' }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Workflow Stage
        </Button>
      )}
    >
      <WorkflowStageModal
        key={getCrudModalKey(row, open, 'workflowStageId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
