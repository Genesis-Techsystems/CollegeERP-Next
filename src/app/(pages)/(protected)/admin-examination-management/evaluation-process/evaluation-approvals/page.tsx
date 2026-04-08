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

export default function EvaluationApprovalsPage() {
  const [search, setSearch] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [courseId, setCourseId] = useState('be')
  const [examId, setExamId] = useState('sem-u23-feb-2024')
  const [evaluatorId, setEvaluatorId] = useState('eval-1')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const rows = useMemo(
    () => [
      {
        id: 1,
        omrSerialNo: 'OMR-000912',
        evaluatedTotalMarks: 68,
        answerSheetCheckDate: '2026-04-05',
        evaluationTimeSec: 4280,
        evaluationStatus: 'Evaluated',
        evaluatedAnswerPaperPath: 'Uploaded',
      },
      {
        id: 2,
        omrSerialNo: 'OMR-000913',
        evaluatedTotalMarks: 59,
        answerSheetCheckDate: '2026-04-05',
        evaluationTimeSec: 3820,
        evaluationStatus: 'Finalised',
        evaluatedAnswerPaperPath: 'Uploaded',
      },
      {
        id: 3,
        omrSerialNo: 'OMR-000914',
        evaluatedTotalMarks: 72,
        answerSheetCheckDate: '2026-04-06',
        evaluationTimeSec: 4510,
        evaluationStatus: 'Evaluated',
        evaluatedAnswerPaperPath: 'Uploaded',
      },
    ],
    [],
  )

  const evaluatableRows = useMemo(
    () => rows.filter((r) => r.evaluationStatus === 'Evaluated').map((r) => r.id),
    [rows],
  )

  const allEvaluatedSelected =
    evaluatableRows.length > 0 && evaluatableRows.every((id) => selectedIds.includes(id))

  function toggleOne(id: number, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((v) => v !== id)))
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? evaluatableRows : [])
  }

  function secondsToTime(total: number) {
    const h = String(Math.floor(total / 3600)).padStart(2, '0')
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
    const s = String(total % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      {
        headerName: '',
        width: 70,
        cellRenderer: (p: { data?: any }) => {
          const row = p.data
          if (!row || row.evaluationStatus !== 'Evaluated') return null
          return (
            <input
              type="checkbox"
              className="h-3 w-3 accent-[hsl(var(--primary))]"
              checked={selectedIds.includes(row.id)}
              onChange={(e) => toggleOne(row.id, e.target.checked)}
            />
          )
        },
      },
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'omrSerialNo', headerName: 'Omr Serial No', minWidth: 130 },
      { field: 'evaluatedTotalMarks', headerName: 'Evaluated Total Marks', minWidth: 150 },
      { field: 'answerSheetCheckDate', headerName: 'Answer Sheet Check Date', minWidth: 160 },
      {
        field: 'evaluationTimeSec',
        headerName: 'Evaluation Time',
        minWidth: 130,
        valueFormatter: (p) => secondsToTime(Number(p.value ?? 0)),
      },
      {
        field: 'evaluationStatus',
        headerName: 'Evaluation Status',
        minWidth: 130,
        cellRenderer: (p: { value?: string }) => {
          if (p.value === 'Finalised') {
            return <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Finalised</Badge>
          }
          return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Evaluated</Badge>
        },
      },
      { field: 'evaluatedAnswerPaperPath', headerName: 'Evaluated Answer Sheets', minWidth: 160 },
      {
        headerName: 'Actions',
        minWidth: 120,
        cellRenderer: (p: { data?: any }) =>
          p.data?.evaluationStatus === 'Finalised' ? (
            <span className="text-[12px] text-slate-600">Finalised</span>
          ) : (
            <button type="button" className="text-[12px] text-blue-700 hover:underline">
              Approve
            </button>
          ),
      },
    ],
    [selectedIds],
  )

  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Moderator Approvals</h2>
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
            <div className="md:col-span-3">
              <label className="text-[12px] text-muted-foreground">Evaluators</label>
              <Select value={evaluatorId} onValueChange={setEvaluatorId}>
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue placeholder="Evaluator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eval-1">Dr. S. Reddy</SelectItem>
                  <SelectItem value="eval-2">Prof. K. Devi</SelectItem>
                  <SelectItem value="eval-3">Dr. A. Kumar</SelectItem>
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
        <div className="app-card overflow-hidden mt-4">
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
              <div className="inline-flex items-center gap-3">
                <label
                  className={`inline-flex items-center gap-2 text-[12px] ${
                    allEvaluatedSelected ? 'text-[hsl(var(--primary))]' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-[hsl(var(--primary))]"
                    checked={allEvaluatedSelected}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  All
                </label>
                <Button size="sm" disabled={selectedIds.length === 0}>
                  Approve
                </Button>
              </div>
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
