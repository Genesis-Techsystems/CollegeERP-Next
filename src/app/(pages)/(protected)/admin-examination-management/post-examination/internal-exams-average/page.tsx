'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ColGroupDef } from 'ag-grid-community'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MultiSelect, Select as CommonSelect } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import {
  getInternalExamAverageMarks,
  getRegulationById,
  listInternalExamAverageAcademicYears,
  listInternalExamAverageColleges,
  listInternalExamAverageCourseGroups,
  listInternalExamAverageCourses,
  listInternalExamAverageCourseYears,
  listInternalExamAverageExams,
  listInternalExamAverageExamTypes,
  saveInternalExamAverageMarks,
} from '@/services/post-examination'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key])
    if (Number.isFinite(val) && val > 0) return val
  }
  return 0
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? '').trim()
    if (val) return val
  }
  return ''
}

function dateShort(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function resolveRegulationMeta(first: AnyRow): { regulationId: number; regulationCode: string } {
  const details = (first?.examStudentDetailDTOs ?? first?.exam_student_detail_dtos ?? []) as AnyRow[]
  const regulationId =
    numFrom(details[0] ?? {}, ['regulationId', 'fk_regulation_id']) || numFrom(first ?? {}, ['regulationId', 'fk_regulation_id'])
  const regulationCode =
    strFrom(details[0] ?? {}, ['regulationName', 'regulation_code']) ||
    strFrom(first ?? {}, ['regulationName', 'regulation_code'])
  return { regulationId, regulationCode }
}

function resolveTypeId(regulation: AnyRow | null, first: AnyRow): number {
  return (
    numFrom(regulation ?? {}, ['examIntMarkTypeId', 'exam_int_mark_type_id']) ||
    numFrom(first ?? {}, ['examIntMarkTypeId', 'exam_int_mark_type_id'])
  )
}

function buildAverageMatrix(rows: AnyRow[], selectedExams: AnyRow[]) {
  const normalized: AnyRow[] = rows.map((r) => ({ ...r, marks: Number(r.marks ?? 0) }))
  const examNameList = [...selectedExams.map((e) => strFrom(e, ['examShortName', 'examName', 'exam_name'])), 'Final']
  const subjectMap = new Map<string, { subject_code: string; subject_name: string }>()
  for (const row of normalized) {
    const code = strFrom(row, ['subject_code', 'subjectCode'])
    const name = strFrom(row, ['subject_name', 'subjectName'])
    if (code && !subjectMap.has(code)) subjectMap.set(code, { subject_code: code, subject_name: name })
  }
  const subjects = [...subjectMap.values()]
  const templateCells: AnyRow[] = subjects.flatMap((s) =>
    examNameList.map(
      (examName): AnyRow => ({
        subject_code: s.subject_code,
        subject_name: s.subject_name,
        exam_name: examName,
        marks: 0,
        pk_exam_final_int_mark_id: null,
        created_dt: null,
        fk_student_id: null,
        fk_subject_id: null,
        fk_course_year_id: null,
      }),
    ),
  )
  const byRoll = new Map<string, AnyRow>()
  for (const row of normalized) {
    const roll = strFrom(row, ['roll_number', 'rollNumber'])
    if (!roll) continue
    if (!byRoll.has(roll)) {
      const studentRow: AnyRow = {
        rollNumber: roll,
        firstName: strFrom(row, ['first_name', 'firstName']),
        studentMarksCount: templateCells.map((c) => ({ ...c })) as AnyRow[],
      }
      byRoll.set(roll, studentRow)
    }
    const student = byRoll.get(roll)
    if (!student) continue
    const marksArrUnknown = student.studentMarksCount
    const marksArr = (Array.isArray(marksArrUnknown) ? marksArrUnknown : []) as AnyRow[]
    const subjectCode = strFrom(row, ['subject_code', 'subjectCode'])
    const examName = strFrom(row, ['exam_name', 'examName'])
    let cellIdx = marksArr.findIndex((c) => c.subject_code === subjectCode && c.exam_name === examName)
    if (cellIdx < 0) continue
    const cell: any = marksArr[cellIdx]
    cell.marks = Number(row.marks ?? 0)
    cell.pk_exam_final_int_mark_id = row.pk_exam_final_int_mark_id ?? null
    cell.created_dt = row.created_dt ?? null
    cell.fk_student_id = row.fk_student_id ?? null
    cell.fk_subject_id = row.fk_subject_id ?? null
    cell.fk_course_year_id = row.fk_course_year_id ?? null
  }
  return { normalized, examNameList, subjects, students: [...byRoll.values()] }
}

export default function InternalExamsAveragePage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flag, setFlag] = useState(false)

  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [years, setYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [groups, setGroups] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [exams, setExams] = useState<AnyRow[]>([])
  const [examTypes, setExamTypes] = useState<AnyRow[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<number[]>([])
  const [selectedExams, setSelectedExams] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [markCalTypeId, setMarkCalTypeId] = useState<number | null>(null)
  const [examIntMarkTypeId, setExamIntMarkTypeId] = useState<number | null>(null)
  const [regulationCode, setRegulationCode] = useState('')
  const [internalType, setInternalType] = useState('')

  const [selectedData, setSelectedData] = useState('')
  const [tempV, setTempV] = useState('')
  const [finalInternalMarks, setFinalInternalMarks] = useState<AnyRow[]>([])
  const [midExamMarks, setMidExamMarks] = useState<AnyRow[]>([])
  const [keys, setKeys] = useState<Array<{ subject_code: string; subject_name: string }>>([])
  const [examNames, setExamNames] = useState<string[]>([])

  useEffect(() => {
    async function run() {
      setLoading(true)
      try {
        const [c, t] = await Promise.all([listInternalExamAverageColleges(), listInternalExamAverageExamTypes()])
        setColleges(c ?? [])
        setExamTypes(t ?? [])
      } catch (e) {
        toastError(e, 'Failed to load filters')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [])

  async function onSelectCollege(value: number) {
    setCollegeId(value)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setMarkCalTypeId(null)
    setExamIntMarkTypeId(null)
    setSelectedExamIds([])
    setSelectedExams([])
    setExams([])
    setMidExamMarks([])
    setFlag(false)
    const selectedCollege = colleges.find((c) => numFrom(c, ['collegeId', 'fk_college_id']) === value)
    const universityId = numFrom(selectedCollege ?? {}, ['universityId', 'fk_university_id'])
    if (!universityId) return
    const [y, c] = await Promise.all([
      listInternalExamAverageAcademicYears(universityId).catch(() => []),
      listInternalExamAverageCourses(universityId).catch(() => []),
    ])
    setYears(y)
    setCourses(c)
  }

  async function onSelectCourse(value: number) {
    setCourseId(value)
    setCourseGroupId(null)
    setCourseYearId(null)
    setMarkCalTypeId(null)
    setExamIntMarkTypeId(null)
    setSelectedExamIds([])
    setSelectedExams([])
    setExams([])
    setMidExamMarks([])
    setFlag(false)
    const g = await listInternalExamAverageCourseGroups(value).catch(() => [])
    setGroups(g)
  }

  async function onSelectGroup(value: number) {
    setCourseGroupId(value)
    setCourseYearId(null)
    setMarkCalTypeId(null)
    setExamIntMarkTypeId(null)
    setSelectedExamIds([])
    setSelectedExams([])
    setExams([])
    setMidExamMarks([])
    setFlag(false)
    if (!courseId) return
    const y = await listInternalExamAverageCourseYears(courseId).catch(() => [])
    setCourseYears(y)
  }

  async function onSelectCourseYear(value: number) {
    setCourseYearId(value)
    setMarkCalTypeId(null)
    setExamIntMarkTypeId(null)
    setSelectedExamIds([])
    setSelectedExams([])
    setExams([])
    setMidExamMarks([])
    setFlag(false)
    if (!collegeId || !courseId || !academicYearId || !courseGroupId) return
    const examRows = await listInternalExamAverageExams({
      collegeId,
      courseId,
      academicYearId,
      courseGroupId,
      courseYearId: value,
    }).catch(() => [])
    const map = new Map<number, AnyRow>()
    for (const row of examRows) {
      const id = numFrom(row, ['examId', 'fk_exam_id'])
      if (id > 0 && !map.has(id)) map.set(id, row)
    }
    setExams([...map.values()])
  }

  async function onSelectExams(values: number[]) {
    setSelectedExamIds(values)
    setSelectedExams(exams.filter((e) => values.includes(numFrom(e, ['examId', 'fk_exam_id']))))
    setFlag(true)
    setMidExamMarks([])
    if (values.length === 0) return
    const first = exams.find((e) => numFrom(e, ['examId', 'fk_exam_id']) === values[0])
    const { regulationId, regulationCode } = resolveRegulationMeta(first ?? {})
    setRegulationCode(regulationCode)
    if (!regulationId) return
    const regulation = await getRegulationById(regulationId).catch(() => null)
    const typeId = resolveTypeId(regulation, first ?? {})
    setExamIntMarkTypeId(typeId || null)
    setMarkCalTypeId(typeId || null)
    const type = examTypes.find((t) => numFrom(t, ['generalDetailId']) === typeId)
    setInternalType(strFrom(type ?? {}, ['generalDetailDisplayName', 'generalDetailCode']))
  }

  const filteredExams = useMemo(() => {
    if (!academicYearId || !courseId || !courseGroupId || !courseYearId) return []
    return exams
  }, [exams, academicYearId, courseId, courseGroupId, courseYearId])
  const examOptions = useMemo(
    () =>
      filteredExams
        .map((x) => {
          const id = numFrom(x, ['examId', 'fk_exam_id'])
          if (!id) return null
          return {
            value: String(id),
            label: `${strFrom(x, ['examName', 'exam_name'])} (${dateShort(strFrom(x, ['examFromDate', 'from_date']))} - ${dateShort(strFrom(x, ['examToDate', 'to_date']))})`,
          }
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [filteredExams],
  )
  const collegeOptions = useMemo(
    () => colleges.map((x) => ({ value: String(numFrom(x, ['collegeId', 'fk_college_id'])), label: strFrom(x, ['collegeCode', 'college_code']) })).filter((o) => o.value !== '0'),
    [colleges],
  )
  const yearOptions = useMemo(
    () => years.map((x) => ({ value: String(numFrom(x, ['academicYearId', 'fk_academic_year_id'])), label: strFrom(x, ['academicYear', 'academic_year']) })).filter((o) => o.value !== '0'),
    [years],
  )
  const courseOptions = useMemo(
    () => courses.map((x) => ({ value: String(numFrom(x, ['courseId', 'fk_course_id'])), label: strFrom(x, ['courseCode', 'course_code']) })).filter((o) => o.value !== '0'),
    [courses],
  )
  const groupOptions = useMemo(
    () => groups.map((x) => ({ value: String(numFrom(x, ['courseGroupId', 'fk_course_group_id'])), label: strFrom(x, ['groupCode', 'group_code']) })).filter((o) => o.value !== '0'),
    [groups],
  )
  const courseYearOptions = useMemo(
    () => courseYears.map((x) => ({ value: String(numFrom(x, ['courseYearId', 'fk_course_year_id'])), label: strFrom(x, ['courseYearName', 'course_year_code']) })).filter((o) => o.value !== '0'),
    [courseYears],
  )
  const markTypeOptions = useMemo(
    () => examTypes.map((x) => ({ value: String(numFrom(x, ['generalDetailId'])), label: strFrom(x, ['generalDetailDisplayName', 'generalDetailCode']) })).filter((o) => o.value !== '0'),
    [examTypes],
  )

  async function getList() {
    if (!collegeId || !courseGroupId || !courseYearId || !markCalTypeId || selectedExamIds.length === 0) return
    setLoading(true)
    try {
      if (!examIntMarkTypeId) {
        setFlag(true)
        return
      }
      const rows = await getInternalExamAverageMarks({
        examIds: selectedExamIds,
        collegeId,
        courseGroupId,
        courseYearId,
        finalTypeId: examIntMarkTypeId,
      })
      const matrix = buildAverageMatrix(rows, selectedExams)
      setFinalInternalMarks(matrix.normalized)
      setExamNames(matrix.examNameList)
      setKeys(matrix.subjects)
      setMidExamMarks(matrix.students)

      const c = colleges.find((x) => numFrom(x, ['collegeId', 'fk_college_id']) === collegeId)
      const ay = years.find((x) => numFrom(x, ['academicYearId', 'fk_academic_year_id']) === academicYearId)
      const co = courses.find((x) => numFrom(x, ['courseId', 'fk_course_id']) === courseId)
      const cg = groups.find((x) => numFrom(x, ['courseGroupId', 'fk_course_group_id']) === courseGroupId)
      const cy = courseYears.find((x) => numFrom(x, ['courseYearId', 'fk_course_year_id']) === courseYearId)
      setSelectedData(
        [strFrom(c ?? {}, ['collegeCode', 'college_code']), strFrom(ay ?? {}, ['academicYear', 'academic_year']), strFrom(co ?? {}, ['courseCode', 'course_code']), strFrom(cg ?? {}, ['groupCode', 'group_code']), strFrom(cy ?? {}, ['courseYearName', 'course_year_code'])].filter(Boolean).join(' / '),
      )
      setTempV(
        selectedExams
          .map((e) => `${strFrom(e, ['examName', 'exam_name'])} (${dateShort(strFrom(e, ['examFromDate', 'from_date']))} - ${dateShort(strFrom(e, ['examToDate', 'to_date']))})`)
          .join(' && '),
      )
    } catch (e) {
      toastError(e, 'Failed to fetch list')
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    if (!collegeId || finalInternalMarks.length === 0 || selectedExamIds.length === 0) return
    setSaving(true)
    try {
      const examIds = selectedExamIds.join(',')
      const payload = finalInternalMarks
        .filter((r) => strFrom(r, ['exam_name', 'examName']).toLowerCase() === 'final')
        .map((r) => ({
          examFinalIntMarkId: r.pk_exam_final_int_mark_id ?? null,
          createdDt: r.created_dt ?? null,
          finalMarks: Number(r.marks ?? 0),
          examIds,
          internalMarks: Number(r.marks ?? 0),
          isActive: true,
          isPublished: true,
          publishedOn: new Date().toISOString(),
          collegeId,
          studentId: Number(r.fk_student_id ?? 0),
          courseYearId: Number(r.fk_course_year_id ?? 0),
          subjectId: Number(r.fk_subject_id ?? 0),
        }))
      await saveInternalExamAverageMarks(payload)
      toastSuccess('Saved successfully')
      await getList()
    } catch (e) {
      toastError(e, 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<(ColDef<AnyRow> | ColGroupDef<AnyRow>)[]>(() => {
    if (!keys.length || !examNames.length) return []
    const frozen: ColDef<AnyRow>[] = [
      {
        colId: 'siNo',
        headerName: 'S.No',
        width: 72,
        flex: 0,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      },
      {
        colId: 'student',
        headerName: 'Student',
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => `${String(p.data?.firstName ?? '')} (${String(p.data?.rollNumber ?? '')})`,
      },
    ]
    const groups: ColGroupDef<AnyRow>[] = keys.map((k, subjIdx) => ({
      headerName: `${k.subject_name} (${k.subject_code})`,
      children: examNames.map((exam, examIdx) => ({
        colId: `avg_${subjIdx}_${examIdx}`,
        headerName: exam,
        width: 88,
        flex: 0,
        valueGetter: (p) => {
          const marks = p.data?.studentMarksCount as AnyRow[] | undefined
          const cell = marks?.find((c) => c.subject_code === k.subject_code && c.exam_name === exam)
          return Number(cell?.marks ?? 0)
        },
      })),
    }))
    return [...frozen, ...groups]
  }, [keys, examNames])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Internal Exam Average" subtitle="Post examination" />

      <div className="app-card p-3">
        <div className="border-b border-border pb-3">
          <h2 className="app-card-title">Internal Exam Average</h2>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
          <div className="space-y-1 md:col-span-2"><Label>College</Label><CommonSelect value={collegeId ? String(collegeId) : null} onChange={(v) => void onSelectCollege(Number(v || 0))} options={collegeOptions} placeholder="College" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Exam Year</Label><CommonSelect value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={yearOptions} placeholder="Exam Year" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course</Label><CommonSelect value={courseId ? String(courseId) : null} onChange={(v) => void onSelectCourse(Number(v || 0))} options={courseOptions} placeholder="Course" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Group</Label><CommonSelect value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => void onSelectGroup(Number(v || 0))} options={groupOptions} placeholder="Course Group" /></div>
          <div className="space-y-1 md:col-span-2"><Label>Course Year</Label><CommonSelect value={courseYearId ? String(courseYearId) : null} onChange={(v) => void onSelectCourseYear(Number(v || 0))} options={courseYearOptions} placeholder="Course Year" /></div>
          <div className="space-y-1 md:col-span-7">
            <Label>Exam</Label>
            <MultiSelect
              value={selectedExamIds.map(String)}
              onChange={(vals) => void onSelectExams(vals.map(Number))}
              options={examOptions}
              placeholder="Select Exam(s)"
              searchable
              showSelectAll
              className="text-[12px]"
            />
          </div>
          {selectedExamIds.length > 0 && <div className="space-y-1 md:col-span-2"><Label>Marks Calculation Type</Label><CommonSelect value={markCalTypeId ? String(markCalTypeId) : null} onChange={(v) => setMarkCalTypeId(v ? Number(v) : null)} options={markTypeOptions} placeholder="Marks Calculation Type" /></div>}
          {selectedExamIds.length > 0 && !!examIntMarkTypeId && <div className="md:col-span-1"><Button className="h-8 text-[12px] w-full" onClick={() => void getList()} disabled={loading}>{loading ? 'Loading...' : 'Get List'}</Button></div>}
        </div>
      </div>

      {!examIntMarkTypeId && flag && <p className="text-[13px] font-semibold text-red-600 px-1">Note: Exam internal marks type is not updated in regulation master.</p>}
      {!!examIntMarkTypeId && flag && <p className="text-[13px] font-semibold text-red-600 px-1">Note: For Regulation {regulationCode || '-'} the Exam internal marks type is {internalType || '-'}.</p>}

      {midExamMarks.length > 0 && (
        <>
          <div className="app-card p-3 border-t-[7px] border-t-slate-100">
            <div className="text-[14px] font-semibold">{selectedData} <span className="text-muted-foreground font-normal">({tempV})</span></div>
          </div>
          <TableCard withHeaderBorder={false}>
            <DataTable<AnyRow>
              rowData={midExamMarks}
              columnDefs={columnDefs}
              loading={loading}
              getRowId={(p) => String(p.data?.rollNumber ?? '')}
              pagination
              paginationPageSize={50}
              toolbar={{
                search: true,
                searchPlaceholder: 'Search…',
                pdfDocumentTitle: 'Internal Exam Average',
                lockColumnIds: ['siNo', 'student'],
              }}
              toolbarTrailing={
                <Button className="h-[30px] px-3 text-[12px]" onClick={() => void onSave()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              }
            />
          </TableCard>
        </>
      )}
    </PageContainer>
  )
}

