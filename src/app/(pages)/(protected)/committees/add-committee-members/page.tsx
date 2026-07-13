'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon, PlusIcon } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { StatusBadge } from '@/common/components/data-display'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { formatDate } from '@/common/generic-functions'
import { rowIndexGetter } from '@/lib/utils'
import { listActiveCommittees, listCommitteeMembers } from '@/services'
import type { UnivCommittee, UnivCommitteeMember } from '@/types/committees'
import CommitteeMemberModal from './CommitteeMemberModal'

const organizationId = () => Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

const COL_DEFS = {
  siNo: { headerName: 'No.', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<UnivCommitteeMember>,
  committee: { headerName: 'Committee', minWidth: 140, flex: 1 } as ColDef<UnivCommitteeMember>,
  position: { headerName: 'Position', minWidth: 130, flex: 1 } as ColDef<UnivCommitteeMember>,
  employee: { headerName: 'Employee Name', minWidth: 160, flex: 1.2 } as ColDef<UnivCommitteeMember>,
  fromDate: { headerName: 'From Date', minWidth: 110, flex: 0.8 } as ColDef<UnivCommitteeMember>,
  toDate: { headerName: 'To Date', minWidth: 110, flex: 0.8 } as ColDef<UnivCommitteeMember>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 90, flex: 0.7 } as ColDef<UnivCommitteeMember>,
  actions: { headerName: 'Actions', minWidth: 90, width: 90, flex: 0 } as ColDef<UnivCommitteeMember>,
}

function committeeRenderer(p: ICellRendererParams<UnivCommitteeMember>) {
  const row = p.data
  if (!row) return null
  return <span>{row.univCommitteesName ?? row.committeeName ?? '-'}</span>
}

function positionRenderer(p: ICellRendererParams<UnivCommitteeMember>) {
  const row = p.data
  if (!row) return null
  return <span>{row.univCommitteePositionsName ?? row.committeePossitoinName ?? '-'}</span>
}

function employeeRenderer(p: ICellRendererParams<UnivCommitteeMember>) {
  return <span>{p.data?.committeeMemberEmployeeFirstName ?? '-'}</span>
}

function dateRenderer(field: 'fromDate' | 'toDate') {
  return (p: ICellRendererParams<UnivCommitteeMember>) => {
    const value = p.data?.[field]
    return <span>{value ? formatDate(value) : '-'}</span>
  }
}

function statusRenderer(p: ICellRendererParams<UnivCommitteeMember>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: UnivCommitteeMember | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<UnivCommitteeMember>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      title="Edit"
      onClick={() => { setEditing(p.data ?? null); setModalOpen(true) }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function AddCommitteeMembersPage() {
  const orgId = organizationId()
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null)
  const [appliedCommitteeId, setAppliedCommitteeId] = useState<number>(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<UnivCommitteeMember | null>(null)

  const { data: committees, isLoading: committeesLoading } = useCrudList<UnivCommittee>({
    queryKey: QK.committees.active(orgId),
    queryFn: () => listActiveCommittees(orgId),
    enabled: orgId > 0,
  })

  const { data, isLoading, invalidate } = useCrudList<UnivCommitteeMember>({
    queryKey: QK.committeeMembers.list(appliedCommitteeId),
    queryFn: () => listCommitteeMembers(appliedCommitteeId),
    enabled: appliedCommitteeId > 0,
  })

  const committeeOptions = useMemo(
    () => committees.map((c) => ({
      value: String(c.univCommitteeId),
      label: c.committeeName,
    })),
    [committees],
  )

  const columnDefs = useMemo<ColDef<UnivCommitteeMember>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.committee, cellRenderer: committeeRenderer },
      { ...COL_DEFS.position, cellRenderer: positionRenderer },
      { ...COL_DEFS.employee, cellRenderer: employeeRenderer },
      { ...COL_DEFS.fromDate, cellRenderer: dateRenderer('fromDate') },
      { ...COL_DEFS.toDate, cellRenderer: dateRenderer('toDate') },
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditData, setModalOpen) },
    ],
    [],
  )

  function handleCommitteeChange(value: string | null) {
    setSelectedCommitteeId(value)
    setAppliedCommitteeId(0)
  }

  function handleGetList() {
    const id = Number(selectedCommitteeId ?? 0)
    if (id > 0) setAppliedCommitteeId(id)
  }

  return (
    <FilteredListPage
      title="Committee Members"
      filters={(
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1 max-w-md space-y-0.5">
            <Label className="text-xs">Committee *</Label>
            <Select
              value={selectedCommitteeId}
              onChange={handleCommitteeChange}
              options={committeeOptions}
              placeholder="Select committee"
              searchable
              isLoading={committeesLoading}
            />
          </div>
          <Button
            type="button"
            disabled={!selectedCommitteeId}
            onClick={handleGetList}
          >
            Get List
          </Button>
        </div>
      )}
      rowData={appliedCommitteeId > 0 ? data : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search',
        pdfDocumentTitle: 'Committee Members',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          disabled={appliedCommitteeId <= 0}
          onClick={() => { setEditData(null); setModalOpen(true) }}
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Committee Member
        </Button>
      )}
    >
      <CommitteeMemberModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditData(null) }}
        editData={editData}
        committeeId={appliedCommitteeId}
        onSaved={invalidate}
      />
    </FilteredListPage>
  )
}
