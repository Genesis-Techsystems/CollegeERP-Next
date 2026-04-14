'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/common/components/select'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError } from '@/lib/toast'
import {
  assignModerationEvaluation,
  getEvaluationModerationFilters,
  getEvaluationModerationRest,
  getEvaluationModerationSubjects,
  listEvaluationModerationData,
} from '@/services/evaluation-process'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}
const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function makeAssignedRenderer(onOpen: (row: AnyRow, listType: 'AssignedList' | 'CompletedList') => void) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {}
    const count = Number(row?.no_of_students_assigned ?? 0)
    return (
      <button type="button" className="text-blue-700 hover:underline disabled:text-slate-500" disabled={count <= 0} onClick={() => onOpen(row, 'AssignedList')}>
        {count}
      </button>
    )
  }
}

function makeEvaluatedRenderer(onOpen: (row: AnyRow, listType: 'AssignedList' | 'CompletedList') => void) {
  return (p: { data?: AnyRow }) => {
    const row = p.data ?? {}
    const count = Number(row?.no_of_evaluations_completed ?? 0)
    return (
      <button type="button" className="text-blue-700 hover:underline disabled:text-slate-500" disabled={count <= 0} onClick={() => onOpen(row, 'CompletedList')}>
        {count}
      </button>
    )
  }
}

