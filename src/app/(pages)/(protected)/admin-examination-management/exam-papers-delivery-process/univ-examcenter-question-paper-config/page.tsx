'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable, TableRowActions } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { listAllUnivEcQuestionPaperConfigs, type AnyRow } from '@/services/exam-papers-delivery'
import QuestionPaperConfigModal from './QuestionPaperConfigModal'

type Row = AnyRow

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

const COL_DEFS = {
  siNo: { headerName: 'SL.No', valueGetter: rowIndexGetter, width: 72, flex: 0, filter: false, sortable: false } as ColDef<Row>,
  examCenterCode: { headerName: 'Exam Center Code', minWidth: 160, flex: 1 } as ColDef<Row>,
  systemIpAddress: { headerName: 'System IP Address', minWidth: 160, flex: 1 } as ColDef<Row>,
  macAddress: { headerName: 'Mac Address', minWidth: 160, flex: 1 } as ColDef<Row>,
  isActive: { headerName: 'Status', minWidth: 100, flex: 0.7 } as ColDef<Row>,
  actions: { headerName: 'Actions', colId: 'actions', minWidth: 100, flex: 0, width: 100, filter: false, sortable: false } as ColDef<Row>,
}

function statusRenderer(p: ICellRendererParams<Row>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />
}

function makeActionsRenderer(setEditing: (row: Row | null) => void, setModalOpen: (open: boolean) => void) {
  return (p: ICellRendererParams<Row>) => (
    <TableRowActions
      onEdit={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
      editLabel="Edit question paper config"
    />
  )
}

export default function UnivExamCenterQuestionPaperConfigPage() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const configs = await listAllUnivEcQuestionPaperConfigs()
      setRows(Array.isArray(configs) ? configs : [])
    } catch (e) {
      toastError(e, 'Failed to load question paper configs')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.examCenterCode,
        valueGetter: (p) => txt(p.data?.examcenterCode ?? p.data?.examCenterCode) || '—',
      },
      {
        ...COL_DEFS.systemIpAddress,
        valueGetter: (p) => txt(p.data?.systemIpAddress) || '—',
      },
      {
        ...COL_DEFS.macAddress,
        valueGetter: (p) => txt(p.data?.macAddress) || '—',
      },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <DataTable
        title="Exam Center Question Paper Config"
        bordered
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        toolbar={{
          searchPlaceholder: 'Search question paper configs…',
          pdfDocumentTitle: 'Exam Center Question Paper Config',
        }}
        toolbarTrailing={
          <Button
            size="sm"
            data-table-primary-action
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Add Question Paper Config
          </Button>
        }
      />

      <QuestionPaperConfigModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        config={editing}
        onSaved={() => void loadData()}
      />
    </PageContainer>
  )
}
