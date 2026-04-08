'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ExamQuestionPapersPage() {
  const [search, setSearch] = useState('')

  const rows = useMemo(
    () => [
      {
        paperCode: 'QP-CSE-101',
        subjectName: 'Data Structures',
        examName: 'Sem End Apr-2026',
        totalMarks: 75,
        publishStatus: 'Published',
      },
      {
        paperCode: 'QP-ECE-204',
        subjectName: 'Digital Logic',
        examName: 'Sem End Apr-2026',
        totalMarks: 70,
        publishStatus: 'Draft',
      },
      {
        paperCode: 'QP-EEE-301',
        subjectName: 'Power Systems',
        examName: 'Sem End Apr-2026',
        totalMarks: 80,
        publishStatus: 'Published',
      },
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
      { field: 'paperCode', headerName: 'Paper Code', minWidth: 140 },
      { field: 'subjectName', headerName: 'Subject Name', minWidth: 180 },
      { field: 'examName', headerName: 'Exam Name', minWidth: 180 },
      { field: 'totalMarks', headerName: 'Total Marks', minWidth: 120 },
      {
        field: 'publishStatus',
        headerName: 'Publish Status',
        minWidth: 130,
        cellRenderer: (p: { value?: string }) =>
          p.value === 'Published' ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Published</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Draft</Badge>
          ),
      },
      {
        headerName: 'Action',
        minWidth: 220,
        cellRenderer: () => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7">View</Button>
            <Button size="sm" variant="outline" className="h-7">Edit</Button>
            <Button size="sm" className="h-7">Publish</Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Question Papers</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <p>Create, review, and publish question papers for active examinations.</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              className="w-full max-w-sm"
              placeholder="Search question papers..."
              value={search}
              onChange={setSearch}
            />
            <Button size="sm">Add Question Paper</Button>
          </div>
          <DataTable rowData={filteredRows} columnDefs={cols} pagination />
        </div>
      </div>
    </div>
  )
}
