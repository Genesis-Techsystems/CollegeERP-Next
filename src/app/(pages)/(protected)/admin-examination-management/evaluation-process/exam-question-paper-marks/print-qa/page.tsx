'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'

export default function PrintQaPage() {
  const [rows] = useState(
    () => [
      { paperCode: 'QP-CSE-101', subject: 'Data Structures', version: 'V1', generatedOn: '2026-04-07' },
      { paperCode: 'QP-ECE-204', subject: 'Digital Logic', version: 'V2', generatedOn: '2026-04-06' },
      { paperCode: 'QP-EEE-301', subject: 'Power Systems', version: 'V1', generatedOn: '2026-04-05' },
    ],
  )

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'paperCode', headerName: 'Paper Code', minWidth: 130 },
      { field: 'subject', headerName: 'Subject', minWidth: 170 },
      { field: 'version', headerName: 'Version', minWidth: 100 },
      { field: 'generatedOn', headerName: 'Generated On', minWidth: 130 },
      {
        headerName: 'Action',
        minWidth: 130,
        cellRenderer: () => <Button size="sm" className="h-7">Print</Button>,
      },
    ],
    [],
  )

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Print QA</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p>Preview printable QA sets and generate print-ready output.</p>
          <DataTable
            rowData={rows}
            columnDefs={cols}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search printable papers…',
              pdfDocumentTitle: 'Print QA',
            }}
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
