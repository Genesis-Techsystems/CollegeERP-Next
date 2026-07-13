'use client'

import { useState, useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PencilIcon } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { Button } from '@/components/ui/button'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { formatDate } from '@/common/generic-functions'
import { GM_CODES } from '@/config/constants/ui'
import { listPlacementBroadcasts } from '@/services/placements'
import { listGeneralDetailsByCode } from '@/services'
import type { PlacementBroadcast } from '@/types/placements'
import { rowIndexGetter } from '@/lib/utils'
import PlacementBroadcastModal from './PlacementBroadcastModal'

type AnyRow = Record<string, unknown>

function buildYearOptions(): { value: string; label: string }[] {
  const max = new Date().getFullYear()
  return Array.from({ length: 10 }, (_, i) => {
    const year = String(max - i)
    return { value: year, label: year }
  })
}

const COL_DEFS = {
  siNo: { headerName: 'SI No.', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<PlacementBroadcast>,
  post: { field: 'postHeader', headerName: 'Post', minWidth: 180, flex: 2 } as ColDef<PlacementBroadcast>,
  company: { headerName: 'Company Name', minWidth: 140, flex: 1.2 } as ColDef<PlacementBroadcast>,
  approvedOn: { field: 'approvedOn', headerName: 'Approve Date', minWidth: 120, flex: 1 } as ColDef<PlacementBroadcast>,
  approveStatus: { field: 'isApproved', headerName: 'Approve Status', minWidth: 120, flex: 0.9 } as ColDef<PlacementBroadcast>,
  status: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0.8 } as ColDef<PlacementBroadcast>,
  actions: { headerName: 'Actions', width: 80, flex: 0 } as ColDef<PlacementBroadcast>,
}

function companyNameRenderer(p: ICellRendererParams<PlacementBroadcast>) {
  const row = p.data
  if (!row) return null
  const name = row.companyname ?? (row as PlacementBroadcast & { companyName?: string }).companyName
  return <span className="text-xs">{name ?? '—'}</span>
}

function approvedOnRenderer(p: ICellRendererParams<PlacementBroadcast>) {
  return <span className="text-xs">{formatDate(p.data?.approvedOn)}</span>
}

function approveStatusRenderer(p: ICellRendererParams<PlacementBroadcast>) {
  const approved = p.data?.isApproved ?? false
  return (
    <StatusBadge
      status={approved ? 'active' : 'inactive'}
      label={approved ? 'Approved' : 'Not Approved'}
    />
  )
}

function statusRenderer(p: ICellRendererParams<PlacementBroadcast>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(onEdit: (row: PlacementBroadcast) => void) {
  return (p: ICellRendererParams<PlacementBroadcast>) => {
    if (!p.data) return null
    return (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit"
        onClick={() => onEdit(p.data!)}>
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    )
  }
}

export default function PlacementBroadcastPage() {
  const [yearName, setYearName] = useState<string | null>(null)
  const [posttypeCatdetId, setPosttypeCatdetId] = useState<string | null>(null)
  const [postTypes, setPostTypes] = useState<AnyRow[]>([])
  const [postTypesLoading, setPostTypesLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState<PlacementBroadcast | null>(null)

  const filtersReady = Boolean(yearName && posttypeCatdetId)

  async function handleYearChange(value: string | null) {
    setYearName(value)
    setPosttypeCatdetId(null)
    setPostTypes([])

    if (!value) return
    setPostTypesLoading(true)
    try {
      const rows = await listGeneralDetailsByCode(GM_CODES.PLACEMENT_TYPE)
      setPostTypes(rows)
    } catch {
      setPostTypes([])
    } finally {
      setPostTypesLoading(false)
    }
  }

  const { data, isLoading, invalidate } = useCrudList<PlacementBroadcast>({
    queryKey: QK.placementBroadcasts.byYearType(yearName ?? '', Number(posttypeCatdetId)),
    queryFn: () => listPlacementBroadcasts(yearName!, Number(posttypeCatdetId)),
    enabled: filtersReady,
  })

  const columnDefs = useMemo<ColDef<PlacementBroadcast>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.post,
      { ...COL_DEFS.company, cellRenderer: companyNameRenderer },
      { ...COL_DEFS.approvedOn, cellRenderer: approvedOnRenderer },
      { ...COL_DEFS.approveStatus, cellRenderer: approveStatusRenderer },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer((row) => { setEditData(row); setModalOpen(true) }) },
    ],
    [],
  )

  const postTypeOptions = useMemo(
    () => postTypes.map((t) => ({
      value: String(t.generalDetailId ?? t.gd_id ?? ''),
      label: String(t.generalDetailDisplayName ?? t.gd_name ?? 'Type'),
    })).filter((o) => o.value),
    [postTypes],
  )

  return (
    <FilteredListPage
      title="Broadcast Messages"
      filters={(
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-w-2xl">
          <Select
            label="Year *"
            value={yearName}
            onChange={handleYearChange}
            options={buildYearOptions()}
            placeholder="Select year"
            clearable
          />
          <Select
            label="Post Type *"
            value={posttypeCatdetId}
            onChange={setPosttypeCatdetId}
            options={postTypeOptions}
            placeholder="Select post type"
            disabled={!yearName}
            isLoading={postTypesLoading}
            clearable
          />
        </div>
      )}
      rowData={filtersReady ? data : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Broadcast Messages',
      }}
      toolbarTrailing={(
        <Button size="sm" onClick={() => { setEditData(null); setModalOpen(true) }}>
          + Placement Broadcast
        </Button>
      )}
    >
      <PlacementBroadcastModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        filterContext={{ yearName: yearName ?? '', posttypeCatdetId: posttypeCatdetId ?? '' }}
        onSaved={invalidate}
      />
    </FilteredListPage>
  )
}
