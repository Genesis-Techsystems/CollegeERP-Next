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
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import {
  getUnivExamFilters,
  getUnivExamRestNoTimetable,
  getLabSubjects,
  listExamLabBatchExamTypes,
  listExamLabBatches,
  createExamLabBatch,
  updateExamLabBatch,
} from '@/services/exam-lab-batches'
import { Checkbox } from '@/components/ui/checkbox'
import { GlobalFilterBar, GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Building2, BookOpen, Calendar, GraduationCap, PencilIcon, Plus, ScrollText } from 'lucide-react'

type Row = Record<string, any>

// ── Column shape ─────────────────────────────────────────────────────────────
function dashIfEmpty(value: unknown): string {
  if (value == null) return '—'
  const s = String(value).trim()
  return s === '' ? '—' : s
}

const COL_DEFS = {
  siNo:      { headerName: 'S.NO', valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1, width: 60, flex: 0 } as ColDef,
  examType:  {
    field: 'examtypeCatdetCode',
    headerName: 'Exam Type',
    minWidth: 100,
    valueFormatter: (p) => dashIfEmpty(p.value),
  } as ColDef,
  batchName: {
    field: 'batchName',
    headerName: 'Lab Batch',
    flex: 1,
    minWidth: 160,
    valueFormatter: (p) => dashIfEmpty(p.value),
  } as ColDef,
  capacity:  {
    field: 'capacity',
    headerName: 'Capacity',
    width: 100,
    flex: 0,
    valueFormatter: (p) => dashIfEmpty(p.value),
  } as ColDef,
  sortOrder: {
    field: 'sortOrder',
    headerName: 'Sort Order',
    width: 100,
    flex: 0,
    valueFormatter: (p) => dashIfEmpty(p.value),
  } as ColDef,
  isActive:  { field: 'isActive', headerName: 'Status', width: 90, flex: 0 } as ColDef,
  actions:   { headerName: 'Actions', width: 90, flex: 0 } as ColDef,
}

