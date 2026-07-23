'use client'

import { useMemo, useState } from 'react'
import { PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useCrudList } from '@/hooks/useCrudList'
import { StatusBadge } from '@/common/components/data-display'
import { ListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listCounselorActivityTypes, type CounselorActivityType } from '@/services'
import { ActivityTypeModal } from './ActivityTypeModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<CounselorActivityType>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 110 } as ColDef<CounselorActivityType>,
  code: { field: 'activityTypeCode', headerName: 'Activity Type Code', minWidth: 140 } as ColDef<CounselorActivityType>,
  name: { field: 'activityTypeName', headerName: 'Activity Type Name', minWidth: 180 } as ColDef<CounselorActivityType>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<CounselorActivityType>,
  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<CounselorActivityType>,
}

function statusRenderer(p: ICellRendererParams<CounselorActivityType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  setEditing: (row: CounselorActivityType | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<CounselorActivityType>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit activity type"
      onClick={() => {
        setEditing(p.data ?? null)
        setModalOpen(true)
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export function ActivityTypePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CounselorActivityType | null>(null)

  const { data: rows, isLoading, invalidate } = useCrudList({
    queryKey: QK.mentorship.activityTypes(),
    queryFn: listCounselorActivityTypes,
  })

  const columnDefs = useMemo<ColDef<CounselorActivityType>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.code,
      COL_DEFS.name,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },
    ],
    [],
  )

  return (
    <ListPage
      title="Activity Type"
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search activity types…',
        pdfDocumentTitle: 'Counselor Activity Types',
      }}
      toolbarTrailing={(
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          Add Activity Type
        </Button>
      )}
    >
      <ActivityTypeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        existingRows={rows}
        onSaved={invalidate}
      />
    </ListPage>
  )
}
