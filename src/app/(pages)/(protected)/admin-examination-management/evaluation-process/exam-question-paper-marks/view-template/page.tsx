'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'

export default function ViewTemplatePage() {
  const [rows] = useState(
    () => [
      { templateCode: 'TPL-CSE-A', templateName: 'CSE Core Template A', sections: 3, totalMarks: 75 },
      { templateCode: 'TPL-ECE-B', templateName: 'ECE Core Template B', sections: 2, totalMarks: 70 },
      { templateCode: 'TPL-EEE-C', templateName: 'EEE Core Template C', sections: 4, totalMarks: 80 },
    ],
  )

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'templateCode', headerName: 'Template Code', minWidth: 140 },
      { field: 'templateName', headerName: 'Template Name', minWidth: 220 },
      { field: 'sections', headerName: 'Sections', minWidth: 110 },
      { field: 'totalMarks', headerName: 'Total Marks', minWidth: 120 },
    ],
    [],
  )

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">View Template</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p>Browse and inspect available question paper templates.</p>
          <DataTable
            rowData={rows}
            columnDefs={cols}
            pagination
            toolbar={{
              search: true,
              searchPlaceholder: 'Search templates…',
              pdfDocumentTitle: 'View Template',
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
