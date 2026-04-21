'use client'

import { useEffect, useMemo, useState } from 'react'
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
  assignMultipleUpdateEvaluationAssignmentRevision,
  getReevaluationMultiAssignBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, unknown>

export default function ReEvaluationMultiAssignPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [omrSearch, setOmrSearch] = useState('')
  const [detailSearch, setDetailSearch] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRows, setDetailRows] = useState<AnyRow[]>([])
  const [detailTitle, setDetailTitle] = useState('Student Answer Sheets List')

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [summaryRows, setSummaryRows] = useState<AnyRow[]>([])
  const [evaluatorOmrRows, setEvaluatorOmrRows] = useState<AnyRow[]>([])
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<number | null>(null)
  const [selectedOmr, setSelectedOmr] = useState<string[]>([])

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

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
  const regulations = useMemo(
    () => dedupeBy(restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)), (r) => num(r.fk_regulation_id)),
    [restRows, courseYearId],
  )
  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)), [subjectRows])

  const examOptions = useMemo<SelectOption[]>(
    () => exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: txt(r.exam_name) })),
    [exams],
  )
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const rows = await getRegSupBaseFilters(employeeId)
        setBaseRows(rows)
        setCourseId(num(rows[0]?.fk_course_id) || null)
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null), [academicYears])
  useEffect(() => setExamId(num(exams[0]?.fk_exam_id) || null), [exams])
  useEffect(() => setRegulationId(num(regulations[0]?.fk_regulation_id) || null), [regulations])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const rest = await getRegSupRestFilters({ courseId, academicYearId, examId, employeeId })
      setRestRows(rest)
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null)
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId) return
      const sub = await getRegSupSubjectFilters({
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
        employeeId,
      })
      setSubjectRows(sub)
      setSubjectId(num(sub[0]?.fk_subject_id) || null)
    }
    void loadSubjects()
  }, [courseId, academicYearId, examId, courseYearId, regulationId, employeeId])

  async function getList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    setLoading(true)
    try {
      const data = await getReevaluationMultiAssignBundle({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
      })
      setEvaluatorRows(data.evaluators)
      setSummaryRows(data.summary)
      setEvaluatorOmrRows(data.evaluatorOmrRows)
      setStudentRows(data.students.filter((r) => num(r.is_answerpaper_uploaded) === 1))
      setSelectedEvaluatorId(null)
      setSelectedOmr([])
    } finally {
      setLoading(false)
    }
  }

  const totals = summaryRows[0] ?? {}
  const totalStudents = num(totals.totalStudents)
  const uploaded = num(totals.NoOfAnswerpapersUploaded)
  const unassigned = num(totals.UnAssinged)
  const assigned = Math.max(uploaded - unassigned, 0)

  const filteredEvaluatorRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return evaluatorRows
    return evaluatorRows.filter((r) => Object.values(r).some((v) => txt(v).toLowerCase().includes(q)))
  }, [evaluatorRows, search])

  function evaluatorProfileId(row: AnyRow): number {
    return num(row.pk_exam_evaluator_profile_id || row.fk_exam_evaluator_profile_id || row.exam_evaluator_profile_id)
  }

  const selectedEvaluator = useMemo(
    () => evaluatorRows.find((r) => evaluatorProfileId(r) === num(selectedEvaluatorId)) ?? null,
    [evaluatorRows, selectedEvaluatorId],
  )

  const filteredStudents = useMemo(() => {
    const q = omrSearch.trim().toLowerCase()
    if (!q) return studentRows
    return studentRows.filter((r) => txt(r.omr_serial_no).toLowerCase().includes(q))
  }, [studentRows, omrSearch])

  const preparedRows = useMemo(
    () =>
      filteredStudents
        .map((r) => {
          const excluded = txt(r.exclude_fk_exam_evaluator_profile_id)
            .split(',')
            .map((v) => num(v))
            .filter((v) => v > 0)
          const disabledByExclude = selectedEvaluatorId ? excluded.includes(num(selectedEvaluatorId)) : false
          const disabledByOmr = num(r.disable_omr) === 1
          return { ...r, disabled: disabledByExclude || disabledByOmr, excludedByEvaluator: disabledByExclude }
        })
        .sort((a, b) => {
          if (Boolean(a.disabled) !== Boolean(b.disabled)) return a.disabled ? 1 : -1
          return num(a.omr_mapped) - num(b.omr_mapped)
        }),
    [filteredStudents, selectedEvaluatorId],
  )

  const availableRows = useMemo(() => preparedRows.filter((r) => !r.disabled), [preparedRows])
  const availableOmr = useMemo(() => availableRows.map((r) => txt(r.omr_serial_no)).filter(Boolean), [availableRows])
  const selectedCount = selectedOmr.length
  const allAvailableSelected = availableOmr.length > 0 && availableOmr.every((omr) => selectedOmr.includes(omr))
  const alreadyAssignedRows = useMemo(() => preparedRows.filter((r) => r.excludedByEvaluator), [preparedRows])

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedOmr([])
      return
    }
    setSelectedOmr(availableOmr)
  }

  function toggleOmr(omr: string, checked: boolean) {
    setSelectedOmr((prev) => (checked ? [...new Set([...prev, omr])] : prev.filter((v) => v !== omr)))
  }

  async function assign() {
    if (!selectedEvaluatorId || selectedOmr.length === 0 || !examId || !subjectId || !courseYearId) return
    setLoading(true)
    try {
      await assignMultipleUpdateEvaluationAssignmentRevision({
        profileId: selectedEvaluatorId,
        omrSerialNosCsv: selectedOmr.join(','),
        examId,
        subjectId,
        courseYearId,
      })
      await getList()
    } finally {
      setLoading(false)
    }
  }

  function openDetail(row: AnyRow, type: 'AssignedList' | 'CompletedList' | 'DueList') {
    const id = evaluatorProfileId(row)
    const all = evaluatorOmrRows.filter((r) => evaluatorProfileId(r) === id && txt(r.omr_serial_no))
    let rows = all
    if (type === 'CompletedList') rows = all.filter((r) => txt(r.evaluated_totalmarks))
    else if (type === 'DueList') rows = all.filter((r) => !txt(r.evaluated_totalmarks))
    setDetailRows(rows)
    let title = 'Assigned Answer Sheets'
    if (type === 'CompletedList') title = 'Evaluated Answer Sheets'
    else if (type === 'DueList') title = 'Due Answer Sheets'
    setDetailTitle(title)
    setDetailSearch('')
    setDetailOpen(true)
  }

  const filteredDetailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase()
    if (!q) return detailRows
    return detailRows.filter((r) => txt(r.omr_serial_no).toLowerCase().includes(q))
  }, [detailRows, detailSearch])

  const columns = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70 },
      { headerName: 'Evaluator Name', valueGetter: (p) => txt(p.data?.evaluator_name), minWidth: 180 },
      { headerName: 'Evaluator Email', valueGetter: (p) => txt(p.data?.email), minWidth: 200 },
      {
        colId: 'assignedSheets',
        headerName: 'Assigned Answer Sheets',
        valueGetter: (p) => num(p.data?.no_of_students_assigned),
        minWidth: 170,
        cellStyle: { color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer' },
      },
      {
        colId: 'evaluatedSheets',
        headerName: 'Evaluated Answer Sheets',
        valueGetter: (p) => num(p.data?.no_of_evaluations_completed),
        minWidth: 170,
        cellStyle: { color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer' },
      },
      {
        colId: 'dueSheets',
        headerName: 'Due Answer Sheets',
        valueGetter: (p) => num(p.data?.no_of_students_assigned) - num(p.data?.no_of_evaluations_completed),
        minWidth: 150,
        cellStyle: { color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer' },
      },
    ],
    [evaluatorOmrRows],
  )

  function handleTableCellClick(event: {
    colDef?: { colId?: string; field?: string; headerName?: string }
    column?: { getColId?: () => string }
    data?: AnyRow
  }) {
    const colId = event.colDef?.colId ?? event.colDef?.field ?? event.column?.getColId?.() ?? ''
    const header = txt(event.colDef?.headerName).toLowerCase()
    if (!event.data) return
    if (colId === 'assignedSheets' || header.includes('assigned answer sheets')) openDetail(event.data, 'AssignedList')
    else if (colId === 'evaluatedSheets' || header.includes('evaluated answer sheets')) openDetail(event.data, 'CompletedList')
    else if (colId === 'dueSheets' || header.includes('due answer sheets')) openDetail(event.data, 'DueList')
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Re-Evaluation Multi Assign" subtitle="Assign re-evaluation answer papers to evaluators" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Re-Evaluation Multi Assign</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((r) => <SelectItem key={String(num(r.fk_course_id))} value={String(num(r.fk_course_id))}>{txt(r.course_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Academic Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((r) => <SelectItem key={String(num(r.fk_academic_year_id))} value={String(num(r.fk_academic_year_id))}>{txt(r.academic_year)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Exam</Label><SearchableSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(num(v) || null)} options={examOptions} placeholder="Search exam..." searchable /></div>
              <div className="md:col-span-2 space-y-1"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((r) => <SelectItem key={String(num(r.fk_course_year_id))} value={String(num(r.fk_course_year_id))}>{txt(r.course_year_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((r) => <SelectItem key={String(num(r.fk_regulation_id))} value={String(num(r.fk_regulation_id))}>{txt(r.regulation_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Subject</Label><SearchableSelect value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(num(v) || null)} options={subjectOptions} placeholder="Search subjects..." searchable /></div>
              <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      {evaluatorRows.length > 0 && (
        <>
          <div className="app-card p-3 text-[13px]">
            <span className="font-semibold">Total Students:</span> {totalStudents} | <span className="font-semibold">No.Of AnswerPapers Uploaded:</span> {uploaded} |{' '}
            <span className="font-semibold">UnAssigned:</span> {unassigned} | <span className="font-semibold">Assigned:</span> {assigned} |{' '}
            <span className="font-semibold">No of Evaluators:</span> {evaluatorRows.length}
          </div>

          <div className="app-card p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3 border rounded-md p-2">
                <p className="text-[13px] font-semibold mb-2">Evaluators / (Assigned)</p>
                <div className="space-y-1 max-h-[280px] overflow-auto">
                  {evaluatorRows.map((row, i) => {
                    const id = evaluatorProfileId(row)
                    return (
                      <label key={`e-${id}-${i}`} className="flex items-center gap-2 text-[12px]">
                        <input type="radio" checked={num(selectedEvaluatorId) === id} onChange={() => { setSelectedEvaluatorId(id); setSelectedOmr([]) }} />
                        <span title={`${txt(row.evaluator_name)} / ${num(row.no_of_students_assigned)}`}>
                          {txt(row.evaluator_name)} / ({num(row.no_of_students_assigned)})
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="md:col-span-5 border rounded-md p-2">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <SearchInput value={omrSearch} onChange={setOmrSearch} placeholder="Search..." className="max-w-xs" />
                  <span className="text-[12px] text-blue-700 font-semibold">Selected: {selectedCount}</span>
                </div>
                <table className="w-full text-[12px] border rounded">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-2 py-1 text-left">
                        <input type="checkbox" checked={allAvailableSelected} onChange={(e) => toggleAll(e.target.checked)} /> All
                      </th>
                      <th className="px-2 py-1 text-left">Serial No</th>
                      <th className="px-2 py-1 text-left">Answer Papers Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preparedRows.map((row, i) => {
                      const omr = txt(row.omr_serial_no)
                      const checked = selectedOmr.includes(omr)
                      const disabled = Boolean(row.disabled) || !selectedEvaluator
                      return (
                        <tr key={`omr-${omr}-${i}`} className="border-t">
                          <td className="px-2 py-1"><input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => toggleOmr(omr, e.target.checked)} /></td>
                          <td className="px-2 py-1">{omr}</td>
                          <td className="px-2 py-1">{num(row.omr_mapped)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:col-span-2 border rounded-md p-2">
                <p className="text-[12px] font-semibold mb-2 text-blue-700">Selected: {selectedCount}</p>
                <div className="max-h-[280px] overflow-auto space-y-1">
                  {selectedOmr.map((omr) => <div key={`sel-${omr}`} className="text-[12px] text-blue-700">{omr}</div>)}
                </div>
              </div>

              <div className="md:col-span-2 border rounded-md p-2">
                <p className="text-[12px] font-semibold mb-2 text-blue-700">Already Assigned List: {alreadyAssignedRows.length}</p>
                <div className="max-h-[280px] overflow-auto space-y-1">
                  {alreadyAssignedRows.map((row, i) => <div key={`as-${txt(row.omr_serial_no)}-${i}`} className="text-[12px] text-blue-700">{txt(row.omr_serial_no)}</div>)}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => void assign()} disabled={!selectedEvaluator || selectedOmr.length === 0 || loading}>Assign</Button>
            </div>
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="w-full max-w-sm">
                <SearchInput className="w-full" placeholder="Search" value={search} onChange={setSearch} />
              </div>
            </div>
            <div className="p-4">
              <DataTable rowData={filteredEvaluatorRows} columnDefs={columns} pagination loading={loading} onCellClicked={handleTableCellClick} />
            </div>
          </div>
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-blue-700">{detailTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <SearchInput value={detailSearch} onChange={setDetailSearch} placeholder="Search OMR..." />
            <div className="max-h-[420px] overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left">S.No</th>
                    <th className="px-2 py-1 text-left">OMR Serial No</th>
                    <th className="px-2 py-1 text-left">Evaluated Total Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailRows.map((row, i) => (
                    <tr key={`detail-${txt(row.omr_serial_no)}-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{txt(row.omr_serial_no) || '-'}</td>
                      <td className="px-2 py-1">{txt(row.evaluated_totalmarks) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
