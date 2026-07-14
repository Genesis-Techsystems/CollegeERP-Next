'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import {
  getEvaluatorAssignmentBundleByFlag,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  reassignEvaluationAssignment,
  updateReevaluationCount,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'
import { toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

export default function ReAssignEvaluatorsPage() {
  const [loading, setLoading] = useState(false)
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
  const courseOptions = useMemo(() => courses.map((r) => ({ value: String(num(r.fk_course_id)), label: txt(r.course_code) })), [courses])
  const academicYearOptions = useMemo(() => academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) })), [academicYears])
  const examOptions = useMemo(() => exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: txt(r.exam_name) })), [exams])
  const courseYearOptions = useMemo(() => courseYears.map((r) => ({ value: String(num(r.fk_course_year_id)), label: txt(r.course_year_code) })), [courseYears])
  const regulationOptions = useMemo(() => regulations.map((r) => ({ value: String(num(r.fk_regulation_id)), label: txt(r.regulation_code) })), [regulations])
  const subjectOptions = useMemo(
    () => subjects.map((r) => ({ value: String(num(r.fk_subject_id)), label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})` })),
    [subjects],
  )

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

  const sourceEvaluatorOptions = useMemo(
    () => filteredSourceEvaluators.map((r) => ({ value: String(num(r.pk_exam_evaluator_profile_id)), label: txt(r.evaluator_name) })),
    [filteredSourceEvaluators],
  )
  const targetEvaluatorOptions = useMemo(
    () => [{ value: '0', label: 'UnAssigned' }, ...filteredTargetEvaluators.map((r) => ({ value: String(num(r.pk_exam_evaluator_profile_id)), label: txt(r.evaluator_name) }))],
    [filteredTargetEvaluators],
  )

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
    // Angular selectedEvalutor(): the serial list reloads for the evaluator
    // AND the re-assign target list clears until serials are checked.
    setSourceEvaluatorId(profileId)
    setSelectedAssignmentIds([])
    setCheckAllOmr(false)
    setTargetEvaluators([])
    setSearchTarget('')
    const rows = evaluatorStudents.filter((r) => num(r.pk_exam_evaluator_profile_id ?? r.fk_exam_evaluator_profile_id) === profileId)
    setOmrRows(rows)
  }

  /** Angular updateSecondEvaluatorList(): rebuild the re-assign target list
   *  from the per-student rows every selection change — evaluators owning any
   *  selected serial are excluded; the rest dedup by evaluator name. */
  function updateSecondEvaluatorList(nextSelectedIds: number[], omrList: AnyRow[]) {
    const selectedSerials = new Set(
      omrList
        .filter((r) => nextSelectedIds.includes(num(r.pk_exam_evaluationassignment_id ?? r.fk_exam_evaluationassignment_id)))
        .map((r) => txt(r.omr_serial_no)),
    )
    const owners = new Set(
      evaluatorStudents
        .filter((s) => selectedSerials.has(txt(s.omr_serial_no)))
        .map((s) => txt(s.evaluator_name)),
    )
    const byName = new Map<string, AnyRow>()
    for (const item of evaluatorStudents) {
      const name = txt(item.evaluator_name)
      if (!name || owners.has(name)) continue
      byName.set(name, item)
    }
    setTargetEvaluators(Array.from(byName.values()))
  }

  function toggleOmr(assignmentId: number, checked: boolean) {
    setSelectedAssignmentIds((prev) => {
      const next = checked ? [...new Set([...prev, assignmentId])] : prev.filter((id) => id !== assignmentId)
      updateSecondEvaluatorList(next, omrRows)
      return next
    })
  }

  function toggleAllOmr(checked: boolean) {
    // Angular markItems() loops the FULL serial list, not the search-filtered view.
    setCheckAllOmr(checked)
    const next = checked
      ? omrRows
          .map((r) => num(r.pk_exam_evaluationassignment_id ?? r.fk_exam_evaluationassignment_id))
          .filter((id) => id > 0)
      : []
    setSelectedAssignmentIds(next)
    updateSecondEvaluatorList(next, omrRows)
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
      toastSuccess('Answer papers re-assigned successfully.')
      await getList()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to assign selected answer papers.')
    } finally {
      setLoading(false)
    }
  }

  const summary = summaryRows[0] ?? {}

  return (
    <FilteredPage
      title="Re-Assign Evaluator"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course">
            <Select value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(num(v) || null)} options={courseOptions} placeholder="Course" />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(num(v) || null)} options={academicYearOptions} placeholder="Academic Year" />
          </GlobalFilterField>
          <GlobalFilterField label="Exam">
            <Select value={examId ? String(examId) : null} onChange={(v) => setExamId(num(v) || null)} options={examOptions} placeholder="Exam" searchable />
          </GlobalFilterField>
          <GlobalFilterField label="Course Year">
            <Select value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(num(v) || null)} options={courseYearOptions} placeholder="Course Year" />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation">
            <Select value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(num(v) || null)} options={regulationOptions} placeholder="Regulation" />
          </GlobalFilterField>
          <GlobalFilterField label="Subject">
            <Select value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(num(v) || null)} options={subjectOptions} placeholder="Subject" searchable />
          </GlobalFilterField>
          <GlobalFilterField label="Re-Evaluation">
            <label className="inline-flex items-center gap-2 text-[12px] h-[30px]">
              <input type="checkbox" checked={isReevaluation} onChange={(e) => setIsReevaluation(e.target.checked)} />
              <span>Is Re-Evaluation</span>
            </label>
          </GlobalFilterField>
          <GlobalFilterField label="Action" className="global-filter-field--shrink global-filter-field--action">
            <Button type="button" onClick={getList} disabled={loading} className="h-[30px] px-3 text-[12px]">Get List</Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
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
              <Select
                value={sourceEvaluatorId ? String(sourceEvaluatorId) : null}
                onChange={(v) => onSourceEvaluatorChange(num(v))}
                options={sourceEvaluatorOptions}
                placeholder="Evaluator Name"
                searchable
              />
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
              <Select
                value={String(targetEvaluatorId)}
                onChange={(v) => setTargetEvaluatorId(num(v))}
                options={targetEvaluatorOptions}
                placeholder="Evaluator Name"
                searchable
              />
            </div>

            <div className="md:col-span-2 flex items-end justify-end">
              <Button type="button" onClick={assign} disabled={loading || selectedAssignmentIds.length === 0}>Assign</Button>
            </div>
          </div>
        </div>
      )}
    </FilteredPage>
  )
}

