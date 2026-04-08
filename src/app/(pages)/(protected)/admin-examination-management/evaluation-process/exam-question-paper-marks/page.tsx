'use client'

import { useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ExamQuestionPaperMarksPage() {
  const [search, setSearch] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [courseId, setCourseId] = useState('be')
  const [academicYearId, setAcademicYearId] = useState('2023-2024')
  const [examId, setExamId] = useState('sem-u23-feb-2024')
  const [regulationId, setRegulationId] = useState('r25')
  const [courseYearId, setCourseYearId] = useState('i-year-i-sem')
  const [subjectId, setSubjectId] = useState('u25bsn01mt')

  const initialRows = useMemo(
    () => [
      {
        id: 1,
        paperCode: 'QP-CSE-101',
        questionPaperTitle: 'Data Structures - Mid Term Question Paper',
        courseYearCode: 'IYEARISEM',
        setNo: 'A1',
        totalQuestions: 16,
        totalMarks: 75,
        passMarks: 26,
        preparedBy: 'Dr. S. Reddy',
        questionPaper: 'Uploaded',
        answerSheet: 'Uploaded',
        viewTemplate: 'Available',
        status: 'Active',
      },
      {
        id: 2,
        paperCode: 'QP-ECE-204',
        questionPaperTitle: 'Digital Logic - End Sem Question Paper',
        courseYearCode: 'IYEARISEM',
        setNo: 'B2',
        totalQuestions: 12,
        totalMarks: 70,
        passMarks: 24,
        preparedBy: 'Prof. K. Devi',
        questionPaper: 'Uploaded',
        answerSheet: 'Not Uploaded',
        viewTemplate: 'Available',
        status: 'Inactive',
      },
      {
        id: 3,
        paperCode: 'QP-EEE-301',
        questionPaperTitle: 'Power Systems - Regular Examination Paper',
        courseYearCode: 'IYEARISEM',
        setNo: 'C1',
        totalQuestions: 18,
        totalMarks: 80,
        passMarks: 28,
        preparedBy: 'Dr. A. Kumar',
        questionPaper: 'Uploaded',
        answerSheet: 'Uploaded',
        viewTemplate: 'Available',
        status: 'Active',
      },
    ],
    [],
  )
  const [rows, setRows] = useState(initialRows)
  const [form, setForm] = useState({
    questionPaperTitle: '',
    questionPaperCode: '',
    setNumber: '',
    totalQuestions: '',
    totalMarks: '',
    passMarks: '',
    preparedByEmp: 'Praveen Reddy',
    preparedDate: new Date().toISOString().slice(0, 10),
    questionPaperStatus: 'Prepared',
    statusComments: '',
    isActive: true,
    reason: 'active',
  })

  function resetForm() {
    setForm({
      questionPaperTitle: '',
      questionPaperCode: '',
      setNumber: '',
      totalQuestions: '',
      totalMarks: '',
      passMarks: '',
      preparedByEmp: 'Praveen Reddy',
      preparedDate: new Date().toISOString().slice(0, 10),
      questionPaperStatus: 'Prepared',
      statusComments: '',
      isActive: true,
      reason: 'active',
    })
  }

  function saveQuestionPaper() {
    if (!form.questionPaperTitle || !form.questionPaperCode) return
    const newRow = {
      id: rows.length + 1,
      paperCode: form.questionPaperCode,
      questionPaperTitle: form.questionPaperTitle,
      courseYearCode: 'IYEARISEM',
      setNo: form.setNumber || '-',
      totalQuestions: Number(form.totalQuestions || 0),
      totalMarks: Number(form.totalMarks || 0),
      passMarks: Number(form.passMarks || 0),
      preparedBy: form.preparedByEmp,
      questionPaper: 'Not Uploaded',
      answerSheet: 'Not Uploaded',
      viewTemplate: 'Available',
      status: form.isActive ? 'Active' : 'Inactive',
    }
    setRows((prev) => [newRow, ...prev])
    setOpenAddModal(false)
    resetForm()
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 82, pinned: 'left' },
      {
        field: 'questionPaperTitle',
        headerName: 'Question Paper Title',
        minWidth: 240,
        cellRenderer: (p: { data?: any }) => (
          <div className="py-1">
            <p className="font-medium text-[12px]">{p.data?.questionPaperTitle}</p>
            <p className="text-[11px] text-blue-700">
              View Questions | Print QP | Print QA | Edit
            </p>
          </div>
        ),
      },
      { field: 'paperCode', headerName: 'QP Code', minWidth: 110 },
      { field: 'courseYearCode', headerName: 'Course Year', minWidth: 120 },
      { field: 'setNo', headerName: 'Set No.', minWidth: 95 },
      { field: 'totalQuestions', headerName: 'Total Questions', minWidth: 130 },
      { field: 'totalMarks', headerName: 'Total Marks', minWidth: 120 },
      { field: 'passMarks', headerName: 'Pass Marks', minWidth: 110 },
      { field: 'preparedBy', headerName: 'Prepared By', minWidth: 130 },
      { field: 'questionPaper', headerName: 'Question Paper', minWidth: 130 },
      { field: 'answerSheet', headerName: 'Answer Sheet', minWidth: 120 },
      { field: 'viewTemplate', headerName: 'View Template', minWidth: 125 },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 105,
        cellRenderer: (p: { value?: string }) => (
          <Badge
            variant="outline"
            className={
              p.value === 'Active'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }
          >
            {p.value}
          </Badge>
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 190,
        cellRenderer: () => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7">Manage Question</Button>
            <Button size="sm" className="h-7">Upload QP & AS</Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Question Paper</h2>
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
              <Button size="sm" onClick={() => setOpenAddModal(true)}>+ Exam Question Paper</Button>
            </div>
          </div>
          <div className="p-4">
            <DataTable rowData={filteredRows} columnDefs={cols} pagination />
          </div>
        </div>
      )}

      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-[hsl(var(--primary))]">Create Question Paper</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-[13px]">
            <div className="md:col-span-3 space-y-1">
              <Label>Course</Label>
              <Input value="B.E" disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Academic Year</Label>
              <Input value={academicYearId} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-6 space-y-1">
              <Label>Exam</Label>
              <Input value="I SEMESTER (U23) Regular Examinations, February 2024" disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Regulation Id</Label>
              <Input value={regulationId.toUpperCase()} disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Course Years</Label>
              <Input value="IYEARISEM" disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Subject</Label>
              <Input value="U25BSN01MT-Matrices and Ordinary Differential Equations" disabled className="h-9 text-[12px]" />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Template</Label>
              <Input value="B.Tech DS Template A" disabled className="h-9 text-[12px]" />
            </div>

            <div className="md:col-span-12 border-t pt-3 mt-1" />

            <div className="md:col-span-6 space-y-1">
              <Label>Question Paper Title *</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperTitle}
                onChange={(e) => setForm((s) => ({ ...s, questionPaperTitle: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Question Paper Code *</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.questionPaperCode}
                onChange={(e) => setForm((s) => ({ ...s, questionPaperCode: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Set Number</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.setNumber}
                onChange={(e) => setForm((s) => ({ ...s, setNumber: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Total Questions</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalQuestions}
                onChange={(e) => setForm((s) => ({ ...s, totalQuestions: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Total Marks</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.totalMarks}
                onChange={(e) => setForm((s) => ({ ...s, totalMarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Pass Marks</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.passMarks}
                onChange={(e) => setForm((s) => ({ ...s, passMarks: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Prepared Employee</Label>
              <Input
                className="h-9 text-[12px]"
                value={form.preparedByEmp}
                onChange={(e) => setForm((s) => ({ ...s, preparedByEmp: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Prepared Date</Label>
              <Input
                type="date"
                className="h-9 text-[12px]"
                value={form.preparedDate}
                onChange={(e) => setForm((s) => ({ ...s, preparedDate: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Question Paper Status</Label>
              <Select
                value={form.questionPaperStatus}
                onValueChange={(v) => setForm((s) => ({ ...s, questionPaperStatus: v }))}
              >
                <SelectTrigger className="h-9 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prepared">Prepared</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-12 space-y-1">
              <Label>Status Comments</Label>
              <textarea
                className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.statusComments}
                onChange={(e) => setForm((s) => ({ ...s, statusComments: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(v) =>
                  setForm((s) => ({ ...s, isActive: !!v, reason: !!v ? 'active' : s.reason }))
                }
              />
              <Label>Active</Label>
            </div>
            {!form.isActive && (
              <div className="md:col-span-8 space-y-1">
                <Label>Reason</Label>
                <Input
                  className="h-9 text-[12px]"
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddModal(false)}>Close</Button>
            <Button onClick={saveQuestionPaper}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
