'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/common/components/table'
import { listGroupYearRegulationSubjects } from '@/services'

type AnyRow = Record<string, any>

const COLS: ColDef<AnyRow>[] = [
  { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, minWidth: 70, maxWidth: 80, flex: 0 },
  { field: 'subjectCode', headerName: 'Subject Code', minWidth: 120, flex: 1 },
  { field: 'subjectName', headerName: 'Subject Name', minWidth: 220, flex: 1.3 },
  { field: 'subjecttypeCode', headerName: 'Subject Type', minWidth: 130, flex: 1 },
  { field: 'lectures', headerName: 'Lecture', minWidth: 100, maxWidth: 110, flex: 0 },
  { field: 'tutorials', headerName: 'Tutorial', minWidth: 100, maxWidth: 110, flex: 0 },
  { field: 'practicals', headerName: 'Practical', minWidth: 100, maxWidth: 110, flex: 0 },
  { field: 'credits', headerName: 'Credits', minWidth: 90, maxWidth: 100, flex: 0 },
]

export default function ViewSubjectsModal({
  open,
  onClose,
  context,
}: Readonly<{
  open: boolean
  onClose: () => void
  context: AnyRow | null
}>) {
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !context) return
    setLoading(true)
    listGroupYearRegulationSubjects(
      Number(context.courseGroupId ?? 0),
      Number(context.courseYearId ?? 0),
      Number(context.regulationId ?? 0),
    )
      .then((list) => setRows(Array.isArray(list) ? list : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [open, context])

  const heading = useMemo(() => {
    if (!context) return ''
    return `${context.universityCode ?? ''} / ${context.courseCode ?? ''} / ${context.groupCode ?? ''} / ${context.courseYearName ?? ''}`
  }, [context])

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">University Curriculum Regulation Subjects List</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border p-3 text-sm">
          <div><span className="font-medium">Course:</span> {heading}</div>
          <div><span className="font-medium">Regulation:</span> {context?.regulationName ?? '-'}</div>
        </div>

        <div className="app-card p-0 overflow-hidden">
          <DataTable
            rowData={rows}
            columnDefs={COLS}
            loading={loading}
            quickFilter
            quickFilterPlaceholder="Search subjects..."
            pagination
            paginationPageSize={10}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

