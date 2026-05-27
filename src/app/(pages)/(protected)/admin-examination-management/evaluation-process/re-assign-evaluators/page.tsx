'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchInput } from '@/common/components/search'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getEvaluatorAssignmentBundleByFlag,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  reassignEvaluationAssignment,
  updateReevaluationCount,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, any>

export default function ReAssignEvaluatorsPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [isReevaluation, setIsReevaluation] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [summaryRows, setSummaryRows] = useState<AnyRow[]>([])
  const [evaluatorStudents, setEvaluatorStudents] = useState<AnyRow[]>([])

  const [assignedEvaluators, setAssignedEvaluators] = useState<AnyRow[]>([])
  const [targetEvaluators, setTargetEvaluators] = useState<AnyRow[]>([])
  const [omrRows, setOmrRows] = useState<AnyRow[]>([])

  const [sourceEvaluatorId, setSourceEvaluatorId] = useState<number | null>(null)
  const [targetEvaluatorId, setTargetEvaluatorId] = useState<number>(0)
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([])
  const [checkAllOmr, setCheckAllOmr] = useState(false)

  const [searchSource, setSearchSource] = useState('')
  const [searchOmr, setSearchOmr] = useState('')
  const [searchTarget, setSearchTarget] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

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

  const filteredSourceEvaluators = useMemo(() => {
    const q = searchSource.trim().toLowerCase()
    if (!q) return assignedEvaluators
    return assignedEvaluators.filter((r) => txt(r.evaluator_name).toLowerCase().includes(q))
  }, [assignedEvaluators, searchSource])

  const filteredTargetEvaluators = useMemo(() => {
    const q = searchTarget.trim().toLowerCase()
    if (!q) return targetEvaluators
    return targetEvaluators.filter((r) => txt(r.evaluator_name).toLowerCase().includes(q))
  }, [targetEvaluators, searchTarget])

  const filteredOmrRows = useMemo(() => {
    const q = searchOmr.trim().toLowerCase()
    if (!q) return omrRows
    return omrRows.filter((r) => txt(r.omr_serial_no).toLowerCase().includes(q))
  }, [omrRows, searchOmr])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const list = await getRegSupBaseFilters(employeeId)
        setBaseRows(list)
        setCourseId(num(list[0]?.fk_course_id) || null)
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

  function resetSelectionState() {
    setSourceEvaluatorId(null)
    setTargetEvaluatorId(0)
    setSelectedAssignmentIds([])
    setCheckAllOmr(false)
    setOmrRows([])
    setAssignedEvaluators([])
    setTargetEvaluators([])
    setSearchSource('')
    setSearchOmr('')
    setSearchTarget('')
  }

  async function getList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    setLoading(true)
    setErrorMsg('')
    resetSelectionState()
    setShowPanel(true)
    try {
      const flag = isReevaluation ? 'list_evaluatorassignment_list_reevaluation' : 'list_evaluatorassignment_list'
      const { evaluators, summary, evaluatorStudents: evaluatorStudentsRows } = await getEvaluatorAssignmentBundleByFlag(
        {
          organizationId: organizationId || 1,
          examId,
          courseYearId,
          subjectId,
          regulationId,
          courseId,
          academicYearId,
          employeeId,
        },
        flag,
      )
      setEvaluatorRows(evaluators)
      setSummaryRows(summary)
      setEvaluatorStudents(evaluatorStudentsRows)

      // Angular split: "Assigned Evaluator Names" (source) = AssingedList = due!=0
      // (has pending/incomplete work); "Re-Assign" (target) = UnAssingedList =
      // due==0 (free to take more).
      const assigned: AnyRow[] = []
      const target: AnyRow[] = []
      for (const row of evaluators) {
        const due = num(row.no_of_students_assigned) - num(row.no_of_evaluations_completed)
        if (due !== 0) {
          assigned.push(row)
        } else {
          target.push(row)
        }
      }
      setAssignedEvaluators(assigned)
      setTargetEvaluators(target)
    } finally {
      setLoading(false)
    }
  }

  function onSourceEvaluatorChange(profileId: number) {
    setSourceEvaluatorId(profileId)
    setSelectedAssignmentIds([])
    setCheckAllOmr(false)
    const rows = evaluatorStudents.filter((r) => num(r.pk_exam_evaluator_profile_id ?? r.fk_exam_evaluator_profile_id) === profileId)
    setOmrRows(rows)
  }

  useEffect(() => {
    const selectedOmrSerials = new Set(
      omrRows
        .filter((r) => selectedAssignmentIds.includes(num(r.pk_exam_evaluationassignment_id ?? r.fk_exam_evaluationassignment_id)))
        .map((r) => txt(r.omr_serial_no)),
    )
    const filtered = targetEvaluators.filter((ev) => {
      const evName = txt(ev.evaluator_name)
      if (!evName) return false
      const hasSameOmr = evaluatorStudents.some(
        (s) => txt(s.evaluator_name) === evName && selectedOmrSerials.has(txt(s.omr_serial_no)),
      )
      return !hasSameOmr
    })
    if (selectedOmrSerials.size === 0) {
      // Target list = evaluators who are free (due == 0).
      setTargetEvaluators(evaluatorRows.filter((row) => (num(row.no_of_students_assigned) - num(row.no_of_evaluations_completed)) === 0))
    } else {
      setTargetEvaluators(filtered)
    }
  }, [selectedAssignmentIds, omrRows, evaluatorStudents, evaluatorRows])

  function toggleOmr(assignmentId: number, checked: boolean) {
    setSelectedAssignmentIds((prev) => (checked ? [...new Set([...prev, assignmentId])] : prev.filter((id) => id !== assignmentId)))
  }

  function toggleAllOmr(checked: boolean) {
    setCheckAllOmr(checked)
    setSelectedAssignmentIds(
      checked
        ? filteredOmrRows
            .map((r) => num(r.pk_exam_evaluationassignment_id ?? r.fk_exam_evaluationassignment_id))
            .filter((id) => id > 0)
        : [],
    )
  }

  async function assign() {
    if (!examId || !courseYearId || !subjectId || selectedAssignmentIds.length === 0) return
    setErrorMsg('')
    const target = targetEvaluators.find((r) => num(r.pk_exam_evaluator_profile_id) === targetEvaluatorId)
    const timeTableIds = txt(target?.pk_exam_timetable_det_ids)
    setLoading(true)
    try {
      await reassignEvaluationAssignment({
        profileId: targetEvaluatorId,
        examEvaluationAssignmentIdsCsv: selectedAssignmentIds.join(','),
        timetableDetIds: timeTableIds,
        examId,
        subjectId,
        courseYearId,
      })
      if (isReevaluation) {
        await updateReevaluationCount({ examId, subjectId, courseYearId })
      }
      await getList()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to assign selected answer papers.')
    } finally {
      setLoading(false)
    }
  }

  const summary = summaryRows[0] ?? {}

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Re-Assign Evaluator" subtitle="Re-assign selected answer papers to another evaluator" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Re-Assign Evaluator</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((r) => <SelectItem key={String(num(r.fk_course_id))} value={String(num(r.fk_course_id))}>{txt(r.course_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Academic Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((r) => <SelectItem key={String(num(r.fk_academic_year_id))} value={String(num(r.fk_academic_year_id))}>{txt(r.academic_year)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Exam</Label><Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger><SelectContent>{exams.map((r) => <SelectItem key={String(num(r.fk_exam_id))} value={String(num(r.fk_exam_id))}>{txt(r.exam_name)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((r) => <SelectItem key={String(num(r.fk_course_year_id))} value={String(num(r.fk_course_year_id))}>{txt(r.course_year_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((r) => <SelectItem key={String(num(r.fk_regulation_id))} value={String(num(r.fk_regulation_id))}>{txt(r.regulation_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Subject</Label><Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(num(v) || null)}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.map((r) => <SelectItem key={String(num(r.fk_subject_id))} value={String(num(r.fk_subject_id))}>{txt(r.subject_name)} - {txt(r.subject_code)} ({txt(r.regulation_code)})</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1">
                <label className="inline-flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={isReevaluation} onChange={(e) => setIsReevaluation(e.target.checked)} />
                  <span>Is Re-Evaluation</span>
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      {showPanel && (
        <div className="app-card p-3 space-y-3">
          {errorMsg && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{errorMsg}</div>}
          <p className="text-[12px] font-semibold">
            UnAssigned: <span className="text-red-600">{num(summary.UnAssinged)}</span> | Total Students: <span className="text-red-600">{num(summary.totalStudents)}</span> | Selected Serials: <span className="text-red-600">{selectedAssignmentIds.length}</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3 rounded border p-2">
              <h3 className="text-[13px] font-semibold text-blue-700 mb-2">Assigned Evaluator Names</h3>
              <SearchInput value={searchSource} onChange={setSearchSource} placeholder="Search names…" className="mb-2 w-full max-w-sm" />
              <Select value={sourceEvaluatorId ? String(sourceEvaluatorId) : undefined} onValueChange={(v) => onSourceEvaluatorChange(num(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Evaluator Name" /></SelectTrigger>
                <SelectContent>
                  {filteredSourceEvaluators.map((r) => (
                    <SelectItem key={String(num(r.pk_exam_evaluator_profile_id))} value={String(num(r.pk_exam_evaluator_profile_id))}>
                      {txt(r.evaluator_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 rounded border p-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <SearchInput value={searchOmr} onChange={setSearchOmr} placeholder="Search OMR…" className="min-w-0 w-full max-w-sm" />
                <span className="shrink-0 text-[12px] font-semibold text-blue-700">Serial No: {selectedAssignmentIds.length}</span>
              </div>
              <div className="max-h-[340px] overflow-auto border rounded">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left w-[20%]">
                        <label className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={checkAllOmr} onChange={(e) => toggleAllOmr(e.target.checked)} />
                          <span>All</span>
                        </label>
                      </th>
                      <th className="px-2 py-1 text-left">Serial No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOmrRows.map((r, i) => {
                      const assignmentId = num(r.pk_exam_evaluationassignment_id ?? r.fk_exam_evaluationassignment_id)
                      const checked = selectedAssignmentIds.includes(assignmentId)
                      return (
                        <tr key={`${assignmentId}-${txt(r.omr_serial_no)}-${i}`} className="border-t">
                          <td className="px-2 py-1">
                            <input type="checkbox" checked={checked} onChange={(e) => toggleOmr(assignmentId, e.target.checked)} />
                          </td>
                          <td className="px-2 py-1">{txt(r.omr_serial_no)} ({txt(r.evaluationstatus) || '-'})</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="md:col-span-3 rounded border p-2">
              <h3 className="text-[13px] font-semibold text-blue-700 mb-2">Re-Assign Evaluator Names</h3>
              <SearchInput value={searchTarget} onChange={setSearchTarget} placeholder="Search names…" className="mb-2 w-full max-w-sm" />
              <Select value={String(targetEvaluatorId)} onValueChange={(v) => setTargetEvaluatorId(num(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Evaluator Name" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">UnAssigned</SelectItem>
                  {filteredTargetEvaluators.map((r) => (
                    <SelectItem key={String(num(r.pk_exam_evaluator_profile_id))} value={String(num(r.pk_exam_evaluator_profile_id))}>
                      {txt(r.evaluator_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-end justify-end">
              <Button type="button" onClick={assign} disabled={loading || selectedAssignmentIds.length === 0}>Assign</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

