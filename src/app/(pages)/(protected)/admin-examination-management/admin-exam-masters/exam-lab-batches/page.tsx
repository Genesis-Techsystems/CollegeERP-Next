'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table/TableCard'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import {
  getUnivExamFilters,
  getUnivExamRestNoTimetable,
  getLabSubjects,
  listExamLabBatches,
  createExamLabBatch,
  updateExamLabBatch,
} from '@/services/exam-lab-batches'
import { ChevronDown, Filter } from 'lucide-react'

type Row = Record<string, any>

// ── Column shape ─────────────────────────────────────────────────────────────
const COL_DEFS = {
  siNo:      { headerName: 'No.', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 60, flex: 0 } as ColDef,
  examType:  { field: 'examtypeCatdetCode', headerName: 'Exam Type', minWidth: 100 } as ColDef,
  batchName: { field: 'batchName', headerName: 'Lab Batch', flex: 1, minWidth: 160 } as ColDef,
  capacity:  { field: 'capacity', headerName: 'Capacity', width: 100, flex: 0 } as ColDef,
  sortOrder: { field: 'sortOrder', headerName: 'Sort Order', width: 100, flex: 0 } as ColDef,
  isActive:  { field: 'isActive', headerName: 'Status', width: 90, flex: 0 } as ColDef,
  actions:   { headerName: 'Actions', width: 90, flex: 0 } as ColDef,
}

// ── Pure renderers ────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(openEdit: (row: Row) => void) {
  return (p: ICellRendererParams) => (
    <Button variant="ghost" size="sm" onClick={() => p.data && openEdit(p.data)}>
      Edit
    </Button>
  )
}

