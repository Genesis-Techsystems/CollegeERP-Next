'use client'

import { useMemo } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { FormModal } from '@/common/components/feedback'
import { rowIndexGetter } from '@/lib/utils'
import { formatDateHeader } from '../_lib/timetable-filters'

type AnyRow = Record<string, unknown>

export type AttendanceConflictDialogProps = {
  open: boolean
  onClose: () => void
  rows: AnyRow[]
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<AnyRow>,
  subjectName: { field: 'subjectName', headerName: 'Subject', minWidth: 160 } as ColDef<AnyRow>,
  classDate: { headerName: 'Class Date', minWidth: 120, flex: 0 } as ColDef<AnyRow>,
  fromTime: { field: 'fromTime', headerName: 'From Time', minWidth: 100, flex: 0 } as ColDef<AnyRow>,
  staff: { headerName: 'Staff', minWidth: 160 } as ColDef<AnyRow>,
}

function classDateRenderer(p: ICellRendererParams<AnyRow>) {
  return formatDateHeader(p.data?.classDate) || '—'
}

function staffRenderer(p: ICellRendererParams<AnyRow>) {
  return String(p.data?.classEmployeeFirstName ?? p.data?.staffName ?? '—')
}

export function AttendanceConflictDialog({ open, onClose, rows }: AttendanceConflictDialogProps) {
  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.subjectName,
      { ...COL_DEFS.classDate, cellRenderer: classDateRenderer },
      COL_DEFS.fromTime,
      { ...COL_DEFS.staff, cellRenderer: staffRenderer },
    ],
    [],
  )

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Attendance records exist"
      description="The following class attendance records are linked to this resource change."
      onSubmit={(e) => {
        e.preventDefault()
        onClose()
      }}
      submitLabel="Close"
      cancelLabel="Dismiss"
      size="lg"
      showFooterDivider
    >
      <DataTable
        columnDefs={columnDefs}
        rowData={rows}
        toolbar={{ search: true, exportExcel: false, exportPdf: false, columnPicker: false }}
        domLayout="autoHeight"
      />
    </FormModal>
  )
}
