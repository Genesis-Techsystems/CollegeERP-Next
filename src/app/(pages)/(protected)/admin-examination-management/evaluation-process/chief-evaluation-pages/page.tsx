'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { PageContainer, PageHeader } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  assignChiefEvaluation,
  getChiefEvaluationFilters,
  getChiefEvaluationSubjectFilters,
  getChiefEvaluatorDetails,
  getEvalSetting,
  listChiefEvaluationRows,
} from '@/services'

type AnyRow = Record<string, any>

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const key of keys) {
    const value = Number(row[key])
    if (value > 0) return value
  }
  return 0
}

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value)
  }
  return ''
}

const dedupeBy = <T,>(rows: T[], keyFn: (row: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function ChiefEvaluationPagesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([])
  const [evaluationRows, setEvaluationRows] = useState<AnyRow[]>([])
  const [chiefDetails, setChiefDetails] = useState<AnyRow[]>([])
  const [settingValue, setSettingValue] = useState('')
  const [hasFetched, setHasFetched] = useState(false)

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 1)

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
    () => dedupeBy(subjectFilterRows, (r) => pickNum(r, ['fk_course_year_id', 'courseYearId'])),
    [subjectFilterRows],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter((r) => pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)),
        (r) => pickNum(r, ['fk_regulation_id', 'regulationId']),
      ),
    [subjectFilterRows, courseYearId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter(
          (r) =>
            pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId) &&
            pickNum(r, ['fk_regulation_id', 'regulationId']) === Number(regulationId),
        ),
        (r) => pickNum(r, ['fk_subject_id', 'subjectId']),
      ),
    [subjectFilterRows, courseYearId, regulationId],
  )

  const uniqueOmrRows = useMemo(
    () => dedupeBy(evaluationRows, (r) => pickText(r, ['omr_serial_no', 'omrSerialNo'])),
    [evaluationRows],
  )
  const filteredOmrRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return uniqueOmrRows
    return uniqueOmrRows.filter((r) => String(r?.omr_serial_no ?? '').toLowerCase().includes(term))
  }, [uniqueOmrRows, search])

  const selectedCourseLabel = useMemo(
    () => pickText(courses.find((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)), ['course_code', 'courseCode']),
    [courses, courseId],
  )
  const selectedExamLabel = useMemo(
    () => pickText(exams.find((r) => pickNum(r, ['fk_exam_id', 'examId']) === Number(examId)), ['exam_name', 'examName']),
    [exams, examId],
  )
  const selectedCourseYearLabel = useMemo(
    () =>
      pickText(
        courseYears.find((r) => pickNum(r, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)),
        ['course_year_code', 'courseYearCode'],
      ),
    [courseYears, courseYearId],
  )
  const selectedSubject = useMemo(
    () => subjects.find((r) => pickNum(r, ['fk_subject_id', 'subjectId']) === Number(subjectId)) ?? null,
    [subjects, subjectId],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [filters, pdfSetting] = await Promise.all([
          getChiefEvaluationFilters(employeeId).catch(() => []),
          getEvalSetting('EVALPDFSTARTEND').catch(() => null),
        ])
        const rows = Array.isArray(filters) ? filters : []
        setBaseRows(rows)
        setSettingValue(pdfSetting ?? '')
        if (rows[0]) {
          setCourseId(pickNum(rows[0], ['fk_course_id', 'courseId']))
        }
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
    async function loadSubjectFilters() {
      if (!courseId || !academicYearId || !examId) return
      const rows = await getChiefEvaluationSubjectFilters({
        courseId,
        academicYearId,
        examId,
        employeeId,
      }).catch(() => [])
      const list = Array.isArray(rows) ? rows : []
      setSubjectFilterRows(list)
      setCourseYearId(pickNum(list[0], ['fk_course_year_id', 'courseYearId']) || null)
    }
    void loadSubjectFilters()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (regulations[0]) setRegulationId(pickNum(regulations[0], ['fk_regulation_id', 'regulationId']))
  }, [regulations])

  useEffect(() => {
    if (subjects[0]) setSubjectId(pickNum(subjects[0], ['fk_subject_id', 'subjectId']))
  }, [subjects])

  useEffect(() => {
    setEvaluationRows([])
    setChiefDetails([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId, courseYearId, regulationId, subjectId])

  function getEvaluation(serialNo: string, evaluatorNumber: number) {
    return evaluationRows.find(
      (row) =>
        String(row?.omr_serial_no ?? '') === serialNo && Number(row?.evaluator_number ?? 0) === evaluatorNumber,
    )
  }

  function routeToEvaluation(assignmentId: number, studentAnswerPaperId: number) {
    const params = new URLSearchParams({
      examEvaluationAssignmentId: String(assignmentId),
      studentAnswerPaperId: String(studentAnswerPaperId),
      examEvaluatorProfileId: String(pickNum(chiefDetails[0], ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])),
      examEvaluatorProfileDetId: String(
        pickNum(chiefDetails[0], ['fk_examevaluator_profiledet_id', 'examEvaluatorProfileDetId']),
      ),
      subjectName: pickText(selectedSubject, ['subject_name', 'subjectName']),
      subjectCode: pickText(selectedSubject, ['subject_code', 'subjectCode']),
      settingValue,
      isChiefEvaluation: 'true',
    })
    router.push(`/admin-examination-management/evaluation-process/evaluator-subjects/paper?${params.toString()}`)
  }

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) {
      toastError('Please select all filters.')
      return
    }
    setLoading(true)
    try {
      const [rows, chief] = await Promise.all([
        listChiefEvaluationRows({
          employeeId,
          organizationId,
          examId,
          courseId,
          academicYearId,
          courseYearId,
          regulationId,
          subjectId,
        }).catch(() => []),
        getChiefEvaluatorDetails({
          employeeId,
          organizationId,
          examId,
          courseId,
          academicYearId,
          courseYearId,
          regulationId,
          subjectId,
        }).catch(() => []),
      ])
      setEvaluationRows(Array.isArray(rows) ? rows : [])
      setChiefDetails(Array.isArray(chief) ? chief : [])
      setHasFetched(true)
    } finally {
      setLoading(false)
    }
  }

  async function onEdit(serialNo: string, evaluatorNumber: number) {
    const evaluation = getEvaluation(serialNo, evaluatorNumber)
    const chiefProfileId = pickNum(chiefDetails[0], ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])
    if (!evaluation || chiefProfileId <= 0) {
      toastError('Unable to open this assignment.')
      return
    }

    const currentStatus = pickNum(evaluation, ['fk_evaluationstatus_catdet_id', 'evaluationStatusCatDetId'])
    const assignmentId = pickNum(evaluation, ['pk_exam_evaluationassignment_id', 'examEvaluationAssignmentId'])
    const answerPaperId = pickNum(evaluation, ['fk_std_answerpaper_id', 'studentAnswerPaperId'])
    const assignedProfileId = pickNum(evaluation, ['fk_exam_evaluator_profile_id', 'examEvaluatorProfileId'])

    if (assignmentId <= 0 || answerPaperId <= 0) {
      toastError('Invalid evaluation assignment.')
      return
    }

    if (assignedProfileId === chiefProfileId) {
      if ([629, 630, 631].includes(currentStatus)) {
        toastSuccess('You have completed the evaluation.')
        return
      }
      routeToEvaluation(assignmentId, answerPaperId)
      return
    }

    setLoading(true)
    try {
      const result = await assignChiefEvaluation({
        evaluatorProfileId: chiefProfileId,
        evaluatorProfileDetId: pickNum(chiefDetails[0], ['fk_examevaluator_profiledet_id', 'examEvaluatorProfileDetId']),
        examEvaluationAssignmentId: assignmentId,
        omrSerialNo: String(evaluation?.omr_serial_no ?? serialNo),
      })
      const row = (result as AnyRow)?.result?.[0]?.[0] ?? {}
      const newId = Number(row?.new_evalassignment_id ?? 0)
      if (String(row?.Flag ?? '').toLowerCase() === 'success' && newId > 0) {
        routeToEvaluation(newId, answerPaperId)
      } else {
        toastSuccess(String(row?.Flag ?? 'Assignment updated.'))
      }
    } catch (error) {
      toastError(error, 'Failed to assign chief evaluation')
    } finally {
      setLoading(false)
    }
  }

  const courseOptions = useMemo<SelectOption[]>(
    () =>
      courses.map((row) => ({
        value: String(pickNum(row, ['fk_course_id', 'courseId'])),
        label: pickText(row, ['course_code', 'courseCode', 'course_name', 'courseName']),
      })),
    [courses],
  )
  const yearOptions = useMemo<SelectOption[]>(
    () =>
      academicYears.map((row) => ({
        value: String(pickNum(row, ['fk_academic_year_id', 'academicYearId'])),
        label: pickText(row, ['academic_year', 'academicYear']),
      })),
    [academicYears],
  )
  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((row) => ({
        value: String(pickNum(row, ['fk_exam_id', 'examId'])),
        label: pickText(row, ['exam_name', 'examName']),
      })),
    [exams],
  )
  const courseYearOptions = useMemo<SelectOption[]>(
    () =>
      courseYears.map((row) => ({
        value: String(pickNum(row, ['fk_course_year_id', 'courseYearId'])),
        label: pickText(row, ['course_year_code', 'courseYearCode']),
      })),
    [courseYears],
  )
  const regulationOptions = useMemo<SelectOption[]>(
    () =>
      regulations.map((row) => ({
        value: String(pickNum(row, ['fk_regulation_id', 'regulationId'])),
        label: pickText(row, ['regulation_code', 'regulationCode']),
      })),
    [regulations],
  )
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((row) => ({
        value: String(pickNum(row, ['fk_subject_id', 'subjectId'])),
        label: `${pickText(row, ['subject_name', 'subjectName'])} - ${pickText(row, ['subject_code', 'subjectCode'])}`,
      })),
    [subjects],
  )

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Chief Evaluation Pages" subtitle="Review evaluator marks and continue chief evaluation" />

      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Chief Evaluation Pages</h2>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Course</Label>
              <Select value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
              <Select value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={yearOptions} placeholder="Academic Year" />
            </div>
            <div className="md:col-span-4">
              <Label className="text-[12px] text-muted-foreground">Exam</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => setExamId(v ? Number(v) : null)}
                options={examOptions}
                placeholder="Exam"
                searchable
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Course Year</Label>
              <Select value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Regulation</Label>
              <Select value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} placeholder="Regulation" />
            </div>
            <div className="md:col-span-10">
              <Label className="text-[12px] text-muted-foreground">Subject</Label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => setSubjectId(v ? Number(v) : null)}
                options={subjectOptions}
                placeholder="Subject"
                searchable
              />
            </div>
            <div className="md:col-span-2">
              <Button className="h-8 px-3 text-[12px] w-full" onClick={() => void onGetList()} disabled={loading}>
                Get List
              </Button>
            </div>
          </div>
        </div>
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-blue-700 font-medium">
              {selectedCourseLabel} / {selectedExamLabel} / {selectedCourseYearLabel}
            </div>
            <div className="w-full max-w-xs">
              <SearchInput className="w-full max-w-sm" placeholder="Search OMR serial no…" value={search} onChange={setSearch} />
            </div>
          </div>
          <div className="p-4 overflow-auto">
            <table className="w-full text-[13px] min-w-[860px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-2 w-16">S.No</th>
                  <th className="text-left px-3 py-2">Omr Serial No</th>
                  <th className="text-left px-3 py-2">Evaluator 1</th>
                  <th className="text-left px-3 py-2">Evaluator 2</th>
                  <th className="text-left px-3 py-2">Evaluator 3</th>
                  <th className="text-left px-3 py-2">Final Marks</th>
                </tr>
              </thead>
              <tbody>
                {filteredOmrRows.map((row, index) => {
                  const serialNo = String(row?.omr_serial_no ?? '')
                  const e1 = getEvaluation(serialNo, 1)
                  const e2 = getEvaluation(serialNo, 2)
                  const e3 = getEvaluation(serialNo, 3)
                  return (
                    <tr key={`${serialNo}-${index}`} className="border-t">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">{serialNo || '-'}</td>
                      <td className="px-3 py-2">
                        {String(e1?.evaluated_totalmarks ?? '')}
                        {e1?.evaluated_totalmarks != null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-8 w-8 p-0"
                            aria-label="Edit evaluator 1 marks"
                            onClick={() => void onEdit(serialNo, 1)}
                          >
                            <PencilIcon className="h-3.5 w-3.5 text-blue-700" />
                          </Button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {String(e2?.evaluated_totalmarks ?? '')}
                        {e2?.evaluated_totalmarks != null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-8 w-8 p-0"
                            aria-label="Edit evaluator 2 marks"
                            onClick={() => void onEdit(serialNo, 2)}
                          >
                            <PencilIcon className="h-3.5 w-3.5 text-blue-700" />
                          </Button>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {String(e3?.evaluated_totalmarks ?? '')}
                        {e3?.evaluated_totalmarks != null && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-8 w-8 p-0"
                            aria-label="Edit evaluator 3 marks"
                            onClick={() => void onEdit(serialNo, 3)}
                          >
                            <PencilIcon className="h-3.5 w-3.5 text-blue-700" />
                          </Button>
                        )}
                      </td>
                      <td className="px-3 py-2">{String(row?.final_marks ?? '-')}</td>
                    </tr>
                  )
                })}
                {filteredOmrRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
