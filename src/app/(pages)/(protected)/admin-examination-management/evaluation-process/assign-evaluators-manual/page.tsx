'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import {
  getEvaluatorAssignmentBundle,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  updateManualEvaluationAssignment,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

export default function AssignEvaluatorsManualPage() {
  const [loading, setLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [studentRows, setStudentRows] = useState<AnyRow[]>([])
  const [selectedEvaluatorProfileId, setSelectedEvaluatorProfileId] = useState<number | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [searchEvaluator, setSearchEvaluator] = useState('')
  const [searchOmr, setSearchOmr] = useState('')
  const [detailTitle, setDetailTitle] = useState('')
  const [detailRows, setDetailRows] = useState<AnyRow[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSearch, setDetailSearch] = useState('')
  const [isClient, setIsClient] = useState(false)

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

  const filteredEvaluators = useMemo(() => {
    const q = searchEvaluator.trim().toLowerCase()
    if (!q) return evaluatorRows
    return evaluatorRows.filter((r) => txt(r.evaluator_name).toLowerCase().includes(q))
  }, [evaluatorRows, searchEvaluator])

  const unMappedUploadedStudents = useMemo(
    () => studentRows.filter((r) => num(r.is_mapped) === 0 && num(r.is_answerpaper_uploaded) === 1),
    [studentRows],
  )

  const filteredStudents = useMemo(() => {
    const q = searchOmr.trim().toLowerCase()
    if (!q) return unMappedUploadedStudents
    return unMappedUploadedStudents.filter((r) => txt(r.omr_serial_no).toLowerCase().includes(q))
  }, [unMappedUploadedStudents, searchOmr])

  const selectedRows = useMemo(
    () => unMappedUploadedStudents.filter((r) => selectedStudentIds.includes(num(r.fk_exam_evaluationassignment_id))),
    [unMappedUploadedStudents, selectedStudentIds],
  )

  useEffect(() => {
    setIsClient(true)
  }, [])

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

  useEffect(() => {
    setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null)
  }, [academicYears])

  useEffect(() => {
    setExamId(num(exams[0]?.fk_exam_id) || null)
  }, [exams])

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
    setRegulationId(num(regulations[0]?.fk_regulation_id) || null)
  }, [regulations])

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
    setShowPanel(true)
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
      setSelectedEvaluatorProfileId(null)
      setSelectedStudentIds([])
    } finally {
      setLoading(false)
    }
  }

  async function assign() {
    if (!selectedEvaluatorProfileId || selectedStudentIds.length === 0) return
    const selectedEvaluator = evaluatorRows.find((r) => num(r.pk_exam_evaluator_profile_id) === selectedEvaluatorProfileId)
    const timetableDetIds = txt(selectedEvaluator?.pk_exam_timetable_det_ids)
    setLoading(true)
    try {
      await updateManualEvaluationAssignment({
        profileId: selectedEvaluatorProfileId,
        examEvaluationAssignmentIdsCsv: selectedStudentIds.join(','),
        timetableDetIds,
        examId: examId || 0,
        subjectId: subjectId || 0,
        courseYearId: courseYearId || 0,
      })
      toastSuccess('Answer papers assigned successfully.')
      await getEvaluationList()
    } catch (err) {
      toastError(err, 'Failed to assign answer papers')
    } finally {
      setLoading(false)
    }
  }

  function toggleStudent(id: number, checked: boolean) {
    setSelectedStudentIds((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))
  }

  function openEvaluatorDetail(row: AnyRow, mode: 'assigned' | 'evaluated' | 'due') {
    const profileId = num(row.fk_exam_evaluator_profile_id ?? row.pk_exam_evaluator_profile_id ?? row.exam_evaluator_profile_id)
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
    setDetailTitle('Student Answer Sheets List')
    setDetailRows(list)
    setDetailSearch('')
    setDetailOpen(true)
  }

  const totalStudents = studentRows.length
  const uploadedCount = studentRows.filter((r) => num(r.is_answerpaper_uploaded) === 1).length
  const unAssigned = unMappedUploadedStudents.length
  const assigned = Math.max(uploadedCount - unAssigned, 0)
  const filteredDetailRows = useMemo(() => {
    const q = detailSearch.trim().toLowerCase()
    if (!q) return detailRows
    return detailRows.filter((r) => {
      const omr = txt(r.omr_serial_no ?? r.omrSerialNo).toLowerCase()
      const marks = txt(r.evaluated_totalmarks ?? r.evaluatedTotalMarks).toLowerCase()
      return `${omr} ${marks}`.includes(q)
    })
  }, [detailRows, detailSearch])

  return (
    <FilteredPage
      title="Manual Assign Evaluator"
      filters={(
        <>
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
              <Button type="button" onClick={getEvaluationList} disabled={loading} className="h-[30px] px-3 text-[12px]">Get List</Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
          {showPanel && (
            <p className="px-5 pb-1 text-[12px] font-semibold">
              Total Students: <span className="text-red-600">{totalStudents}</span> | No.Of AnswerPapers Uploaded: <span className="text-red-600">{uploadedCount}</span> | UnAssigned: <span className="text-red-600">{unAssigned}</span> | Assigned: <span className="text-red-600">{assigned}</span> | No of Evaluators: <span className="text-red-600">{evaluatorRows.length}</span>
            </p>
          )}
        </>
      )}
    >
      {showPanel && (
        <div className="app-card p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3 rounded border p-2">
              <h3 className="text-[13px] font-semibold text-blue-700 mb-2">Evaluators (Completed/Assigned)</h3>
              <SearchInput placeholder="Search evaluator…" value={searchEvaluator} onChange={setSearchEvaluator} className="mb-2 w-full max-w-sm" />
              <div className="max-h-[320px] overflow-auto space-y-1">
                {filteredEvaluators.map((row) => (
                  <label key={num(row.pk_exam_evaluator_profile_id)} className="flex items-start gap-2 text-[12px]">
                    <input
                      type="radio"
                      name="evaluator"
                      checked={selectedEvaluatorProfileId === num(row.pk_exam_evaluator_profile_id)}
                      onChange={() => setSelectedEvaluatorProfileId(num(row.pk_exam_evaluator_profile_id))}
                    />
                    <span>{txt(row.evaluator_name)} ({num(row.no_of_evaluations_completed)}/{num(row.no_of_students_assigned)})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-4 rounded border p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold">Serial No</h3>
                <span className="text-[12px] text-blue-700 font-semibold">Selected: {selectedStudentIds.length}</span>
              </div>
              <Input placeholder="Search OMR…" value={searchOmr} onChange={(e) => setSearchOmr(e.target.value)} className="h-8 text-[12px] mb-2" />
              <div className="max-h-[320px] overflow-auto space-y-1">
                {filteredStudents.map((row, i) => {
                  const id = num(row.fk_exam_evaluationassignment_id)
                  const checked = selectedStudentIds.includes(id)
                  const rowKey = `${id}-${txt(row.omr_serial_no)}-${i}`
                  return (
                    <label key={rowKey} className="flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleStudent(id, e.target.checked)}
                      />
                      {txt(row.omr_serial_no)}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-4 rounded border p-2">
              <h3 className="text-[13px] font-semibold mb-2">Selected: {selectedStudentIds.length}</h3>
              <div className="max-h-[320px] overflow-auto space-y-1 text-[12px]">
                {selectedRows.map((row, i) => (
                  <div key={`${num(row.fk_exam_evaluationassignment_id)}-${txt(row.omr_serial_no)}-${i}`} className="text-blue-700">
                    {txt(row.omr_serial_no) || '-'}
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-1 flex items-end justify-end">
              <Button type="button" onClick={assign} disabled={loading || !selectedEvaluatorProfileId || selectedStudentIds.length === 0}>
                Assign
              </Button>
            </div>
          </div>

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1 text-left">SI.No</th>
                  <th className="px-2 py-1 text-left">Evaluator Name</th>
                  <th className="px-2 py-1 text-left">Evaluator Email</th>
                  <th className="px-2 py-1 text-left">Assigned Answer Sheets</th>
                  <th className="px-2 py-1 text-left">Evaluated Answer Sheets</th>
                  <th className="px-2 py-1 text-left">Due Answer Sheets</th>
                </tr>
              </thead>
              <tbody>
                {evaluatorRows.map((row, i) => (
                  <tr key={num(row.pk_exam_evaluator_profile_id) || i} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                    <td className="px-2 py-1">{txt(row.email)}</td>
                    <td
                      className="px-2 py-1 text-blue-700 cursor-pointer hover:underline"
                      onClick={() => openEvaluatorDetail(row, 'assigned')}
                    >
                      {num(row.no_of_students_assigned)}
                    </td>
                    <td
                      className="px-2 py-1 text-blue-700 cursor-pointer hover:underline"
                      onClick={() => openEvaluatorDetail(row, 'evaluated')}
                    >
                      {num(row.no_of_evaluations_completed)}
                    </td>
                    <td
                      className="px-2 py-1 text-blue-700 cursor-pointer hover:underline"
                      onClick={() => openEvaluatorDetail(row, 'due')}
                    >
                      {Math.max(num(row.no_of_students_assigned) - num(row.no_of_evaluations_completed), 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isClient &&
        detailOpen &&
        createPortal(
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
                <div className="mb-2">
                  <SearchInput
                    placeholder="Search…"
                    value={detailSearch}
                    onChange={setDetailSearch}
                    className="w-full max-w-sm"
                  />
                </div>
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left">SI.No</th>
                      <th className="px-2 py-1 text-left">OMR Serial No</th>
                      <th className="px-2 py-1 text-left">Evaluated Total Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDetailRows.map((r, i) => (
                      <tr key={`${num(r.fk_exam_evaluationassignment_id)}-${txt(r.omr_serial_no)}-${i}`} className="border-t">
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{txt(r.omr_serial_no ?? r.omrSerialNo)}</td>
                        <td className="px-2 py-1">{txt(r.evaluated_totalmarks ?? r.evaluatedTotalMarks) || '-'}</td>
                      </tr>
                    ))}
                    {filteredDetailRows.length === 0 && (
                      <tr className="border-t">
                        <td className="px-2 py-2 text-center text-muted-foreground" colSpan={3}>
                          No records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </FilteredPage>
  )
}