export default function ExamLabBatchesPage() {
  const empId = 31754

  const [allFilters, setAllFilters] = useState<Row[]>([])
  const [restFilters, setRestFilters] = useState<Row[]>([])
  const [subjects, setSubjects] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterOpen, setFilterOpen] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [examTypeCode, setExamTypeCode] = useState('')
  const [batchName, setBatchName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getUnivExamFilters(empId).catch(() => [])
      const univ = data.filter((x) => x.flag === 'univ_exam_filters')
      setAllFilters(univ)
      const courseList = dedupeBy(univ, 'fk_course_id')
      if (courseList[0]?.fk_course_id) setCourseId(Number(courseList[0].fk_course_id))
      setLoading(false)
    }
    load()
  }, [])

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () => dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id')
      .sort((a, b) => Number(String(b.academic_year).split('-')[0]) - Number(String(a.academic_year).split('-')[0])),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () => dedupeBy(
      allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId) && Number(x.fk_academic_year_id) === Number(academicYearId)),
      'fk_exam_id',
    ),
    [allFilters, courseId, academicYearId],
  )

  useEffect(() => {
    if (academicYears[0]?.fk_academic_year_id) setAcademicYearId(Number(academicYears[0].fk_academic_year_id))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]?.fk_exam_id) setExamId(Number(exams[0].fk_exam_id))
  }, [exams])

  useEffect(() => {
    async function loadRest() {
      setRestFilters([])
      if (!courseId || !examId || !academicYearId) return
      const data = await getUnivExamRestNoTimetable({ courseId, examId, academicYearId, empId }).catch(() => [])
      const rest = data.filter((x) => x.flag === 'univ_exam_rest_filters' || x.flag === 'regulations')
      setRestFilters(rest)
    }
    loadRest()
  }, [courseId, examId, academicYearId])

  const colleges = useMemo(() => dedupeBy(restFilters.filter((x) => x.fk_college_id), 'fk_college_id'), [restFilters])
  const courseGroups = useMemo(() => dedupeBy(restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId)), 'fk_course_group_id'), [restFilters, collegeId])
  const courseYears = useMemo(() => dedupeBy(restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId) && Number(x.fk_course_group_id) === Number(courseGroupId)), 'fk_course_year_id'), [restFilters, collegeId, courseGroupId])
  const regulations = useMemo(() => dedupeBy(restFilters.filter((x) => x.flag === 'regulations'), 'fk_regulation_id'), [restFilters])

  useEffect(() => { if (colleges[0]?.fk_college_id) setCollegeId(Number(colleges[0].fk_college_id)) }, [colleges])
  useEffect(() => { if (courseGroups[0]?.fk_course_group_id) setCourseGroupId(Number(courseGroups[0].fk_course_group_id)) }, [courseGroups])
  useEffect(() => { if (courseYears[0]?.fk_course_year_id) setCourseYearId(Number(courseYears[0].fk_course_year_id)) }, [courseYears])
  useEffect(() => { if (regulations[0]?.fk_regulation_id) setRegulationId(Number(regulations[0].fk_regulation_id)) }, [regulations])

  useEffect(() => {
    async function loadSubjects() {
      setSubjects([])
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId || !regulationId) return
      const data = await getLabSubjects({
        collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId, empId,
      }).catch(() => [])
      const sub = data.filter((x) => x.flag === 'univ_exam_sub_uc')
      const ded = dedupeBy(sub, 'fk_subject_id')
      setSubjects(ded)
      if (ded[0]?.fk_subject_id) setSubjectId(Number(ded[0].fk_subject_id))
    }
    loadSubjects()
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId])

  async function getList() {
    setHasFetched(true)
    if (!collegeId || !examId || !courseYearId || !courseGroupId || !regulationId || !subjectId) return
    const data = await listExamLabBatches({ collegeId, examId, courseYearId, courseGroupId, regulationId, subjectId }).catch(() => [])
    setRows(Array.isArray(data) ? data : [])
  }

  const openAdd = useCallback(() => {
    setEditing(null)
    setExamTypeCode('Regular')
    setBatchName('')
    setCapacity('')
    setSortOrder('')
    setIsActive(true)
    setReason('active')
    setOpen(true)
  }, [])

  const openEdit = useCallback((r: Row) => {
    setEditing(r)
    setExamTypeCode(String(r.examtypeCatdetCode ?? 'Regular'))
    setBatchName(String(r.batchName ?? ''))
    setCapacity(String(r.capacity ?? ''))
    setSortOrder(String(r.sortOrder ?? ''))
    setIsActive(Boolean(r.isActive))
    setReason(String(r.reason ?? ''))
    setOpen(true)
  }, [])

  async function saveBatch() {
    if (!collegeId || !examId || !courseYearId || !courseGroupId || !regulationId || !subjectId || !batchName) return
    const payload = {
      college: { collegeId },
      examMaster: { examId },
      subject: { subjectId },
      courseGroup: { courseGroupId },
      courseYear: { courseYearId },
      Regulation: { regulationId },
      batchName,
      sortOrder: sortOrder ? Number(sortOrder) : null,
      capacity: capacity ? Number(capacity) : null,
      isActive,
      reason,
      examtypeCatdetCode: examTypeCode,
    }
    if (editing?.eaxmLabBatchId) {
      await updateExamLabBatch(Number(editing.eaxmLabBatchId), payload).catch(() => null)
    } else {
      await createExamLabBatch(payload).catch(() => null)
    }
    setOpen(false)
    await getList()
  }

  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => `${r.batchName ?? ''} ${r.examtypeCatdetCode ?? ''} ${r.capacity ?? ''}`.toLowerCase().includes(s))
  }, [rows, q])

  // ── Column assembly ─────────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.examType,
      COL_DEFS.batchName,
      COL_DEFS.capacity,
      COL_DEFS.sortOrder,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Lab Batches" subtitle="Manage examination lab batches" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Lab Batches</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
        <div className="px-3 py-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
          <div className="space-y-1 md:col-span-2"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))} disabled={loading}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((c) => <SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>{c.course_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger><SelectContent>{academicYears.map((a) => <SelectItem key={a.fk_academic_year_id} value={String(a.fk_academic_year_id)}>{a.academic_year}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-4"><Label>Exam Master</Label><Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Master" /></SelectTrigger><SelectContent>{exams.map((e) => <SelectItem key={e.fk_exam_id} value={String(e.fk_exam_id)}>{e.exam_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>College</Label><Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={c.fk_college_id} value={String(c.fk_college_id)}>{c.college_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group</Label><Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger><SelectContent>{courseGroups.map((g) => <SelectItem key={g.fk_course_group_id} value={String(g.fk_course_group_id)}>{g.group_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((y) => <SelectItem key={y.fk_course_year_id} value={String(y.fk_course_year_id)}>{y.course_year_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((r) => <SelectItem key={r.fk_regulation_id} value={String(r.fk_regulation_id)}>{r.regulation_code}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1 md:col-span-3"><Label>Subject</Label><Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.map((s) => <SelectItem key={s.fk_subject_id} value={String(s.fk_subject_id)}>{s.subject_name} ({s.subject_code})</SelectItem>)}</SelectContent></Select></div>
          <div className="md:col-span-1"><Button onClick={getList} className="h-8 px-3 text-[12px] w-full">Get List</Button></div>
        </div>
        )}
      </div>

      <TableCard
        headerLeft={
          <Input className="h-8 text-[12px] max-w-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        }
        headerRight={
          <Button className="h-8 text-[12px]" onClick={openAdd}>+ Add Exam Batch</Button>
        }
      >
        <DataTable rowData={filteredRows} columnDefs={columnDefs} loading={loading} pagination />
      </TableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden" hideClose>
          <DialogHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
            <DialogTitle className="text-[15px] text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Lab Batch' : 'Add Exam Lab Batch'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Exam Type</Label><Select value={examTypeCode || undefined} onValueChange={setExamTypeCode}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Type" /></SelectTrigger><SelectContent><SelectItem value="Regular">Regular</SelectItem><SelectItem value="Supple">Supple</SelectItem><SelectItem value="Internal">Internal</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Batch Name</Label><Input className="h-8 text-[12px]" value={batchName} onChange={(e) => setBatchName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Capacity</Label><Input className="h-8 text-[12px]" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
            <div className="space-y-1"><Label>Sort Order</Label><Input className="h-8 text-[12px]" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
            {/* Status/Reason removed per latest UX requirement */}
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={saveBatch}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function dedupeBy<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const val = String(item?.[key] ?? '')
    if (!val || seen.has(val)) continue
    seen.add(val)
    out.push(item)
  }
  return out
}
