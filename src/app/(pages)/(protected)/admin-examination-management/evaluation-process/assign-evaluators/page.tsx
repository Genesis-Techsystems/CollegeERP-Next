'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import {
  assignEvaluatorProfiles,
  getEvaluatorAssignmentBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  runPopStudentAssignment,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

export default function AssignEvaluatorsPage() {
  const [loading, setLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [runEnabled, setRunEnabled] = useState(false)
  const [search, setSearch] = useState('')

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])
  const [selectedProfileIds, setSelectedProfileIds] = useState<number[]>([])
  const [allChecked, setAllChecked] = useState(false)

  const [detailTitle, setDetailTitle] = useState('')
  const [detailRows, setDetailRows] = useState<AnyRow[]>([])
  const [detailOpen, setDetailOpen] = useState(false)

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
      const rest = await getRegSupRestFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      })
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

  async function getEvaluationList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    setLoading(true)
    try {
      const { evaluators, students } = await getEvaluatorAssignmentBundle({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
      })
      setEvaluatorRows(evaluators)
      setStudentRows(students)
      setSelectedProfileIds([])
      setAllChecked(false)
      setShowPanel(true)
      setRunEnabled(true)
    } finally {
      setLoading(false)
    }
  }

  async function runData() {
    if (!examId || !courseYearId || !subjectId) return
    const ok = globalThis.confirm('Are you sure you want to run assignment allocation?')
    if (!ok) return
    setLoading(true)
    try {
      await runPopStudentAssignment({ examId, subjectId, courseYearId })
      toastSuccess('Assignment allocation completed successfully.')
      await getEvaluationList()
    } catch (err) {
      toastError(err, 'Failed to run assignment allocation')
    } finally {
      setLoading(false)
    }
  }

  async function assignList() {
    if (!examId || !courseYearId || !subjectId || selectedProfileIds.length === 0) return
    setLoading(true)
    try {
      await assignEvaluatorProfiles({
        profileIds: selectedProfileIds,
        examId,
        subjectId,
        courseYearId,
      })
      toastSuccess('Evaluators assigned successfully.')
      await getEvaluationList()
    } catch (err) {
      toastError(err, 'Failed to assign evaluators')
    } finally {
      setLoading(false)
    }
  }

  function toggleAll(checked: boolean) {
    setAllChecked(checked)
    setSelectedProfileIds(
      checked ? evaluatorRows.map((r) => num(r.pk_exam_evaluator_profile_id)).filter((v) => v > 0) : [],
    )
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedProfileIds((s) => (checked ? [...new Set([...s, id])] : s.filter((x) => x !== id)))
  }

  function openDetail(row: AnyRow, mode: 'assigned' | 'evaluated' | 'due') {
    const profileId = num(row.pk_exam_evaluator_profile_id ?? row.fk_exam_evaluator_profile_id ?? row.exam_evaluator_profile_id)
    let list = studentRows.filter((x) => {
      const xProfileId = num(
        x.fk_exam_evaluator_profile_id ??
          x.pk_exam_evaluator_profile_id ??
          x.exam_evaluator_profile_id ??
          x.fk_exam_evaluatorprofile_id,
      )
      return xProfileId === profileId
    })
    if (mode === 'evaluated') list = list.filter((x) => x.evaluated_totalmarks != null || x.evaluatedTotalMarks != null)
    if (mode === 'due') list = list.filter((x) => x.evaluated_totalmarks == null && x.evaluatedTotalMarks == null)
    setDetailRows(list)
    setDetailTitle('Student Answer Sheets List')
    setDetailOpen(true)
  }

  const uploadedCount = studentRows.filter((r) => num(r.is_answerpaper_uploaded) === 1 || txt(r.omr_serial_no)).length
  const unAssigned = studentRows.filter((r) => num(r.fk_exam_evaluator_profile_id) === 0).length
  const noOfAssigned = Math.max(uploadedCount - unAssigned, 0)
  const filteredEvaluators = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return evaluatorRows
    return evaluatorRows.filter((r) => `${txt(r.evaluator_name)} ${txt(r.email)}`.toLowerCase().includes(q))
  }, [evaluatorRows, search])

  useEffect(() => {
    if (selectedProfileIds.length !== evaluatorRows.length) setAllChecked(false)
  }, [selectedProfileIds, evaluatorRows.length])

  return (
    <FilteredPage
      title="Assign Evaluator"
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
          <GlobalFilterField label="Action" className="global-filter-field--shrink global-filter-field--action">
            <div className="flex items-center gap-2">
              {runEnabled && <Button type="button" onClick={runData} disabled={loading} className="h-[30px] px-3 text-[12px]">Run</Button>}
              <Button type="button" onClick={getEvaluationList} disabled={loading} className="h-[30px] px-3 text-[12px]">Get List</Button>
            </div>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
      {showPanel && (
        <div className="app-card p-3 space-y-3">
          <p className="text-[12px] font-semibold">
            Evaluation Students: <span className="text-red-600">{studentRows.length}</span> | Total Students: <span className="text-red-600">{studentRows.length}</span> | No.Of AnswerPapers Uploaded: <span className="text-red-600">{uploadedCount}</span> | UnAssigned: <span className="text-red-600">{unAssigned}</span> | Assigned: <span className="text-red-600">{noOfAssigned}</span> | No of Evaluators: <span className="text-red-600">{evaluatorRows.length}</span> | Selected Evaluators: <span className="text-red-600">{selectedProfileIds.length}</span>
          </p>
          <div className="flex items-center justify-between gap-2">
            <SearchInput placeholder="Search evaluator…" value={search} onChange={setSearch} className="w-full max-w-sm" />
            {unAssigned > 0 && <Button type="button" onClick={assignList} disabled={loading || selectedProfileIds.length === 0}>Assign</Button>}
          </div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  {unAssigned > 0 && (
                    <th className="px-2 py-1 text-left">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /> All
                      </label>
                    </th>
                  )}
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Evaluator Name</th>
                  <th className="px-2 py-1 text-left">Evaluator Email</th>
                  <th className="px-2 py-1 text-left">Assigned Answer Sheets</th>
                  <th className="px-2 py-1 text-left">Evaluated Answer Sheets</th>
                  <th className="px-2 py-1 text-left">Due Answer Sheets</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluators.map((row, i) => {
                  const profileId = num(row.pk_exam_evaluator_profile_id)
                  return (
                    <tr key={`${profileId}-${i}`} className="border-t">
                      {unAssigned > 0 && (
                        <td className="px-2 py-1">
                          <input type="checkbox" checked={selectedProfileIds.includes(profileId)} onChange={(e) => toggleRow(profileId, e.target.checked)} />
                        </td>
                      )}
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                      <td className="px-2 py-1">{txt(row.email)}</td>
                      <td className="px-2 py-1 text-blue-700 cursor-pointer hover:underline" onClick={() => openDetail(row, 'assigned')}>{num(row.no_of_students_assigned)}</td>
                      <td className="px-2 py-1 text-blue-700 cursor-pointer hover:underline" onClick={() => openDetail(row, 'evaluated')}>{num(row.no_of_evaluations_completed)}</td>
                      <td className="px-2 py-1 text-blue-700 cursor-pointer hover:underline" onClick={() => openDetail(row, 'due')}>{Math.max(num(row.no_of_students_assigned) - num(row.no_of_evaluations_completed), 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-lg bg-card border shadow-xl">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h4 className="text-[14px] font-semibold">{detailTitle}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => {
                  setDetailOpen(false)
                  setDetailRows([])
                }}
              >
                Close
              </Button>
            </div>
            <div className="p-3 max-h-[60vh] overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr><th className="px-2 py-1 text-left">SI.No</th><th className="px-2 py-1 text-left">OMR Serial No</th><th className="px-2 py-1 text-left">Evaluated Total Marks</th></tr>
                </thead>
                <tbody>
                  {detailRows.map((r, i) => (
                    <tr key={`${num(r.fk_exam_evaluationassignment_id)}-${txt(r.omr_serial_no)}-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{txt(r.omr_serial_no)}</td>
                      <td className="px-2 py-1">{txt(r.evaluated_totalmarks) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </FilteredPage>
  )
}

