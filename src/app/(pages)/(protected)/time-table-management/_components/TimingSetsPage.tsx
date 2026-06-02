'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon, PlusIcon, Timer } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { getErrorMessage } from '@/lib/errors'
import { listTimingSets } from '@/services'
import { rowIndexGetter } from '@/lib/utils'
import { clearTimingSetContext, setTimingSetContext } from '../_lib/timetable-context'

type TimingSetRow = Record<string, unknown>

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<TimingSetRow>,
  name: { field: 'timingsetName', headerName: 'Timing Set Name', minWidth: 180 } as ColDef<TimingSetRow>,
  year: { field: 'academicYear', headerName: 'Academic Year', minWidth: 120 } as ColDef<TimingSetRow>,
  college: { field: 'collegeCode', headerName: 'College', minWidth: 100 } as ColDef<TimingSetRow>,
  actions: { headerName: 'Actions', minWidth: 160, flex: 0 } as ColDef<TimingSetRow>,
}

const TIMING_SLOTS_HREF = '/time-table-management/timing-slots'

function makeActionsRenderer(router: ReturnType<typeof useRouter>) {
  return (p: ICellRendererParams<TimingSetRow>) => {
    const row = p.data
    if (!row) return null
    const timingsetId = Number(row.timingsetId ?? 0)
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[12px]"
          onClick={() => {
            setTimingSetContext({
              timingsetId,
              timingsetName: String(row.timingsetName ?? ''),
              collegeId: Number(row.collegeId ?? 0),
              collegeCode: String(row.collegeCode ?? ''),
              academicYearId: Number(row.academicYearId ?? 0),
              academicYear: String(row.academicYear ?? ''),
            })
            router.push(`${TIMING_SLOTS_HREF}?timingsetId=${timingsetId}`)
          }}
        >
          <PencilIcon className="h-3.5 w-3.5 mr-1" />
          Timings
        </Button>
      </div>
    )
  }
}

export function TimingSetsPage() {
  const router = useRouter()
  const { data: rows = [], isFetching, error } = useQuery({
    queryKey: QK.timetableManagement.timingSets(),
    queryFn: listTimingSets,
  })

  const columnDefs = useMemo<ColDef<TimingSetRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.year,
      COL_DEFS.college,
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(router) },
    ],
    [router],
  )

  return (
    <PageContainer className="space-y-4">
      <TableCard
        headerLeft={
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold leading-none text-[#5da394]">
            <Timer className="h-4 w-4 text-[#5da394]" aria-hidden />
            Timing Sets
          </h1>
        }
        headerRight={
          <Button
            type="button"
            size="sm"
            className="h-[30px] gap-1 px-3 text-[12px]"
            onClick={() => {
              clearTimingSetContext()
              router.push(TIMING_SLOTS_HREF)
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Timing Set
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
            searchPlaceholder: 'Search timing sets…',
            exportPdf: true,
            pdfDocumentTitle: 'Timing Sets',
          }}
        />
      </TableCard>
    </PageContainer>
  )
}
