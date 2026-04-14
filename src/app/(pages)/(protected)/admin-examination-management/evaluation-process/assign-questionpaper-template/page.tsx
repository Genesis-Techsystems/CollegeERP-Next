'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef } from 'ag-grid-community'
import { Filter } from 'lucide-react'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Select as SearchableSelect } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getAssignQuestionPaperTemplateList,
  getEvaluationExamFilters,
  getEvaluationExamRestBundle,
  getQuestionPaperTemplateViewRows,
} from '@/services/evaluation-process'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, unknown>

export default function AssignQuestionPaperTemplatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [hasFetched, setHasFetched] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateTitle, setTemplateTitle] = useState('Template View')
  const [templateRows, setTemplateRows] = useState<AnyRow[]>([])
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () => dedupeBy(baseRows.filter((r) => num(r.fk_course_id) === num(courseId)), (r) => num(r.fk_academic_year_id)),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId) && num(r.fk_academic_year_id) === num(academicYearId)),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const courseYears = useMemo(() => dedupeBy(restRows, (r) => num(r.fk_course_year_id)), [restRows])
  const regulations = useMemo(() => dedupeBy(regulationRows, (r) => num(r.fk_regulation_id || r.regulationId)), [regulationRows])
  const examOptions = useMemo<SelectOption[]>(() => exams.map((e) => ({ value: String(num(e.fk_exam_id)), label: txt(e.exam_name) })), [exams])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getEvaluationExamFilters(employeeId).catch(() => [])
        setBaseRows(Array.isArray(list) ? list : [])
        setCourseId(num(list?.[0]?.fk_course_id) || null)
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null), [academicYears])
  useEffect(() => setExamId(num(exams[0]?.fk_exam_id) || null), [exams])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !examId || !academicYearId) return
      const bundle = await getEvaluationExamRestBundle({ courseId, examId, academicYearId, employeeId }).catch(() => ({ restFilters: [], regulations: [] }))
      const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : []
      const regs = Array.isArray(bundle.regulations) ? bundle.regulations : []
      setRestRows(rest)
      setRegulationRows(regs)
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null)
      setRegulationId(num(regs[0]?.fk_regulation_id || regs[0]?.regulationId) || null)
    }
    void loadRest()
  }, [courseId, examId, academicYearId, employeeId])

  async function getList() {
    if (!examId || !courseYearId || !regulationId) return
    setLoading(true)
    try {
      const list = await getAssignQuestionPaperTemplateList({
        examId,
        courseYearId,
        regulationId,
        subjectId: 0,
      })
      setRows(Array.isArray(list) ? list : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  function openAssign(row: AnyRow) {
    const existingTemplateAssignId = num(
      row.fk_exam_qp_template_id || row.exam_qp_template_assign_id || row.pk_exam_qp_template_assign_id,
    )
    const existingTemplateId = num(row.fk_exam_questionpaper_template_id || row.examQuestionPaperTemplateId)
    const params = new URLSearchParams({
      from: 'assign-questionpaper-template',
      examId: String(num(examId)),
      courseId: String(num(courseId)),
      academicYearId: String(num(academicYearId)),
      courseYearId: String(num(row.fk_course_year_id || courseYearId)),
      regulationId: String(num(row.fk_regulation_id || regulationId)),
      subjectId: String(num(row.fk_subject_id)),
      examName: txt(row.exam_name),
      subjectCode: txt(row.subject_code),
      subjectName: txt(row.subject_name),
      existingTemplateAssignId: String(existingTemplateAssignId),
      existingTemplateId: String(existingTemplateId),
    })
    router.push(
      `/admin-examination-management/evaluation-process/exam-question-paper-marks/assign-question-template?${params.toString()}`,
    )
  }

  async function openViewTemplate(row: AnyRow) {
    const templateId = num(row.fk_exam_questionpaper_template_id || row.fk_exam_qp_template_id)
    setTemplateTitle(`Template View - ${txt(row.subject_code) || txt(row.subject_name) || ''}`.trim())
    const details = await getQuestionPaperTemplateViewRows(templateId).catch(() => [])
    setTemplateRows(details)
    setTemplateOpen(true)
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => Object.values(r).some((v) => txt(v).toLowerCase().includes(q)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 72 },
      { headerName: 'Group Code', valueGetter: (p) => txt(p.data?.group_codes), minWidth: 140 },
      { headerName: 'Course Year Code', valueGetter: (p) => txt(p.data?.course_year_code), minWidth: 130 },
      { headerName: 'Regulation Code', valueGetter: (p) => txt(p.data?.regulation_code), minWidth: 130 },
      { headerName: 'Subject', valueGetter: (p) => `${txt(p.data?.subject_code)} - ${txt(p.data?.subject_name)}`, minWidth: 220 },
      {
        colId: 'actions',
        headerName: 'Actions',
        minWidth: 220,
        valueGetter: (p) => {
          const row = (p.data ?? {}) as AnyRow
          const hasTemplate = num(row.fk_exam_questionpaper_template_id || row.fk_exam_qp_template_id) > 0
          const canEdit = num(row.question_paper_exists) === 0
          if (hasTemplate && canEdit) return 'View / Edit'
          if (hasTemplate) return 'View'
          return 'Assign Template'
        },
        cellStyle: { color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer' },
      },
    ],
    [examId, courseId, academicYearId, courseYearId, regulationId],
  )

  function onCellClicked(event: { colDef?: { colId?: string }; data?: AnyRow }) {
    if (event.colDef?.colId !== 'actions' || !event.data) return
    const row = event.data
    const hasTemplate = num(row.fk_exam_questionpaper_template_id || row.fk_exam_qp_template_id) > 0
    if (hasTemplate) {
      void openViewTemplate(row)
      return
    }
    openAssign(row)
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Assign Template" subtitle="Assign question paper templates to subjects" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Assign Template</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((r) => <SelectItem key={String(num(r.fk_course_id))} value={String(num(r.fk_course_id))}>{txt(r.course_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Exam Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger><SelectContent>{academicYears.map((r) => <SelectItem key={String(num(r.fk_academic_year_id))} value={String(num(r.fk_academic_year_id))}>{txt(r.academic_year)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Exam Master</Label><SearchableSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(num(v) || null)} options={examOptions} placeholder="Search exam..." searchable /></div>
              <div className="md:col-span-2 space-y-1"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((r) => <SelectItem key={String(num(r.fk_regulation_id || r.regulationId))} value={String(num(r.fk_regulation_id || r.regulationId))}>{txt(r.regulation_code || r.regulationCode)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Course Years</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((r) => <SelectItem key={String(num(r.fk_course_year_id))} value={String(num(r.fk_course_year_id))}>{txt(r.course_year_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-12 flex justify-end"><Button type="button" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
      <div className="app-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="w-full max-w-sm">
            <SearchInput className="w-full" placeholder="Search" value={search} onChange={setSearch} />
          </div>
        </div>
        <div className="p-4">
          <DataTable rowData={filteredRows} columnDefs={cols} pagination loading={loading} onCellClicked={onCellClicked} />
        </div>
      </div>
      )}

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] text-[hsl(var(--primary))]">{templateTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-[14px]">
            {templateRows.map((row, i) => {
              const level = num(row.level1no)
              const group = num(row.groupno)
              const subgroup = num(row.subgroupno)
              const title = txt(row.QuestionTitle || row.question_title || row.title)
              const qCode = txt(row.questioncode || row.question_code)
              const qMarks = txt(row.individual_question_marks)
              const groupMarks = txt(row.question_marks || row.total_marks)
              const downText = txt(row.displaydowntext || row.display_down_text)

              return (
                <div key={`template-${i}-${qCode}-${title}`} className="grid grid-cols-12 gap-2 items-start">
                  {level > 0 && group === 0 && subgroup === 0 && (
                    <div className="col-span-12 text-center font-medium py-1">{title}</div>
                  )}
                  {level > 0 && group > 0 && subgroup === 0 && (
                    <>
                      <div className="col-span-1 font-semibold">{group}.</div>
                      <div className="col-span-9">{title}</div>
                      <div className="col-span-2 text-right font-semibold">{groupMarks}</div>
                    </>
                  )}
                  {qCode && (
                    <>
                      <div className="col-span-1" />
                      <div className="col-span-2">{qCode}</div>
                      <div className="col-span-7" />
                      <div className="col-span-2 text-right">{qMarks}</div>
                    </>
                  )}
                  {downText && <div className="col-span-12 text-center font-semibold py-1">{downText}</div>}
                </div>
              )
            })}
            {templateRows.length === 0 && <div className="text-[13px] text-muted-foreground">No template details found.</div>}
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setTemplateOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

