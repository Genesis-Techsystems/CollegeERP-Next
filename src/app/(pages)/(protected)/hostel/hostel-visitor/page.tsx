'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listHostelVisitorsByHostel } from '@/services'
import type { HostelVisitor } from '@/types/hostel'
import { useHostelSelect } from '../_lib/use-hostel-select'
import { HostelVisitorModal } from './HostelVisitorModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<HostelVisitor>,
  hosteler: { headerName: 'Hosteler name', minWidth: 140 } as ColDef<HostelVisitor>,
  visitorName: { field: 'visitorName', headerName: 'Visitor name', minWidth: 120 } as ColDef<HostelVisitor>,
  relation: {
    field: 'relationCatdetDisplayName',
    headerName: 'Relationship',
    minWidth: 100,
  } as ColDef<HostelVisitor>,
  outTiming: { field: 'outTiming', headerName: 'Out time', minWidth: 120 } as ColDef<HostelVisitor>,
  inTiming: { field: 'inTiming', headerName: 'In time', minWidth: 120 } as ColDef<HostelVisitor>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 110 } as ColDef<HostelVisitor>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<HostelVisitor>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<HostelVisitor>,
}

function hostelerNameRenderer(p: ICellRendererParams<HostelVisitor>) {
  const row = p.data
  if (!row) return null
  return <span>{row.stdFirstName ?? row.empFirstName ?? '—'}</span>
}

function statusRenderer(p: ICellRendererParams<HostelVisitor>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: HostelVisitor | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<HostelVisitor>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit visitor pass"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function HostelVisitorPage() {
  const queryClient = useQueryClient()
  const [hostelId, setHostelId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HostelVisitor | null>(null)
  const { hostels, loadingHostels } = useHostelSelect()
  const hostelNum = Number(hostelId ?? 0)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.hostel.visitors(hostelNum),
    queryFn: () => listHostelVisitorsByHostel(hostelNum),
    enabled: hostelNum > 0,
  })

  const columnDefs = useMemo<ColDef<HostelVisitor>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.hosteler, cellRenderer: hostelerNameRenderer },
      COL_DEFS.visitorName,
      COL_DEFS.relation,
      COL_DEFS.outTiming,
      COL_DEFS.inTiming,
      COL_DEFS.mobileNumber,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  function invalidateVisitors() {
    void queryClient.invalidateQueries({ queryKey: QK.hostel.visitors(hostelNum) })
  }

  return (
    <FilteredListPage
      title="Hostel Visitor"
      filters={(
        <Select
          label="Hostel"
          className={FILTER_CARD_SELECT_CLASS}
          value={hostelId}
          onChange={setHostelId}
          options={hostels}
          searchable
          isLoading={loadingHostels}
        />
      )}
      rowData={hostelNum > 0 ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: 'Search visitors…',
        exportPdf: true,
        pdfDocumentTitle: 'Hostel Visitor',
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          disabled={hostelNum <= 0}
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
          Hostel Visitor Pass
        </Button>
      }
    >
      {hostelNum > 0 ? (
        <HostelVisitorModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          hostelId={hostelNum}
          row={editing}
          onSaved={invalidateVisitors}
        />
      ) : null}
    </FilteredListPage>
  )
}
