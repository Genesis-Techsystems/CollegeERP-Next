'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { GraduationCap } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select as CommonSelect } from '@/common/components/select'
import {
  getExamMarksEntryFilters,
  getExamMarksEntryRestFilters,
  getExamMarksEntrySubjects,
  getExamTypeMarkDetails,
  saveInternalMarksEntry,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'
import { listExamFeeTypes } from '@/services/pre-examination'

type AnyRow = Record<string, any>

function dedupeBy<T extends AnyRow>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of arr) {
    const value = String(row?.[key] ?? '')
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(row)
  }
  return out
}

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = row?.[key]
    const num = Number(value)
    if (Number.isFinite(num) && num > 0) return num
  }
  return 0
}

function MarksInputRenderer(params: ICellRendererParams<AnyRow> & { maxMarks?: number; onChange: (row: AnyRow, value: number) => void }) {
  const val = Number(params.data?.marks ?? 0)
  const disabled = params.data?.isPresent !== true
  const max = params.maxMarks && params.maxMarks > 0 ? params.maxMarks : undefined
  return (
    <Input
      type="number"
      min={0}
      max={max}
      className="h-8 text-[12px]"
      value={Number.isFinite(val) ? String(val) : '0'}
      disabled={disabled}
      onChange={(e) => params.data && params.onChange(params.data, Number(e.target.value || 0))}
    />
  )
}

function attendanceText(row: AnyRow): string {
  if (row?.isPresent === true) return 'Present'
  if (row?.isPresent === false) return 'Absent'
  return 'Not Marked'
}

