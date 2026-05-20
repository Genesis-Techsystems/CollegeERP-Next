'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ManageQuestionsPaperPage() {
  const [rows] = useState(
    () => [
      { section: 'Part A', questionNo: 'Q1', questionType: 'Short', maxMarks: 5, difficulty: 'Easy' },
      { section: 'Part A', questionNo: 'Q2', questionType: 'Short', maxMarks: 5, difficulty: 'Medium' },
      { section: 'Part B', questionNo: 'Q3', questionType: 'Long', maxMarks: 10, difficulty: 'Hard' },
    ],
  )

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
        width: 72,
        flex: 0,
        cellRenderer: () => (
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Edit question">
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Manage Questions Paper</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p>Configure question metadata and marks breakup for selected paper templates.</p>
          <DataTable
            rowData={rows}
            columnDefs={cols}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search questions…',
              pdfDocumentTitle: 'Manage Questions Paper',
            }}
            toolbarTrailing={
              <Button type="button" size="sm" className="h-[30px] px-3 text-[12px]">
                Add Question
              </Button>
            }
          />
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
