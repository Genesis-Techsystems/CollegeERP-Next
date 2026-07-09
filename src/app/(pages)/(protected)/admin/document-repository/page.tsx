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
import { getCrudModalKey, rowIndexGetter } from '@/lib/utils'
import { listDocumentRepositories } from '@/services'
import type { DocumentRepository } from '@/types/document-repository'
import DocumentRepositoryModal from './DocumentRepositoryModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<DocumentRepository>,
  orgCode: { field: 'orgCode', headerName: 'Organization Code', minWidth: 130, flex: 1 } as ColDef<DocumentRepository>,
  universityCode: { field: 'universityCode', headerName: 'University Code', minWidth: 130, flex: 1 } as ColDef<DocumentRepository>,
  collegeCode: { field: 'collegeCode', headerName: 'College Code', minWidth: 120, flex: 1 } as ColDef<DocumentRepository>,
  courseCode: { field: 'courseCode', headerName: 'Course Code', minWidth: 120, flex: 1 } as ColDef<DocumentRepository>,
  docTypeName: { field: 'docTypeName', headerName: 'Document Type', minWidth: 140, flex: 1 } as ColDef<DocumentRepository>,
  docFormName: { field: 'docFormName', headerName: 'Document Form Type', minWidth: 140, flex: 1 } as ColDef<DocumentRepository>,
  docName: { field: 'docName', headerName: 'Document Name', minWidth: 170, flex: 1.2 } as ColDef<DocumentRepository>,
  docCode: { field: 'docCode', headerName: 'Document Code', minWidth: 130, flex: 1 } as ColDef<DocumentRepository>,
  for: { headerName: 'For', minWidth: 160, flex: 1 } as ColDef<DocumentRepository>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0.8 } as ColDef<DocumentRepository>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<DocumentRepository>,
}

function targetRenderer(p: ICellRendererParams<DocumentRepository>) {
  const isForStudent = Boolean(p.data?.isForStudent)
  const isForEmp = Boolean(p.data?.isForEmp)
  if (isForStudent && isForEmp) return 'For Student & Employee'
  if (isForStudent) return 'For Student'
  if (isForEmp) return 'For Employee'
  return '-'
}

function statusRenderer(p: ICellRendererParams<DocumentRepository>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function actionsRenderer(
  setEditing: (row: DocumentRepository | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<DocumentRepository>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit document repository"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function DocumentRepositoryPage() {
  const [open, setOpen] = useState(false)
  const [row, setRow] = useState<DocumentRepository | null>(null)

  const { data, isLoading, invalidate } = useCrudList({
    queryKey: QK.documentRepositories.list(),
    queryFn: listDocumentRepositories,
  })

  const columnDefs = useMemo<ColDef<DocumentRepository>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.orgCode,
    COL_DEFS.universityCode,
    COL_DEFS.collegeCode,
    COL_DEFS.courseCode,
    COL_DEFS.docTypeName,
    COL_DEFS.docFormName,
    COL_DEFS.docName,
    COL_DEFS.docCode,
    { ...COL_DEFS.for, cellRenderer: targetRenderer },
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: actionsRenderer(setRow, setOpen) },
  ], [])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Document Repository Settings</h2>
        </div>
        <div className="px-3 pb-3 pt-2">
          <DataTable
            rowData={data}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{ search: true, searchPlaceholder: 'Search documents...', pdfDocumentTitle: 'Document Repository Settings' }}
            toolbarTrailing={(
              <Button size="sm" onClick={() => { setRow(null); setOpen(true) }}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Document Repository
              </Button>
            )}
          />
        </div>
      </div>

      <DocumentRepositoryModal
        key={getCrudModalKey(row, open, 'documentRepositoryId')}
        open={open}
        onClose={() => { setOpen(false); setRow(null) }}
        row={row}
        existingRows={data}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}