export default function ExamMarksEntryPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const empNumber = globalThis?.localStorage?.getItem('empNumber') ?? ''
  const userName = globalThis?.localStorage?.getItem('userName') ?? ''

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const [allFilters, setAllFilters] = useState<AnyRow[]>([])
  const [restFilters, setRestFilters] = useState<AnyRow[]>([])
  const [regRows, setRegRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [allExamFeeTypes, setAllExamFeeTypes] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examTypeId, setExamTypeId] = useState<number>(0)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [labBatchId, setLabBatchId] = useState(0)
  const [examDate, setExamDate] = useState('')

  const employeeDisplay = userName ? `${empNumber} (${userName})` : empNumber

  const courses = useMemo(() => dedupeBy(allFilters, 'fk_course_id'), [allFilters])
  const academicYears = useMemo(
    () => dedupeBy(allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)), 'fk_academic_year_id'),
    [allFilters, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allFilters.filter(
          (x) => Number(x.fk_course_id) === Number(courseId) && Number(x.fk_academic_year_id) === Number(academicYearId),
        ),
        'fk_exam_id',
      ),
    [allFilters, courseId, academicYearId],
  )
  const examTypes = useMemo(() => {
    const ex = exams.find((x) => Number(x.fk_exam_id) === Number(examId))
    const opts: Array<{ id: number; code: string }> = [{ id: 0, code: 'All' }]
    const types = Array.isArray(allExamFeeTypes) ? allExamFeeTypes : []
    const regular = types.find((t) => String(t.generalDetailCode ?? '').toLowerCase() === 'regular')
    const supple = types.find((t) => String(t.generalDetailCode ?? '').toLowerCase() === 'supple')
    const internal = types.find((t) => String(t.generalDetailCode ?? '').toLowerCase() === 'internal')
    if (ex?.is_regular_exam && regular?.generalDetailId) opts.push({ id: Number(regular.generalDetailId), code: 'Regular' })
    if (ex?.is_supply_exam && supple?.generalDetailId) opts.push({ id: Number(supple.generalDetailId), code: 'Supple' })
    if (ex?.is_internal_exam && internal?.generalDetailId) opts.push({ id: Number(internal.generalDetailId), code: 'Internal' })
    return opts
  }, [exams, examId, allExamFeeTypes])
  const colleges = useMemo(() => dedupeBy(restFilters, 'fk_college_id'), [restFilters])
  const courseGroups = useMemo(
    () => dedupeBy(restFilters.filter((x) => Number(x.fk_college_id) === Number(collegeId)), 'fk_course_group_id'),
    [restFilters, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) => Number(x.fk_college_id) === Number(collegeId) && Number(x.fk_course_group_id) === Number(courseGroupId),
        ),
        'fk_course_year_id',
      ),
    [restFilters, collegeId, courseGroupId],
  )
  const regulations = useMemo(() => dedupeBy(regRows, 'fk_regulation_id'), [regRows])
  const regulationsFlex = useMemo(() => {
    const source = (regRows.length > 0 ? regRows : restFilters).filter((r) => {
      return (
        numFrom(r, ['fk_regulation_id', 'regulationId', 'regulation_id']) > 0 ||
        String(r?.flag ?? '').toLowerCase() === 'regulations'
      )
    })
    const seen = new Set<number>()
    const out: AnyRow[] = []
    for (const row of source) {
      const id = numFrom(row, ['fk_regulation_id', 'regulationId', 'regulation_id'])
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(row)
    }
    return out
  }, [regRows, restFilters])
  const subjectTypes = useMemo(
    () => {
      const currentRegId = Number(regulationId ?? 0)
      const filtered = subjectRows.filter((x) => {
        const rowRegId = numFrom(x, ['fk_regulation_id', 'regulationId', 'regulation_id'])
        return rowRegId === 0 || currentRegId === 0 || rowRegId === currentRegId
      })
      const seen = new Set<number>()
      const out: AnyRow[] = []
      for (const row of filtered) {
        const id = numFrom(row, ['fk_subjecttype_catdet_id', 'subjectTypeId', 'subject_type_id'])
        if (!id || seen.has(id)) continue
        seen.add(id)
        out.push(row)
      }
      return out
    },
    [subjectRows, regulationId],
  )
  const subjects = useMemo(
    () => {
      const currentRegId = Number(regulationId ?? 0)
      const currentTypeId = Number(subjectTypeId ?? 0)
      const filtered = subjectRows.filter((x) => {
        const rowRegId = numFrom(x, ['fk_regulation_id', 'regulationId', 'regulation_id'])
        const rowTypeId = numFrom(x, ['fk_subjecttype_catdet_id', 'subjectTypeId', 'subject_type_id'])
        const regMatch = rowRegId === 0 || currentRegId === 0 || rowRegId === currentRegId
        const typeMatch = rowTypeId === 0 || currentTypeId === 0 || rowTypeId === currentTypeId
        return regMatch && typeMatch
      })
      const seen = new Set<number>()
      const out: AnyRow[] = []
      for (const row of filtered) {
        const id = numFrom(row, ['fk_subject_id', 'subjectId', 'subject_id', 'fk_sub_id'])
        if (!id || seen.has(id)) continue
        seen.add(id)
        out.push(row)
      }
      return out
    },
    [subjectRows, regulationId, subjectTypeId],
  )
  const labBatches = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter((x) => Number(x.fk_subject_id) === Number(subjectId) && Number(x.fk_exam_labbatch_id ?? 0) > 0),
        'fk_exam_labbatch_id',
      ),
    [subjectRows, subjectId],
  )

  useEffect(() => {
    async function run() {
      setLoading(true)
      try {
        const [filtersData, feeTypesData] = await Promise.all([
          getExamMarksEntryFilters(employeeId).catch(() => []),
          listExamFeeTypes().catch(() => []),
        ])
        setAllFilters(Array.isArray(filtersData) ? filtersData : [])
        setAllExamFeeTypes(Array.isArray(feeTypesData) ? feeTypesData : [])
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [employeeId])
  useEffect(() => {
    if (courses[0]?.fk_course_id) setCourseId(Number(courses[0].fk_course_id))
  }, [courses])
  useEffect(() => {
    if (academicYears[0]?.fk_academic_year_id) setAcademicYearId(Number(academicYears[0].fk_academic_year_id))
  }, [academicYears])
  useEffect(() => {
    if (exams[0]?.fk_exam_id) setExamId(Number(exams[0].fk_exam_id))
  }, [exams])
  useEffect(() => {
    setExamTypeId(examTypes[0]?.id ?? 0)
  }, [examTypes])

  useEffect(() => {
    async function run() {
      setRestFilters([])
      setRegRows([])
      setSubjectRows([])
      if (!courseId || !examId || !academicYearId) return
      const data = await getExamMarksEntryRestFilters({ courseId, examId, academicYearId, employeeId }).catch(() => ({
        restFilters: [],
        regulations: [],
      }))
      setRestFilters(Array.isArray(data.restFilters) ? data.restFilters : [])
      setRegRows(Array.isArray(data.regulations) ? data.regulations : [])
    }
    void run()
  }, [courseId, examId, academicYearId, employeeId])

  useEffect(() => {
    if (colleges[0]?.fk_college_id) setCollegeId(Number(colleges[0].fk_college_id))
  }, [colleges])
  useEffect(() => {
    if (courseGroups[0]?.fk_course_group_id) setCourseGroupId(Number(courseGroups[0].fk_course_group_id))
  }, [courseGroups])
  useEffect(() => {
    if (courseYears[0]?.fk_course_year_id) setCourseYearId(Number(courseYears[0].fk_course_year_id))
  }, [courseYears])
  useEffect(() => {
    const first = regulationsFlex[0]
    const id = numFrom(first ?? {}, ['fk_regulation_id', 'regulationId', 'regulation_id'])
    if (id > 0) setRegulationId(id)
  }, [regulationsFlex])

  useEffect(() => {
    async function run() {
      setSubjectRows([])
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId || !regulationId) return
      const data = await getExamMarksEntrySubjects({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        regulationId,
        employeeId,
      }).catch(() => [])
      setSubjectRows(Array.isArray(data) ? data : [])
    }
    void run()
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, regulationId, employeeId])

  useEffect(() => {
    const first = subjectTypes[0]
    const id = numFrom(first ?? {}, ['fk_subjecttype_catdet_id', 'subjectTypeId', 'subject_type_id'])
    if (id > 0) setSubjectTypeId(id)
  }, [subjectTypes])
  useEffect(() => {
    const first = subjects[0]
    const id = numFrom(first ?? {}, ['fk_subject_id', 'subjectId', 'subject_id', 'fk_sub_id'])
    if (id > 0) setSubjectId(id)
  }, [subjects])
  useEffect(() => {
    setExamDate(String(subjects[0]?.exam_date ?? '').slice(0, 10))
  }, [subjects])

  function onMarkChange(target: AnyRow, marks: number) {
    const sid = Number(target.studentId ?? target.fk_student_id ?? 0)
    let parsed = Number(marks)
    if (!Number.isFinite(parsed) || parsed < 0) parsed = 0
    if (maxMarks > 0 && parsed > maxMarks) {
      parsed = maxMarks
      toastError(`Entered marks should not exceed ${maxMarks}.`)
    }
    setRows((prev) =>
      prev.map((row) => {
        const rid = Number(row.studentId ?? row.fk_student_id ?? 0)
        if (sid > 0 ? rid !== sid : String(row.hallticketNumber) !== String(target.hallticketNumber)) return row
        return { ...row, marks: parsed }
      }),
    )
  }

  async function onGetList() {
    if (!collegeId || !courseId || !examId || !courseGroupId || !courseYearId || !regulationId || !subjectId || !examDate) return
    setLoading(true)
    setHasFetched(true)
    try {
      const data = await getExamTypeMarkDetails({
        collegeId,
        courseId,
        examId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        labBatchId,
        examDate,
        examTypeId,
      }).catch(() => [])
      setRows((Array.isArray(data) ? data : []).map((r) => ({ ...r, marks: Number(r.marks ?? 0) })))
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    if (rows.length === 0 || !collegeId || !courseId || !examId || !courseYearId || !subjectId || !regulationId) return
    setSaving(true)
    try {
      const payload = rows.map((row) => ({
        examStudentDetailDTO: {
          ...row,
          marksEnteredEmpId: employeeId,
          courseId,
          regulationId,
          subjectTypeId,
          credits: row.isPass ? Number(row.sub_credits ?? 0) : 0,
        },
        examStudentInternalMarkDTO:
          row.examTypeCode === 'Internal'
            ? {
                examDate,
                isActive: true,
                isPresent: Boolean(row.isPresent),
                isPublished: false,
                marks: Number(row.marks ?? 0),
                collegeId,
                studentId: Number(row.studentId ?? row.fk_student_id ?? 0),
                courseYearId,
                subjectId,
                examId,
                employeeId,
                examStdInternalMarkId: row.examStdInternalMarkId ?? row.exam_std_internal_mark_id ?? 0,
              }
            : null,
      }))
      await saveInternalMarksEntry(payload)
      toastSuccess('Marks saved successfully')
      await onGetList()
    } catch (e) {
      toastError(e, 'Failed to save marks')
    } finally {
      setSaving(false)
    }
  }

  const maxMarks = useMemo(() => Number(rows.find((r) => Number(r.maxMarks ?? r.externalmarks ?? r.internalmarks ?? 0) > 0)?.maxMarks ?? 0), [rows])

  const selectedExam = useMemo(() => exams.find((x) => Number(x.fk_exam_id) === Number(examId)), [exams, examId])
  const selectedCollege = useMemo(() => colleges.find((x) => Number(x.fk_college_id) === Number(collegeId)), [colleges, collegeId])
  const selectedCourse = useMemo(() => courses.find((x) => Number(x.fk_course_id) === Number(courseId)), [courses, courseId])
  const selectedGroup = useMemo(() => courseGroups.find((x) => Number(x.fk_course_group_id) === Number(courseGroupId)), [courseGroups, courseGroupId])
  const selectedYear = useMemo(() => courseYears.find((x) => Number(x.fk_course_year_id) === Number(courseYearId)), [courseYears, courseYearId])
  const selectedRegulation = useMemo(() => regulations.find((x) => Number(x.fk_regulation_id) === Number(regulationId)), [regulations, regulationId])
  const selectedSubject = useMemo(() => subjects.find((x) => Number(x.fk_subject_id) === Number(subjectId)), [subjects, subjectId])
  const selectedAy = useMemo(() => academicYears.find((x) => Number(x.fk_academic_year_id) === Number(academicYearId)), [academicYears, academicYearId])
  const courseOptions = useMemo(() => courses.map((x) => ({ value: String(x.fk_course_id), label: String(x.course_code ?? '') })), [courses])
  const academicYearOptions = useMemo(() => academicYears.map((x) => ({ value: String(x.fk_academic_year_id), label: String(x.academic_year ?? '') })), [academicYears])
  const examOptions = useMemo(() => exams.map((x) => ({ value: String(x.fk_exam_id), label: String(x.exam_name ?? '') })), [exams])
  const examTypeOptions = useMemo(() => examTypes.map((t) => ({ value: String(t.id), label: String(t.code ?? '') })), [examTypes])
  const collegeOptions = useMemo(() => colleges.map((x) => ({ value: String(x.fk_college_id), label: String(x.college_code ?? '') })), [colleges])
  const groupOptions = useMemo(() => courseGroups.map((x) => ({ value: String(x.fk_course_group_id), label: String(x.group_code ?? '') })), [courseGroups])
  const courseYearOptions = useMemo(() => courseYears.map((x) => ({ value: String(x.fk_course_year_id), label: String(x.course_year_code ?? '') })), [courseYears])
  const regulationOptions = useMemo(
    () =>
      regulationsFlex
        .map((x) => {
          const id = numFrom(x, ['fk_regulation_id', 'regulationId', 'regulation_id'])
          if (id <= 0) return null
          return { value: String(id), label: String(x.regulation_code ?? x.regulationCode ?? x.regulation_name ?? '-') }
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [regulationsFlex],
  )
  const subjectTypeOptions = useMemo(
    () =>
      subjectTypes
        .map((x) => {
          const id = numFrom(x, ['fk_subjecttype_catdet_id', 'subjectTypeId', 'subject_type_id'])
          if (id <= 0) return null
          return { value: String(id), label: String(x.subject_type ?? x.subjectType ?? '-') }
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [subjectTypes],
  )
  const subjectOptions = useMemo(
    () =>
      subjects
        .map((x) => {
          const id = numFrom(x, ['fk_subject_id', 'subjectId', 'subject_id', 'fk_sub_id'])
          if (id <= 0) return null
          return {
            value: String(id),
            label: `${String(x.subject_name ?? x.subjectName ?? '-')} (${String(x.subject_code ?? x.subjectCode ?? '-')})`,
          }
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [subjects],
  )
  const labBatchOptions = useMemo(
    () => [{ value: '0', label: 'All' }, ...labBatches.map((x) => ({ value: String(x.fk_exam_labbatch_id), label: String(x.labbatch_name ?? '-') }))],
    [labBatches],
  )

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: 'SI No', width: 70, flex: 0, valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1 },
      { field: 'hallticketNumber', headerName: 'Hallticket Number', minWidth: 140 },
      { field: 'firstName', headerName: 'Student', minWidth: 240, flex: 1 },
      {
        headerName: 'Attendance Status',
        minWidth: 140,
        valueGetter: (p: any) => attendanceText(p.data),
      },
      { headerName: 'Marks', minWidth: 120, cellRenderer: MarksInputRenderer, cellRendererParams: { maxMarks, onChange: onMarkChange } },
    ],
    [maxMarks],
  )

  return (
    <FilteredListPage
      title="Exam Marks Entry"
      filters={(
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="space-y-1 md:col-span-2"><Label>Course *</Label><CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Academic Year *</Label><CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYearOptions} placeholder="Academic Year" /></div>
            <div className="space-y-1 md:col-span-6"><Label>Exam *</Label><CommonSelect value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam" searchable /></div>
            <div className="space-y-1 md:col-span-2"><Label>Exam Type *</Label><CommonSelect value={String(examTypeId)} onChange={(v) => setExamTypeId(Number(v || 0))} options={examTypeOptions} placeholder="Exam Type" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Faculty *</Label><CommonSelect value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={collegeOptions} placeholder="Faculty" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Course Group *</Label><CommonSelect value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={groupOptions} placeholder="Course Group" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Course Year *</Label><CommonSelect value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><CommonSelect value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(v ? Number(v) : null)} options={regulationOptions} placeholder="Regulation" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Subject Type</Label><CommonSelect value={subjectTypeId ? String(subjectTypeId) : null} onChange={(v) => setSubjectTypeId(v ? Number(v) : null)} options={subjectTypeOptions} placeholder="Subject Type" /></div>
            <div className="space-y-1 md:col-span-2"><Label>Subject</Label><CommonSelect value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(v ? Number(v) : null)} options={subjectOptions} placeholder="Subject" searchable /></div>
            {labBatches.length > 0 && <div className="space-y-1 md:col-span-2"><Label>Lab Batch</Label><CommonSelect value={String(labBatchId)} onChange={(v) => setLabBatchId(Number(v || 0))} options={labBatchOptions} placeholder="All" /></div>}
            <div className="space-y-1 md:col-span-2"><Label>Employee</Label><Input className="h-8 text-[12px]" value={employeeDisplay} readOnly /></div>
            <div className="space-y-1 md:col-span-2"><Label>Exam Date</Label><Input className="h-8 text-[12px]" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
            <div className="md:col-span-2"><Button className="h-8 text-[12px] w-full" onClick={onGetList} disabled={loading}>{loading ? 'Loading...' : 'Get List'}</Button></div>
          </div>
          {hasFetched ? (
            <div className="overflow-hidden rounded-md border border-[#c3d9ff]">
              <div className="flex items-start gap-4 p-3">
                <div className="flex h-20 w-24 shrink-0 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px]">
                  <p className="text-slate-700">
                    {selectedExam?.exam_name ?? '-'}{' '}
                    {examDate ? <span className="text-blue-700">({examDate})</span> : null}
                  </p>
                  <p className="text-muted-foreground">
                    / {selectedCollege?.college_code ?? '-'} / {selectedCourse?.course_code ?? '-'} /{' '}
                    {selectedGroup?.group_code ?? '-'} / {selectedYear?.course_year_code ?? '-'} /{' '}
                    <span className="text-blue-700">({selectedAy?.academic_year ?? '-'})</span>
                  </p>
                  <p className="font-semibold text-slate-800">
                    {selectedSubject?.subject_name ?? '-'} ({selectedRegulation?.regulation_code ?? '-'}) -{' '}
                    <span className="text-blue-700">{selectedSubject?.subject_type ?? '-'}</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      getRowId={(p) => String(p.data.studentId ?? p.data.fk_student_id ?? p.data.hallticketNumber ?? '')}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search…',
        pdfDocumentTitle: 'Exam Marks Entry',
      }}
      toolbarLeading={(
        <div className="text-[12px] text-slate-600 whitespace-nowrap shrink-0">
          Max Marks : <span className="font-semibold">{maxMarks || '-'}</span>
        </div>
      )}
    >
      {hasFetched && (
        <div className="flex items-center justify-end gap-2">
          <Button className="h-8 text-[12px]" onClick={onSave} disabled={saving || rows.length === 0}>{saving ? 'Saving...' : 'Save Marks'}</Button>
          <Button className="h-8 text-[12px]" variant="outline" onClick={() => globalThis?.print?.()}>Print</Button>
        </div>
      )}
    </FilteredListPage>
  )
}