// ── Pure renderers ────────────────────────────────────────────────────────────
function statusRenderer(p: ICellRendererParams) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(openEdit: (row: Row) => void) {
  return (p: ICellRendererParams) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Edit exam batch"
      title="Edit"
      onClick={() => p.data && openEdit(p.data)}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function ExamLabBatchesPage() {
  const empId = 31754

  const [allFilters, setAllFilters] = useState<Row[]>([])
  const [restFilters, setRestFilters] = useState<Row[]>([])
  const [subjects, setSubjects] = useState<Row[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
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
  const [examFeeTypes, setExamFeeTypes] = useState<Row[]>([])
  const [examTypeId, setExamTypeId] = useState<number | null>(null)
  const [batchName, setBatchName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState<string>('active')
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setSaveError('')
    setFieldErrors({})
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [data, types] = await Promise.all([
        getUnivExamFilters(empId).catch(() => []),
        listExamLabBatchExamTypes().catch(() => []),
      ])
      const univ = data.filter((x) => x.flag === 'univ_exam_filters')
      setAllFilters(univ)
      setExamFeeTypes(Array.isArray(types) ? types : [])
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
  const selectedExamRow = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)) ?? null,
    [exams, examId],
  )
  const availableExamTypes = useMemo(() => {
    const exam = selectedExamRow
    if (!exam) return []
    return examFeeTypes.filter((t) => {
      const code = String(t.generalDetailCode ?? '').toLowerCase()
      if (code === 'regular') return Boolean(exam.is_regular_exam)
      if (code === 'supple') return Boolean(exam.is_supply_exam)
      if (code === 'internal') return Boolean(exam.is_internal_exam)
      return false
    })
  }, [examFeeTypes, selectedExamRow])

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
      setSubjectId(null)
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId || !regulationId) return
      const data = await getLabSubjects({
        collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId, empId,
      }).catch(() => [])
      const sub = data.filter((x) => x.flag === 'univ_exam_sub_uc')
      const ded = dedupeBy(sub, 'fk_subject_id')
      setSubjects(ded)
      setSubjectId(ded[0]?.fk_subject_id ? Number(ded[0].fk_subject_id) : null)
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
    if (!collegeId || !examId || !courseYearId || !courseGroupId || !regulationId) return
    setEditing(null)
    setSaveError('')
    setFieldErrors({})
    setExamTypeId(availableExamTypes[0]?.generalDetailId ? Number(availableExamTypes[0].generalDetailId) : null)
    setBatchName('')
    setCapacity('')
    setSortOrder('')
    setIsActive(true)
    setReason('active')
    if (!subjectId && subjects[0]?.fk_subject_id) {
      setSubjectId(Number(subjects[0].fk_subject_id))
    }
    setOpen(true)
  }, [availableExamTypes, collegeId, courseGroupId, courseYearId, examId, regulationId, subjectId, subjects])

  const openEdit = useCallback((r: Row) => {
    setSaveError('')
    setFieldErrors({})
    setEditing(r)
    const rowTypeId = Number(r.examtypeCatdetId ?? r.fk_examtype_catdet_id ?? 0)
    if (rowTypeId > 0) {
      setExamTypeId(rowTypeId)
    } else {
      const rowCode = String(r.examtypeCatdetCode ?? r.examTypeCatCode ?? '').toLowerCase()
      const matched = availableExamTypes.find((t) => String(t.generalDetailCode ?? '').toLowerCase() === rowCode)
      setExamTypeId(matched?.generalDetailId ? Number(matched.generalDetailId) : null)
    }
    setBatchName(String(r.batchName ?? ''))
    setCapacity(String(r.capacity ?? ''))
    setSortOrder(String(r.sortOrder ?? ''))
    setIsActive(Boolean(r.isActive))
    setReason(String(r.reason ?? (r.isActive ? 'active' : '')))
    setOpen(true)
  }, [availableExamTypes])

  async function saveBatch() {
    setSaveError('')
    const cleanBatchName = batchName.trim()
    const nextErrors: Record<string, string> = {}
    if (!examTypeId) nextErrors.examTypeId = 'Exam Type is required.'
    if (!cleanBatchName) nextErrors.batchName = 'Batch Name is required.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!collegeId || !examId || !courseYearId || !courseGroupId || !regulationId || !subjectId) {
      setSaveError('Please select all filters before saving.')
      return
    }
    setIsSaving(true)
    const selectedExamType = availableExamTypes.find((t) => Number(t.generalDetailId) === Number(examTypeId))
    const examTypeCode = String(selectedExamType?.generalDetailCode ?? '')
    const payload = {
      // Legacy backend expects flat ids; keep nested relations too for compatibility.
      collegeId,
      examMasterId: examId,
      subjectId,
      courseGroupId,
      courseYearId,
      regulationId,
      college: { collegeId },
      examMaster: { examId },
      subject: { subjectId },
      courseGroup: { courseGroupId },
      courseYear: { courseYearId },
      Regulation: { regulationId },
      batchName: cleanBatchName,
      sortOrder: sortOrder ? Number(sortOrder) : null,
      capacity: capacity ? Number(capacity) : null,
      isActive,
      reason: isActive ? 'active' : (reason || '').trim(),
      examtypeCatdetId: examTypeId,
      examtypeCatdetCode: examTypeCode,
    }
    try {
      const editId = Number(editing?.eaxmLabBatchId ?? editing?.examLabBatchId ?? 0)
      if (editId > 0) {
        await updateExamLabBatch(editId, { ...payload, eaxmLabBatchId: editId })
      } else {
        await createExamLabBatch(payload)
      }
      closeModal()
      await getList()
    } catch (err: any) {
      setSaveError(err?.message || 'Unable to save exam batch. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const canManageBatches = Boolean(
    collegeId && examId && courseYearId && courseGroupId && regulationId && subjectId,
  )

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
    <PageContainer className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Exam Lab Batches</h2>

      <GlobalFilterBar title="Exam Lab Batches">
        <GlobalFilterBarRow columns={3}>
          <GlobalFilterField label="Course" icon={GraduationCap}>
            <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))} disabled={loading}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>{c.course_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Exam Year" icon={Calendar}>
            <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
              <SelectContent>{academicYears.map((a) => <SelectItem key={a.fk_academic_year_id} value={String(a.fk_academic_year_id)}>{a.academic_year}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Exam Master" icon={ScrollText}>
            <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Exam Master" /></SelectTrigger>
              <SelectContent>{exams.map((e) => <SelectItem key={e.fk_exam_id} value={String(e.fk_exam_id)}>{e.exam_name}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
        </GlobalFilterBarRow>
        <GlobalFilterBarRow columns={3}>
          <GlobalFilterField label="College" icon={Building2}>
            <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="College" /></SelectTrigger>
              <SelectContent>{colleges.map((c) => <SelectItem key={c.fk_college_id} value={String(c.fk_college_id)}>{c.college_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Course Group" icon={BookOpen}>
            <Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Course Group" /></SelectTrigger>
              <SelectContent>{courseGroups.map((g) => <SelectItem key={g.fk_course_group_id} value={String(g.fk_course_group_id)}>{g.group_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Course Year" icon={GraduationCap}>
            <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
              <SelectContent>{courseYears.map((y) => <SelectItem key={y.fk_course_year_id} value={String(y.fk_course_year_id)}>{y.course_year_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
        </GlobalFilterBarRow>
        <GlobalFilterBarRow columns={3}>
          <GlobalFilterField label="Regulation" icon={ScrollText}>
            <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Regulation" /></SelectTrigger>
              <SelectContent>{regulations.map((r) => <SelectItem key={r.fk_regulation_id} value={String(r.fk_regulation_id)}>{r.regulation_code}</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Subject" icon={BookOpen}>
            <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.fk_subject_id} value={String(s.fk_subject_id)}>{s.subject_name} ({s.subject_code})</SelectItem>)}</SelectContent>
            </Select>
          </GlobalFilterField>
          <GlobalFilterField label="Action" className="global-filter-field--action">
            <Button onClick={getList} className="h-[30px] px-3 text-[12px] shrink-0">Get List</Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      </GlobalFilterBar>

      {hasFetched && (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={loading}
            pagination
            paginationPageSize={10}
            title=""
            subtitle=""
            toolbarLeading={<span />}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search exam batches…',
              pdfDocumentTitle: 'Exam Lab Batches',
            }}
            toolbarTrailing={(
              <Button
                size="sm"
                onClick={openAdd}
                disabled={!canManageBatches}
                className="h-[30px] px-3 text-[12px]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Exam Batch
              </Button>
            )}
          />
        </TableCard>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal()
        }}
      >
        <DialogContent
          className="max-w-xl p-0 overflow-hidden"
          closeOnOutsideClick={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-4 py-3 border-b border-border bg-muted/40 pr-12">
            <DialogTitle className="text-[15px] text-[hsl(var(--primary))]">
              {editing ? 'Edit Exam Lab Batch' : 'Add Exam Lab Batch'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[12px]">
                Exam Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={examTypeId ? String(examTypeId) : undefined}
                onValueChange={(v) => {
                  setExamTypeId(Number(v))
                  if (fieldErrors.examTypeId) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.examTypeId
                      return next
                    })
                  }
                }}
              >
                <SelectTrigger className="h-8 text-[12px]" aria-invalid={Boolean(fieldErrors.examTypeId)}>
                  <SelectValue placeholder="Select exam type" />
                </SelectTrigger>
                <SelectContent>
                  {availableExamTypes.map((t) => (
                    <SelectItem key={String(t.generalDetailId)} value={String(t.generalDetailId)}>
                      {String(t.generalDetailCode ?? '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.examTypeId ? (
                <p className="text-[11px] text-destructive">{fieldErrors.examTypeId}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">
                Batch Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-8 text-[12px]"
                placeholder="Enter batch name"
                value={batchName}
                aria-invalid={Boolean(fieldErrors.batchName)}
                onChange={(e) => {
                  setBatchName(e.target.value)
                  if (fieldErrors.batchName) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.batchName
                      return next
                    })
                  }
                }}
              />
              {fieldErrors.batchName ? (
                <p className="text-[11px] text-destructive">{fieldErrors.batchName}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Capacity</Label>
              <Input
                className="h-8 text-[12px]"
                type="number"
                placeholder="Enter capacity"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Sort Order</Label>
              <Input
                className="h-8 text-[12px]"
                type="number"
                placeholder="Enter sort order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <div
              role="button"
              tabIndex={0}
              className="flex h-8 min-w-0 cursor-pointer items-center gap-2 self-end"
              onClick={() => {
                const next = !isActive
                setIsActive(next)
                setReason(next ? 'active' : '')
              }}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  const next = !isActive
                  setIsActive(next)
                  setReason(next ? 'active' : '')
                }
              }}
            >
              <Checkbox
                checked={isActive}
                onCheckedChange={(v) => {
                  const next = !!v
                  setIsActive(next)
                  setReason(next ? 'active' : '')
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-[12px] text-slate-700 select-none">Active</span>
            </div>
            {!isActive && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-[12px]">Reason</Label>
                <Input
                  className="h-8 text-[12px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for deactivation"
                />
              </div>
            )}
          </div>
          <DialogFooter className="px-4 pb-4">
            {saveError ? <p className="mr-auto text-[12px] text-red-600">{saveError}</p> : null}
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={saveBatch} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
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
