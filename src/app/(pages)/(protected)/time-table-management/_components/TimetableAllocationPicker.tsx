'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { listTimetables } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { buildTimetableAllocationQuery } from '../_lib/timetable-query'

type TimetableRow = Record<string, unknown>

function formatLabel(row: TimetableRow): string {
  const name = String(row.timetableName ?? row.timetable_name ?? '')
  const start = row.startDate ?? row.start_date
  const end = row.endDate ?? row.end_date
  if (start && end) {
    const s = new Date(String(start)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const e = new Date(String(end)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${name} (${s} – ${e})`
  }
  return name
}

function needsAllocation(row: TimetableRow): boolean {
  const ts = Number(row.timingsetId ?? row.timingset_id ?? 0)
  return !Number.isFinite(ts) || ts <= 0
}

export function TimetableAllocationPicker() {
  const router = useRouter()
  const { data: rows = [], isFetching } = useQuery({
    queryKey: QK.timetableManagement.timetables(),
    queryFn: listTimetables,
  })

  const pending = useMemo(() => rows.filter(needsAllocation), [rows])

  const columnDefs = useMemo<ColDef<TimetableRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: 'Timetable',
        minWidth: 220,
        valueGetter: (p) => (p.data ? formatLabel(p.data) : ''),
      },
      { field: 'collegeCode', headerName: 'College', minWidth: 100 },
      { field: 'academicYear', headerName: 'Academic Year', minWidth: 120 },
      {
        headerName: 'Action',
        minWidth: 120,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TimetableRow>) => {
          const row = p.data
          if (!row) return null
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[12px]"
              onClick={() => {
                const q = buildTimetableAllocationQuery(row)
                router.push(`/time-table-management/timetable-allocation?${q}`)
              }}
            >
              Allocate
            </Button>
          )
        },
      },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-4">
      <TableCard
        headerLeft={
          <div>
            <h1 className="text-[15px] font-semibold text-[#5da394]">Timetable Allocation</h1>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Select a timetable that does not have a timing set yet, then assign sections.
            </p>
          </div>
        }
      >
        {pending.length === 0 && !isFetching ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            No timetables pending allocation. All active timetables already have a timing set, or
            create a new timetable from{' '}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => router.push('/time-table-management/manage-timetable')}
            >
              Manage Timetable
            </button>
            .
          </p>
        ) : (
          <DataTable
            rowData={pending}
            columnDefs={columnDefs}
            loading={isFetching}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search timetables…',
            }}
          />
        )}
      </TableCard>
    </PageContainer>
  )
}
