'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange, Eye, PencilIcon, PlusIcon } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listTimetables } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { buildTimetableAllocationQuery } from '../_lib/timetable-query'
import { TimetableFormModal } from './TimetableFormModal'
import {
  ViewAllocatedTimetableModal,
  type ViewTimetableModalContext,
} from './ViewAllocatedTimetableModal'

type TimetableRow = Record<string, unknown>

function formatTimetableLabel(row: TimetableRow): string {
  const name = String(row.timetableName ?? '')
  const start = row.startDate ? new Date(String(row.startDate)).toLocaleDateString() : ''
  const end = row.endDate ? new Date(String(row.endDate)).toLocaleDateString() : ''
  if (start && end) return `${name} (${start} – ${end})`
  return name
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<TimetableRow>,
  name: {
    headerName: 'Timetable',
    minWidth: 220,
    valueGetter: (p) => (p.data ? formatTimetableLabel(p.data) : ''),
  } as ColDef<TimetableRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<TimetableRow>,
  year: { field: 'academicYear', headerName: 'Academic Year', minWidth: 120 } as ColDef<TimetableRow>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0 } as ColDef<TimetableRow>,
  actions: { headerName: 'Actions', minWidth: 220, flex: 0 } as ColDef<TimetableRow>,
}

function statusRenderer(p: ICellRendererParams<TimetableRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  onEdit: (row: TimetableRow) => void,
  onView: (row: TimetableRow) => void,
) {
  return (p: ICellRendererParams<TimetableRow>) => {
    const row = p.data
    if (!row) return null
    const hasTimingSet = row.timingsetId != null && Number(row.timingsetId) > 0
    const q = buildTimetableAllocationQuery(row)
    return (
      <div className="flex flex-wrap items-center gap-1">
        {hasTimingSet ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            title="View allocated timetable"
            onClick={() => onView(row)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px] font-medium text-[hsl(var(--primary))]"
            onClick={() =>
              router.push(`/time-table-management/timetable-allocation?${q}`)
            }
          >
            Allocations
          </Button>
        )}
        <span className="text-muted-foreground">|</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      </div>
    )
  }
}

export function ManageTimetablePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TimetableRow | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewContext, setViewContext] = useState<ViewTimetableModalContext | null>(null)

  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.timetableManagement.timetables(),
    queryFn: listTimetables,
  })

  const existingNames = useMemo(
    () => rows.map((r) => String(r.timetableName ?? '')),
    [rows],
  )

  const columnDefs = useMemo<ColDef<TimetableRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.college,
      COL_DEFS.year,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          router,
          (row) => {
            setEditing(row)
            setModalOpen(true)
          },
          (row) => {
            setViewContext({
              mode: 'structure',
              data: {
                timingsetId: Number(row.timingsetId ?? 0),
                collegeId: Number(row.collegeId ?? 0),
                timetableId: Number(row.timetableId ?? 0),
                collegeCode: String(row.collegeCode ?? ''),
                academicYear: String(row.academicYear ?? ''),
                timetableName: String(row.timetableName ?? ''),
                startDate: String(row.startDate ?? ''),
                endDate: String(row.endDate ?? ''),
              },
            })
            setViewModalOpen(true)
          },
        ),
      },
    ],
    [router],
  )

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: QK.timetableManagement.timetables() })
  }

  return (
    <PageContainer className="space-y-4">
      <TableCard
        headerLeft={
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold leading-none text-[#5da394]">
            <CalendarRange className="h-4 w-4 text-[#5da394]" aria-hidden />
            Manage Timetable
          </h1>
        }
        headerRight={
          <Button
            type="button"
            size="sm"
            className="h-[30px] gap-1 px-3 text-[12px]"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Timetable
          </Button>
        }
      >
        {error ? <p className="px-3 pb-2 text-sm text-destructive">{getErrorMessage(error)}</p> : null}
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={isFetching}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search timetables…',
            exportPdf: true,
            pdfDocumentTitle: 'Manage Timetable',
          }}
        />
      </TableCard>

      <TimetableFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        row={editing}
        existingNames={existingNames}
        onSaved={invalidate}
      />

      <ViewAllocatedTimetableModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false)
          setViewContext(null)
        }}
        context={viewContext}
      />
    </PageContainer>
  )
}
