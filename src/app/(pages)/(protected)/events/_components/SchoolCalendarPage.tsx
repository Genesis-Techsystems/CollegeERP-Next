'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { PageContainer } from '@/components/layout'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { listSchoolCalendarEvents, type CollegeEventRow } from '@/services'

function readStorageNum(key: string): number {
  if (typeof globalThis.window === 'undefined') return 0
  return Number(globalThis.localStorage.getItem(key) || 0) || 0
}

const COL_DEFS: ColDef<CollegeEventRow>[] = [
  { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: 'eventName', headerName: 'Event Name', minWidth: 180, flex: 1.2 },
  { field: 'eventTypeName', headerName: 'Event Type', minWidth: 140, flex: 1 },
  {
    colId: 'eventDate',
    headerName: 'Event Date',
    minWidth: 130,
    flex: 1,
    valueGetter: (p) => {
      const raw = (p.data as { eventDate?: string } | undefined)?.eventDate ?? p.data?.startDate
      if (!raw) return '-'
      const dt = new Date(String(raw))
      if (Number.isNaN(dt.getTime())) return String(raw)
      return format(dt, 'dd MMM yyyy')
    },
  },
]

export function SchoolCalendarPage() {
  const collegeId = readStorageNum('collegeId')
  const academicYearId = readStorageNum('academicYearId')
  const [rows, setRows] = useState<CollegeEventRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!collegeId || !academicYearId) return
    setLoading(true)
    void listSchoolCalendarEvents(collegeId, academicYearId)
      .then(setRows)
      .catch((e) => {
        toastError(getErrorMessage(e))
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [collegeId, academicYearId])

  const columnDefs = useMemo(() => COL_DEFS, [])

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">School Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Holidays and events for your college ({typeof globalThis.window !== 'undefined' ? globalThis.localStorage.getItem('currentCollege') ?? '' : ''})
        </p>
      </div>

      <TableCard withHeaderBorder={false}>
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: 'Search calendar…',
            pdfDocumentTitle: 'School Calendar',
          }}
        />
      </TableCard>
    </PageContainer>
  )
}
