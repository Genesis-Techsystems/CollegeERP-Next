'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'

export default function ManageQuestionsPaperPage() {
  const [search, setSearch] = useState('')
  const rows = useMemo(
    () => [
      { section: 'Part A', questionNo: 'Q1', questionType: 'Short', maxMarks: 5, difficulty: 'Easy' },
      { section: 'Part A', questionNo: 'Q2', questionType: 'Short', maxMarks: 5, difficulty: 'Medium' },
      { section: 'Part B', questionNo: 'Q3', questionType: 'Long', maxMarks: 10, difficulty: 'Hard' },
    ],
    [],
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'section', headerName: 'Section', minWidth: 110 },
      { field: 'questionNo', headerName: 'Question No', minWidth: 120 },
      { field: 'questionType', headerName: 'Type', minWidth: 120 },
      { field: 'maxMarks', headerName: 'Max Marks', minWidth: 120 },
      { field: 'difficulty', headerName: 'Difficulty', minWidth: 120 },
      {
        headerName: 'Action',
        minWidth: 120,
        cellRenderer: () => <Button size="sm" variant="outline" className="h-7">Edit</Button>,
      },
    ],
    [],
  )

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Manage Questions Paper</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p>Configure question metadata and marks breakup for selected paper templates.</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              className="w-full max-w-sm"
              placeholder="Search questions..."
              value={search}
              onChange={setSearch}
            />
            <Button size="sm">Add Question</Button>
          </div>
          <DataTable rowData={filteredRows} columnDefs={cols} pagination />
          <Link
            href="/admin-examination-management/evaluation-process/exam-question-paper-marks"
            className="text-blue-700 hover:underline"
          >
            Back to Exam Question Paper Marks
          </Link>
        </div>
      </div>
    </div>
  )
}
