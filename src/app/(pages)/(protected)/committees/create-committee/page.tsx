'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listCommittees } from '@/services'
import type { UnivCommittee } from '@/types/committees'
import CommitteeModal from './CommitteeModal'

const organizationId = () => Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

const COL_DEFS = {
  siNo: { headerName: 'SI No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivCommittee>,
  organizationName: { field: 'organizationName', headerName: 'Organisation', minWidth: 130, flex: 1 } as ColDef<UnivCommittee>,
  departmentCatdetName: { field: 'departmentCatdetName', headerName: 'Department', minWidth: 140, flex: 1 } as ColDef<UnivCommittee>,
  committeeName: { field: 'committeeName', headerName: 'Committee Name', minWidth: 160, flex: 1.2 } as ColDef<UnivCommittee>,
  universityExamName: { field: 'universityExamName', headerName: 'Exam Name', minWidth: 140, flex: 1 } as ColDef<UnivCommittee>,
  subjectCode: { field: 'subjectCode', headerName: 'Subject Code', minWidth: 110, flex: 0.8 } as ColDef<UnivCommittee>,
  committeeResponsibilities: { field: 'committeeResponsibilities', headerName: 'Committee Responsibilities', minWidth: 180, flex: 1.2 } as ColDef<UnivCommittee>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<UnivCommittee>,
  actions: { headerName: 'Edit', minWidth: 86, width: 86, flex: 0 } as ColDef<UnivCommittee>,
}

function statusRenderer(p: ICellRendererParams<UnivCommittee>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: UnivCommittee | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<UnivCommittee>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function CreateCommitteePage() {
  const orgId = organizationId()
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<UnivCommittee | null>(null)

  const { data, isLoading, invalidate } = useCrudList<UnivCommittee>({
    queryKey: QK.committees.list(orgId),
    queryFn: () => listCommittees(orgId),
    enabled: orgId > 0,
  })

  const columnDefs = useMemo<ColDef<UnivCommittee>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.organizationName,
      COL_DEFS.departmentCatdetName,
      COL_DEFS.committeeName,
      COL_DEFS.universityExamName,
      COL_DEFS.subjectCode,
      COL_DEFS.committeeResponsibilities,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

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
              toolbar={{ search: true, searchPlaceholder: 'Search committees…', pdfDocumentTitle: 'Committees' }}
              toolbarLeading={<h2 className="app-card-title">Create Committee</h2>}
              toolbarTrailing={(
                <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Committee
                </Button>
              )}
            />
          </div>
        </div>
      </div>
      <CommitteeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        organizationId={orgId}
        onSaved={invalidate}
      />
    </PageContainer>
  )
}
