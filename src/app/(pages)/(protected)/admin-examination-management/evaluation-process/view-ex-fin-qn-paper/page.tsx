'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ViewFinalExamQuestionPaperPage() {
  const [search, setSearch] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [courseId, setCourseId] = useState('be')
  const [academicYearId, setAcademicYearId] = useState('2023-2024')
  const [examId, setExamId] = useState('sem-u23-feb-2024')

  const rows = useMemo(
    () => [
      {
        id: 1,
        subjectName: 'Matrices and Ordinary Differential Equations',
        subjectCode: 'U25BSN01MT',
        courseYearCode: 'IYEARISEM',
        courseGroup: 'CSE-A',
        questionPaper: 'Mid Term Question Paper - Set A',
        questionPaperStatus: 'Approved',
        publishedDate: '2026-04-07',
        publishedTime: '10:15:20',
        questionPaperPath: 'Uploaded',
        isPublished: false,
      },
      {
        id: 2,
        subjectName: 'Engineering Physics',
        subjectCode: 'U25BSN02PH',
        courseYearCode: 'IYEARISEM',
        courseGroup: 'CSE-B',
        questionPaper: 'Regular Exam Question Paper - Set B',
        questionPaperStatus: 'Approved',
        publishedDate: '2026-04-06',
        publishedTime: '16:05:10',
        questionPaperPath: 'Uploaded',
        isPublished: true,
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
      {
        headerName: 'Subject Name',
        minWidth: 260,
        cellRenderer: (p: { data?: any }) => (
          <span>
            {p.data?.subjectName} <span className="text-blue-700">({p.data?.subjectCode})</span>
          </span>
        ),
      },
      { field: 'courseYearCode', headerName: 'Course Year', minWidth: 120 },
      { field: 'courseGroup', headerName: 'Course Group', minWidth: 120 },
      { field: 'questionPaper', headerName: 'Question Paper', minWidth: 240 },
      {
        field: 'questionPaperStatus',
        headerName: 'Question Paper Status',
        minWidth: 150,
        cellRenderer: (p: { value?: string }) => (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">{p.value}</Badge>
        ),
      },
      { field: 'publishedDate', headerName: 'Published Date', minWidth: 130 },
      { field: 'publishedTime', headerName: 'Published Time', minWidth: 130 },
      { field: 'questionPaperPath', headerName: 'QuestionPaper Path', minWidth: 150 },
      {
        headerName: 'Actions',
        minWidth: 160,
        cellRenderer: (p: { data?: any }) =>
          p.data?.isPublished ? (
            <Button size="sm" variant="outline" className="h-7">
              Secure Publish
            </Button>
          ) : (
            <Button size="sm" className="h-7">
              Publish
            </Button>
          ),
      },
    ],
    [],
  )

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Publish Exam Question Paper</h2>
        </div>
        <div className="p-4 space-y-3 text-[13px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Course</label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="be">B.E</SelectItem>
                  <SelectItem value="btech">B.Tech</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Academic Year</label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023-2024">2023-2024</SelectItem>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <label className="text-[12px] text-muted-foreground">Exam</label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Exam" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-u23-feb-2024">I SEMESTER (U23) Regular Examinations, February 2024</SelectItem>
                  <SelectItem value="sem-u24-jun-2024">I SEMESTER (U24) Regular Examinations, June 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Button className="h-8 px-3 text-[12px] w-full" onClick={() => setHasFetched(true)}>
                Get List
              </Button>
            </div>
          </div>
        </div>
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="w-full max-w-sm">
              <SearchInput
                className="w-full"
                placeholder="Search"
                value={search}
                onChange={setSearch}
              />
            </div>
          </div>
          <div className="p-4">
            <DataTable rowData={filteredRows} columnDefs={cols} pagination />
          </div>
        </div>
      )}
    </div>
  )
}
