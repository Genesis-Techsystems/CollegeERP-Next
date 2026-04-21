'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Select as SearchableSelect } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'
import {
  addMultipleEvaluationAssignments,
  getReEvaluatorDetailList,
  getReEvaluatorMasterList,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  updateReevaluationCount,
} from '@/services/evaluation'

type AnyRow = Record<string, unknown>

function evaluatorById(rows: AnyRow[], id: number): AnyRow | undefined {
  return rows.find((row) => num(row.pk_exam_evaluator_profile_id) === id)
}

export default function AssignReEvaluatorPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [isReevaluation, setIsReevaluation] = useState(false)

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [subjectMasterRows, setSubjectMasterRows] = useState<AnyRow[]>([])
  const [unmappedRows, setUnmappedRows] = useState<AnyRow[]>([])
  const [mappedRows, setMappedRows] = useState<AnyRow[]>([])
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([])
  const [bulkEvaluatorId, setBulkEvaluatorId] = useState<number | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [showSelected, setShowSelected] = useState(false)

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
  const evaluatorOptions = useMemo<SelectOption[]>(
    () =>
      evaluatorRows.map((r) => ({
        value: String(num(r.pk_exam_evaluator_profile_id)),
        label: txt(r.evaluator_name),
      })),
    [evaluatorRows],
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

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const rest = await getRegSupRestFilters({ courseId, academicYearId, examId, employeeId })
      setRestRows(rest)
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null)
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => setRegulationId(num(regulations[0]?.fk_regulation_id) || null), [regulations])

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

  function resetResult() {
    setSubjectMasterRows([])
    setUnmappedRows([])
    setMappedRows([])
    setEvaluatorRows([])
    setBulkEvaluatorId(null)
    setSelectedKeys([])
    setShowSelected(false)
  }

  async function getList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    resetResult()
    setLoading(true)
    try {
      const rows = await getReEvaluatorMasterList({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
        isReevaluation,
      })
      setSubjectMasterRows(rows)
    } finally {
      setLoading(false)
    }
  }

  function buildRowKey(row: AnyRow): string {
    return `${txt(row.omr_serial_no)}::${num(row.fk_exam_evaluator_profile_id)}`
  }

  function availableEvaluators(allEvaluators: AnyRow[], historyProfileIds: number[], currentProfileId: number): AnyRow[] {
    return allEvaluators.filter((row) => {
      const evaluatorId = num(row.pk_exam_evaluator_profile_id)
      if (evaluatorId === currentProfileId) return false
      return !historyProfileIds.includes(evaluatorId)
    })
  }

  async function getDetails(row: AnyRow) {
    setLoading(true)
    try {
      const details = await getReEvaluatorDetailList({
        organizationId: organizationId || 1,
        examId: num(row.fk_exam_id),
        courseYearId: num(row.fk_course_year_id),
        subjectId: num(row.fk_subject_id),
        regulationId: num(row.fk_regulation_id),
        courseId: num(row.fk_course_id),
        academicYearId: num(academicYearId),
        employeeId,
        isReevaluation,
      })

      const evaluationValidator = dedupeBy(details.evaluationValidator, (r) => txt(r.omr_serial_no))
      const mapped = evaluationValidator.filter((r) => num(r.is_mapped) === 1)
      const rawUnmapped = evaluationValidator.filter((r) => num(r.is_mapped) === 0)
      const uniqueEvaluators = dedupeBy(details.evaluatorList, (r) => num(r.pk_exam_evaluator_profile_id))

      const preparedUnmapped = rawUnmapped.map((item) => {
        const sameOmr = details.evaluationValidator.filter((r) => txt(r.omr_serial_no) === txt(item.omr_serial_no))
        const history = sameOmr
          .filter((r) => num(r.fk_exam_evaluator_profile_id) !== num(item.fk_exam_evaluator_profile_id))
          .map((r) => ({ name: txt(r.evaluator_name), marks: txt(r.evaluated_totalmarks), profileId: num(r.fk_exam_evaluator_profile_id) }))
        const available = availableEvaluators(
          uniqueEvaluators,
          history.map((h) => h.profileId),
          num(item.fk_exam_evaluator_profile_id),
        )
        return { ...item, history, availableEvaluators: available, assignEvaluatorProfileId: 0, assignEvaluatorName: '', examEvaluatorProfileDetId: 0 }
      })

      setMappedRows(mapped)
      setUnmappedRows(preparedUnmapped)
      setEvaluatorRows(uniqueEvaluators)
      setSelectedKeys([])
      setShowSelected(false)
    } finally {
      setLoading(false)
    }
  }

  function onBulkEvaluator(value: string | null) {
    const id = num(value)
    setBulkEvaluatorId(id || null)
    if (!id) return
    const selected = evaluatorById(evaluatorRows, id)
    setUnmappedRows((prev) =>
      prev.map((row) => {
        return {
          ...row,
          assignEvaluatorProfileId: id,
          assignEvaluatorName: txt(selected?.evaluator_name),
          examEvaluatorProfileDetId: num(selected?.pk_examevaluator_profiledet_id),
        }
      }),
    )
  }

  function onSingleEvaluator(rowKey: string, value: string | null) {
    const id = num(value)
    const selected = evaluatorById(evaluatorRows, id)
    setUnmappedRows((prev) =>
      prev.map((row) => {
        if (buildRowKey(row) !== rowKey) return row
        return {
          ...row,
          assignEvaluatorProfileId: id,
          assignEvaluatorName: txt(selected?.evaluator_name),
          examEvaluatorProfileDetId: num(selected?.pk_examevaluator_profiledet_id),
        }
      }),
    )
  }

  function toggleRow(rowKey: string, checked: boolean) {
    setSelectedKeys((prev) => (checked ? [...new Set([...prev, rowKey])] : prev.filter((k) => k !== rowKey)))
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedKeys([])
      return
    }
    setSelectedKeys(unmappedRows.map((r) => buildRowKey(r)))
  }

  const selectedRows = useMemo(
    () => unmappedRows.filter((r) => selectedKeys.includes(buildRowKey(r)) && num(r.assignEvaluatorProfileId) > 0),
    [unmappedRows, selectedKeys],
  )

  async function assignList() {
    if (!examId || !courseYearId || selectedRows.length === 0) return
    const payload = selectedRows.map((row) => ({
      collegeId: num(row.fk_college_id),
      examEvaluatorProfileDetId: num(row.examEvaluatorProfileDetId),
      questionPaperId: num(row.fk_exam_questionpaper_id),
      examEvaluatorProfileId: num(row.assignEvaluatorProfileId),
      examStdDetId: num(row.fk_exam_std_det_id),
      studentAnswerPaperId: num(row.fk_std_answerpaper_id),
      evaluationStatusCatDetId: 626,
      omrSerialNo: txt(row.omr_serial_no),
      isActive: true,
      isEvaluationValidator: true,
      isRevision: isReevaluation,
    }))

    setLoading(true)
    try {
      await addMultipleEvaluationAssignments(payload)
      if (isReevaluation) {
        await updateReevaluationCount({
          examId,
          subjectId: num(subjectMasterRows[0]?.fk_subject_id) || subjectId || 0,
          courseYearId,
        })
      }
      const baseSubject = subjectMasterRows[0]
      if (baseSubject) await getDetails(baseSubject)
    } finally {
      setLoading(false)
    }
  }

  const allChecked = unmappedRows.length > 0 && selectedKeys.length === unmappedRows.length

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Assign Re-Evaluator" subtitle="Assign validator evaluators for OMRs" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Assign Re-Evaluator</h2>
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
              <div className="md:col-span-3">
                <label className="inline-flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={isReevaluation} onChange={(e) => { setIsReevaluation(e.target.checked); resetResult() }} />
                  <span>Is Re-Evaluation</span>
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      {subjectMasterRows.length > 0 && (
        <div className="app-card p-3">
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">S.No</th>
                  <th className="px-2 py-1 text-left">Course</th>
                  <th className="px-2 py-1 text-left">Exam</th>
                  <th className="px-2 py-1 text-left">Course Year</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-left">Total Papers</th>
                  <th className="px-2 py-1 text-left">Mapped Papers</th>
                  <th className="px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjectMasterRows.map((row, i) => (
                  <tr key={`master-${i}-${num(row.fk_subject_id)}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{txt(row.course_code)}</td>
                    <td className="px-2 py-1">{txt(row.exam_month_yr)}</td>
                    <td className="px-2 py-1">{txt(row.course_year_code)}</td>
                    <td className="px-2 py-1">{txt(row.subject_code)} - {txt(row.subject_name)}</td>
                    <td className="px-2 py-1">{num(row.total_papers)}</td>
                    <td className="px-2 py-1">{num(row.mapped_papers)}</td>
                    <td className="px-2 py-1"><Button type="button" size="sm" onClick={() => void getDetails(row)}>Get Details</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unmappedRows.length > 0 && (
        <div className="app-card p-3 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div className="w-full max-w-xs">
              <Label>Evaluator (Bulk)</Label>
              <SearchableSelect value={bulkEvaluatorId ? String(bulkEvaluatorId) : null} onChange={onBulkEvaluator} options={evaluatorOptions} placeholder="Select evaluator..." searchable />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSelected(true)} disabled={selectedRows.length === 0}>Add</Button>
              <Button type="button" onClick={() => void assignList()} disabled={selectedRows.length === 0 || loading}>Assign</Button>
            </div>
          </div>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left"><input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /></th>
                  <th className="px-2 py-1 text-left">OMR Serial</th>
                  <th className="px-2 py-1 text-left">Evaluator</th>
                  <th className="px-2 py-1 text-left">Subject Marks</th>
                  <th className="px-2 py-1 text-left">Assign Evaluator</th>
                </tr>
              </thead>
              <tbody>
                {unmappedRows.map((row, i) => {
                  const key = buildRowKey(row)
                  return (
                    <tr key={`unmapped-${key}-${i}`} className="border-t align-top">
                      <td className="px-2 py-1"><input type="checkbox" checked={selectedKeys.includes(key)} onChange={(e) => toggleRow(key, e.target.checked)} /></td>
                      <td className="px-2 py-1">{txt(row.omr_serial_no)}</td>
                      <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                      <td className="px-2 py-1">{txt(row.evaluated_totalmarks)}</td>
                      <td className="px-2 py-1 min-w-[220px]">
                        <SearchableSelect
                          value={num(row.assignEvaluatorProfileId) ? String(num(row.assignEvaluatorProfileId)) : null}
                          onChange={(v) => onSingleEvaluator(key, v)}
                          options={(row.availableEvaluators as AnyRow[] | undefined)?.map((e) => ({ value: String(num(e.pk_exam_evaluator_profile_id)), label: txt(e.evaluator_name) })) ?? []}
                          placeholder="Select evaluator..."
                          searchable
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {showSelected && selectedRows.length > 0 && (
            <div className="overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left">S.No</th>
                    <th className="px-2 py-1 text-left">OMR</th>
                    <th className="px-2 py-1 text-left">Current Evaluator</th>
                    <th className="px-2 py-1 text-left">Assigned Evaluator</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row, i) => (
                    <tr key={`sel-${buildRowKey(row)}-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{txt(row.omr_serial_no)}</td>
                      <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                      <td className="px-2 py-1">{txt(row.assignEvaluatorName)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {mappedRows.length > 0 && (
        <div className="app-card p-3">
          <h3 className="text-[14px] font-semibold text-blue-700 mb-2">Assigned List</h3>
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">S.No</th>
                  <th className="px-2 py-1 text-left">Evaluator Name</th>
                  <th className="px-2 py-1 text-left">OMR Serial Number</th>
                  <th className="px-2 py-1 text-left">Validator Evaluator</th>
                  <th className="px-2 py-1 text-left">Marks</th>
                </tr>
              </thead>
              <tbody>
                {mappedRows.map((row, i) => (
                  <tr key={`mapped-${i}-${txt(row.omr_serial_no)}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                    <td className="px-2 py-1">{txt(row.omr_serial_no)}</td>
                    <td className="px-2 py-1">{txt(row.validator_evaluator_name)}</td>
                    <td className="px-2 py-1">{txt(row.validator_evaluated_totalmarks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

