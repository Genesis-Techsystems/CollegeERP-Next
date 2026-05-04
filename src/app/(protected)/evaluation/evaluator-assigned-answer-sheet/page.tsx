'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ColDef, CellClickedEvent, ICellRendererParams } from 'ag-grid-community'
import { FileText } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'

interface AnswerPaper {
  answerId: number
  studentName: string
  rollNumber: string
  hallTicketNumber: string
  barcode: string
  isEvaluated: boolean
  marksAwarded: number | null
}

function evaluatedRenderer(p: ICellRendererParams<AnswerPaper>) {
  return <StatusBadge status={p.data?.isEvaluated ?? false} label={p.data?.isEvaluated ? 'Evaluated' : 'Pending'} />
}

export default function EvaluatorAssignedAnswerSheetPage() {
  const searchParams = useSearchParams()
  const subjectCode = searchParams.get('subjectCode') ?? ''
  const subjectName = searchParams.get('subjectName') ?? 'Assigned Answer Papers'

  const [answerPapers, setAnswerPapers] = useState<AnswerPaper[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const fetchAnswerPapers = useCallback(async () => {
    setLoading(true)
    try {
      setAnswerPapers([])
    } finally {
      setLoading(false)
    }
  }, [subjectCode])

  useEffect(() => {
    fetchAnswerPapers()
  }, [fetchAnswerPapers])

  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return answerPapers
    const lower = searchValue.toLowerCase()
    return answerPapers.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(lower))
    )
  }, [searchValue, answerPapers])

  const columnDefs = useMemo<ColDef<AnswerPaper>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { field: 'rollNumber', headerName: 'Roll Number', minWidth: 130 },
      { field: 'hallTicketNumber', headerName: 'Hall Ticket No', minWidth: 140 },
      { field: 'studentName', headerName: 'Student Name', minWidth: 180 },
      { field: 'barcode', headerName: 'Barcode', minWidth: 130 },
      {
        field: 'marksAwarded',
        headerName: 'Marks Awarded',
        minWidth: 130,
        valueFormatter: (p) => (p.value != null ? String(p.value) : '—'),
      },
      {
        field: 'isEvaluated',
        headerName: 'Status',
        minWidth: 110,
        cellRenderer: evaluatedRenderer,
      },
    ],
    []
  )

  const onCellClicked = useCallback((event: CellClickedEvent<AnswerPaper>) => {
    console.log('Row clicked:', event.data)
  }, [])

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title={`Assigned Answer Papers${subjectName ? ` (${subjectName})` : ''}`}
        subtitle="Review and evaluate assigned answer sheets"
      />

      <SearchInput
        className="w-full max-w-sm"
        placeholder="Search answer papers…"
        value={searchValue}
        onChange={setSearchValue}
      />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {!loading && filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">No answer papers assigned</p>
          </div>
        ) : (
          <DataTable
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            onCellClicked={onCellClicked}
            pagination
          />
        )}
      </div>
    </PageContainer>
  )
}
