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

export default function ExamFinalQuestionPaperPage() {
  const [search, setSearch] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)

  const [courseId, setCourseId] = useState('be')
  const [academicYearId, setAcademicYearId] = useState('2023-2024')
  const [examId, setExamId] = useState('sem-u23-feb-2024')
  const [regulationId, setRegulationId] = useState('r25')
  const [courseYearId, setCourseYearId] = useState('i-year-i-sem')
  const [subjectId, setSubjectId] = useState('u25bsn01mt')

  const rows = useMemo(
    () => [
      {
        id: 1,
        courseYearCode: 'IYEARISEM',
        preparedBy: 'Dr. S. Reddy',
        questionPaperTitle: 'Data Structures - Mid Term Question Paper',
        questionPaperStatus: isFinalized ? 'Approved' : 'Prepared',
      },
      {
        id: 2,
        courseYearCode: 'IYEARISEM',
        preparedBy: 'Prof. K. Devi',
        questionPaperTitle: 'Digital Logic - End Sem Question Paper',
        questionPaperStatus: isFinalized ? 'Approved' : 'Prepared',
      },
      {
        id: 3,
        courseYearCode: 'IYEARISEM',
        preparedBy: 'Dr. A. Kumar',
        questionPaperTitle: 'Power Systems - Regular Examination Paper',
        questionPaperStatus: isFinalized ? 'Approved' : 'Prepared',
      },
    ],
    [isFinalized],
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'courseYearCode', headerName: 'Course Year', minWidth: 130 },
      { field: 'preparedBy', headerName: 'Prepared By', minWidth: 170 },
      { field: 'questionPaperTitle', headerName: 'Question Paper Title', minWidth: 280 },
      {
        field: 'questionPaperStatus',
        headerName: 'Question Paper Status',
        minWidth: 160,
        cellRenderer: (p: { value?: string }) =>
          p.value === 'Approved' ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Approved</Badge>
          ) : (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Prepared</Badge>
          ),
      },
    ],
    [],
  )

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Finalize Exam Question Paper</h2>
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
            <div className="md:col-span-6">
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
            <div className="md:col-span-2">
              <label className="text-[12px] text-muted-foreground">Regulation Id</label>
              <Select value={regulationId} onValueChange={setRegulationId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Regulation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="r25">R25</SelectItem>
                  <SelectItem value="r23">R23</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Course Years *</label>
              <Select value={courseYearId} onValueChange={setCourseYearId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Course Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="i-year-i-sem">IYEARISEM</SelectItem>
                  <SelectItem value="ii-year-i-sem">IIYEARISEM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <label className="text-[12px] text-muted-foreground">Subject</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="u25bsn01mt">U25BSN01MT-Matrices and Ordinary Differential Equations</SelectItem>
                  <SelectItem value="u25bsn02ph">U25BSN02PH-Engineering Physics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full max-w-sm">
                <SearchInput
                  className="w-full"
                  placeholder="Search"
                  value={search}
                  onChange={setSearch}
                />
              </div>
              {isFinalized ? (
                <Button size="sm" disabled className="bg-slate-500 hover:bg-slate-500 text-white">
                  Finalized
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIsFinalized(true)}>
                  Finalize
                </Button>
              )}
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