export default function EvaluationModerationPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [search, setSearch] = useState('')
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [totalsRows, setTotalsRows] = useState<AnyRow[]>([])
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])
  const [omrRows, setOmrRows] = useState<AnyRow[]>([])
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<number | null>(null)
  const [selectedOmr, setSelectedOmr] = useState<string[]>([])
  const [omrSearch, setOmrSearch] = useState('')
  const [popupOpen, setPopupOpen] = useState(false)
  const [popupTitle, setPopupTitle] = useState('Student Answer Sheets List')
  const [popupSearch, setPopupSearch] = useState('')
  const [popupRows, setPopupRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [baseRows, courseId, academicYearId],
  )
  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => pickNum(r, ['fk_course_year_id', 'courseYearId'])),
    [restRows],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)),
        (r) => pickNum(r, ['fk_regulation_id', 'regulationId']),
      ),
    [restRows, courseYearId],
  )
  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => pickNum(r, ['fk_subject_id', 'subjectId'])),
    [subjectRows],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getEvaluationModerationFilters(employeeId).catch(() => [])
        const rows = Array.isArray(list) ? list : []
        setBaseRows(rows)
        if (rows[0]) setCourseId(pickNum(rows[0], ['fk_course_id', 'courseId']))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (academicYears[0]) setAcademicYearId(pickNum(academicYears[0], ['fk_academic_year_id', 'academicYearId']))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]) setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
  }, [exams])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const list = await getEvaluationModerationRest({
        employeeId,
        courseId,
        academicYearId,
        examId,
      }).catch(() => [])
      const rows = Array.isArray(list) ? list : []
      setRestRows(rows)
      if (rows[0]) setCourseYearId(pickNum(rows[0], ['fk_course_year_id', 'courseYearId']))
    }
    void loadRest()
  }, [employeeId, courseId, academicYearId, examId])

  useEffect(() => {
    if (regulations[0]) setRegulationId(pickNum(regulations[0], ['fk_regulation_id', 'regulationId']))
  }, [regulations])

  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId) return
      const list = await getEvaluationModerationSubjects({
        employeeId,
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
      }).catch(() => [])
      const rows = Array.isArray(list) ? list : []
      setSubjectRows(rows)
      if (rows[0]) setSubjectId(pickNum(rows[0], ['fk_subject_id', 'subjectId']))
    }
    void loadSubjects()
  }, [employeeId, courseId, academicYearId, examId, courseYearId, regulationId])

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) {
      toastError('Please select all filters.')
      return
    }
    setLoading(true)
    try {
      const data = await listEvaluationModerationData({
        employeeId,
        courseId,
        academicYearId,
        examId,
        courseYearId,
        subjectId,
        regulationId,
      })
      setEvaluatorRows(data.evaluators)
      setTotalsRows(data.totals)
      setStudentRows(data.students)
      setOmrRows(data.omrRows)
      setSelectedEvaluatorId(null)
      setSelectedOmr([])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  const totals = totalsRows[0] ?? {}
  const totalStudents = Number(totals.totalStudents ?? 0)
  const uploaded = Number(totals.NoOfAnswerpapersUploaded ?? 0)
  const unassigned = Number(totals.UnAssinged ?? 0)
  const assigned = Math.max(uploaded - unassigned, 0)

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return evaluatorRows
    return evaluatorRows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [evaluatorRows, search])

  const assignedByEvaluator = useMemo(() => {
    const map = new Map<number, Set<string>>()
    for (const row of evaluatorRows) {
      const id = pickNum(row, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
      if (id <= 0) continue
      const set = new Set<string>()
      const raw = String(row?.assigned_omr_serial_nos ?? row?.omr_serial_nos ?? '')
      for (const v of raw.split(',').map((s) => s.trim()).filter(Boolean)) set.add(v)
      map.set(id, set)
    }
    return map
  }, [evaluatorRows])

  const visibleStudents = useMemo(() => {
    const q = omrSearch.trim().toLowerCase()
    if (!q) return studentRows
    return studentRows.filter((s) => String(s?.omr_serial_no ?? '').toLowerCase().includes(q))
  }, [studentRows, omrSearch])

  const assignedSetForSelected = useMemo(
    () => (selectedEvaluatorId ? assignedByEvaluator.get(selectedEvaluatorId) ?? new Set<string>() : new Set<string>()),
    [assignedByEvaluator, selectedEvaluatorId],
  )
  const assignableStudents = useMemo(() => visibleStudents, [visibleStudents])
  const alreadyAssignedStudents = useMemo(
    () => visibleStudents.filter((s) => assignedSetForSelected.has(String(s?.omr_serial_no ?? ''))),
    [visibleStudents, assignedSetForSelected],
  )
  const visibleAssignableOmrs = useMemo(
    () => visibleStudents.map((s) => String(s?.omr_serial_no ?? '')).filter(Boolean),
    [visibleStudents],
  )
  const areAllVisibleSelected = useMemo(
    () => visibleAssignableOmrs.length > 0 && visibleAssignableOmrs.every((omr) => selectedOmr.includes(omr)),
    [visibleAssignableOmrs, selectedOmr],
  )

  const selectedEvaluator = useMemo(
    () => evaluatorRows.find((e) => pickNum(e, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId']) === Number(selectedEvaluatorId)) ?? null,
    [evaluatorRows, selectedEvaluatorId],
  )

  async function onAssign() {
    if (!selectedEvaluatorId || selectedOmr.length === 0 || !examId || !subjectId || !courseYearId) return
    setLoading(true)
    try {
      await assignModerationEvaluation({
        profileId: selectedEvaluatorId,
        examId,
        subjectId,
        courseYearId,
        omrSerialNos: selectedOmr.join(','),
      })
      setSelectedOmr([])
      await onGetList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to assign moderation evaluation.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelectAllVisible() {
    if (areAllVisibleSelected) {
      setSelectedOmr((prev) => prev.filter((omr) => !visibleAssignableOmrs.includes(omr)))
      return
    }
    setSelectedOmr((prev) => [...new Set([...prev, ...visibleAssignableOmrs])])
  }

  function toggleOmrSelection(omr: string, checked: boolean) {
    setSelectedOmr((prev) => (checked ? [...new Set([...prev, omr])] : prev.filter((v) => v !== omr)))
  }

  function openStudentListPopup(row: AnyRow, listType: 'AssignedList' | 'CompletedList') {
    const evaluatorProfileId = pickNum(row, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
    const base = omrRows.filter((x) => pickNum(x, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId']) === evaluatorProfileId)
    const filtered =
      listType === 'CompletedList'
        ? base.filter((x) => x?.evaluated_totalmarks != null && x?.omr_serial_no != null)
        : base.filter((x) => x?.omr_serial_no != null)
    setPopupTitle(listType === 'CompletedList' ? 'Evaluated Answer Sheets List' : 'Student Answer Sheets List')
    setPopupRows(filtered)
    setPopupSearch('')
    setPopupOpen(true)
  }

  const filteredPopupRows = useMemo(() => {
    const q = popupSearch.trim().toLowerCase()
    if (!q) return popupRows
    return popupRows.filter((r) => {
      const serial = String(r?.omr_serial_no ?? '').toLowerCase()
      const marks = String(r?.evaluated_totalmarks ?? '').toLowerCase()
      return serial.includes(q) || marks.includes(q)
    })
  }, [popupRows, popupSearch])

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70 },
      { field: 'evaluatorName', headerName: 'Evaluator Name', minWidth: 220, valueGetter: (p) => p.data?.evaluator_name ?? '-' },
      { field: 'email', headerName: 'Evaluator Email', minWidth: 220, valueGetter: (p) => p.data?.email ?? '-' },
      { field: 'assigned', headerName: 'Assigned Answer Sheets', minWidth: 170, valueGetter: (p) => p.data?.no_of_students_assigned ?? 0, cellRenderer: makeAssignedRenderer(openStudentListPopup) },
      { field: 'completed', headerName: 'Evaluated Answer Sheets', minWidth: 170, valueGetter: (p) => p.data?.no_of_evaluations_completed ?? 0, cellRenderer: makeEvaluatedRenderer(openStudentListPopup) },
      {
        field: 'due',
        headerName: 'Due Answer Sheets',
        minWidth: 150,
        valueGetter: (p) =>
          Number(p.data?.no_of_students_assigned ?? 0) - Number(p.data?.no_of_evaluations_completed ?? 0),
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Evaluation Moderation" subtitle="Manage evaluation moderation assignments" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Evaluation Moderation</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Course</Label>
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => setCourseId(v ? Number(v) : null)}
                  options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId'])), label: pickText(c, ['course_code', 'courseCode']) } as SelectOption))}
                  placeholder="Course"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                  options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId'])), label: pickText(a, ['academic_year', 'academicYear']) } as SelectOption))}
                  placeholder="Academic Year"
                />
              </div>
              <div className="md:col-span-4">
                <Label className="text-[12px] text-muted-foreground">Exam</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => setExamId(v ? Number(v) : null)}
                  options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId'])), label: pickText(e, ['exam_name', 'examName']) } as SelectOption))}
                  placeholder="Exam"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={courseYears.map((y) => ({ value: String(pickNum(y, ['fk_course_year_id', 'courseYearId'])), label: pickText(y, ['course_year_code', 'courseYearCode']) } as SelectOption))}
                  placeholder="Course Year"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Regulation</Label>
                <Select
                  value={regulationId ? String(regulationId) : null}
                  onChange={(v) => setRegulationId(v ? Number(v) : null)}
                  options={regulations.map((r) => ({ value: String(pickNum(r, ['fk_regulation_id', 'regulationId'])), label: pickText(r, ['regulation_code', 'regulationCode']) } as SelectOption))}
                  placeholder="Regulation"
                />
              </div>
              <div className="md:col-span-4">
                <Label className="text-[12px] text-muted-foreground">Subject</Label>
                <Select
                  value={subjectId ? String(subjectId) : null}
                  onChange={(v) => setSubjectId(v ? Number(v) : null)}
                  options={subjects.map((s) => ({ value: String(pickNum(s, ['fk_subject_id', 'subjectId'])), label: `${pickText(s, ['subject_name', 'subjectName'])} - ${pickText(s, ['subject_code', 'subjectCode'])}` } as SelectOption))}
                  placeholder="Subject"
                />
              </div>
              <div className="md:col-span-2">
                <Button className="h-8 px-3 text-[12px] w-full" onClick={onGetList} disabled={loading}>
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <>
          <div className="app-card p-3 text-[13px]">
            <span className="font-semibold">Total Students:</span> {totalStudents} |{' '}
            <span className="font-semibold">Uploaded:</span> {uploaded} |{' '}
            <span className="font-semibold">UnAssigned:</span> {unassigned} |{' '}
            <span className="font-semibold">Assigned:</span> {assigned} |{' '}
            <span className="font-semibold">No of Evaluators:</span> {evaluatorRows.length}
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="w-full max-w-sm">
                <SearchInput className="w-full" placeholder="Search" value={search} onChange={setSearch} />
              </div>
            </div>
            <div className="p-4">
              <DataTable rowData={filteredRows} columnDefs={cols} pagination loading={loading} />
            </div>
          </div>

          <div className="app-card p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3 border rounded-md p-2">
                <p className="text-[13px] font-semibold mb-2">Evaluator List / Assigned Count</p>
                <div className="space-y-1 max-h-[280px] overflow-auto">
                  {evaluatorRows.map((e) => {
                    const id = pickNum(e, ['pk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
                    const checked = selectedEvaluatorId === id
                    return (
                      <label key={`ev-${id}`} className="flex items-center gap-2 text-[12px]">
                        <input type="radio" checked={checked} onChange={() => { setSelectedEvaluatorId(id); setSelectedOmr([]) }} />
                        <span>{pickText(e, ['evaluator_name', 'evaluatorName'])} / ({pickNum(e, ['no_of_students_assigned'])})</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="md:col-span-5 border rounded-md p-2">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <SearchInput value={omrSearch} onChange={setOmrSearch} placeholder="Search OMR..." className="max-w-xs" />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      disabled={!selectedEvaluatorId || visibleAssignableOmrs.length === 0}
                      onClick={toggleSelectAllVisible}
                    >
                      {areAllVisibleSelected ? 'Unselect Visible' : 'Select All Visible'}
                    </Button>
                    <span className="text-[12px] font-semibold">Selected: {selectedOmr.length}</span>
                  </div>
                </div>
                <p className="text-[12px] font-semibold mb-2">OMR List ({assignableStudents.length})</p>
                <div className="max-h-[280px] overflow-auto border rounded">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-2 py-1 w-10">Sel</th>
                        <th className="text-left px-2 py-1">Serial No</th>
                        <th className="text-left px-2 py-1">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignableStudents.map((s) => {
                        const omr = String(s?.omr_serial_no ?? '')
                        const checked = selectedOmr.includes(omr)
                        return (
                          <tr key={`omr-${omr}`} className="border-t">
                            <td className="px-2 py-1">
                              <input
                                type="checkbox"
                                disabled={!selectedEvaluatorId}
                                checked={checked}
                                onChange={(e) => toggleOmrSelection(omr, e.target.checked)}
                              />
                            </td>
                            <td className="px-2 py-1">{omr || '-'}</td>
                            <td className="px-2 py-1">{String(s?.list_evaluated_totalmarks ?? '-')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-2 border rounded-md p-2">
                <p className="text-[12px] font-semibold mb-2">Selected ({selectedOmr.length})</p>
                <div className="max-h-[280px] overflow-auto space-y-1">
                  {selectedOmr.map((omr) => <div key={`sel-${omr}`} className="text-[12px] text-blue-700">{omr}</div>)}
                </div>
              </div>

              <div className="md:col-span-2 border rounded-md p-2">
                <p className="text-[12px] font-semibold mb-2">Assigned OMR List ({alreadyAssignedStudents.length})</p>
                <div className="max-h-[280px] overflow-auto space-y-1">
                  {alreadyAssignedStudents.map((s) => {
                    const omr = String(s?.omr_serial_no ?? '')
                    return <div key={`as-${omr}`} className="text-[12px] text-blue-700">{omr}</div>
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={loading || !selectedEvaluator || selectedOmr.length === 0} onClick={() => void onAssign()}>
                Assign
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-semibold text-[hsl(var(--primary))]">{popupTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="w-full max-w-sm">
              <SearchInput value={popupSearch} onChange={setPopupSearch} placeholder="Search" className="w-full" />
            </div>
            <div className="max-h-[420px] overflow-auto border rounded">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-3 py-2 w-20">S.No</th>
                    <th className="text-left px-3 py-2">Omr Serial No</th>
                    <th className="text-left px-3 py-2">Evaluated Total Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPopupRows.map((r, idx) => (
                    <tr key={`popup-${String(r?.omr_serial_no ?? '')}-${idx}`} className="border-t">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{String(r?.omr_serial_no ?? '-')}</td>
                      <td className="px-3 py-2">{String(r?.evaluated_totalmarks ?? '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPopupOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

