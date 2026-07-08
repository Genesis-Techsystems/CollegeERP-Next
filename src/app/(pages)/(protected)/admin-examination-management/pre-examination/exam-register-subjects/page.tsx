'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Filter, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { StudentSearchSelect } from '@/common/components/student-search'
import {
  deactivateRegisteredExamSubject,
  getStudentSubjectsForSupplyExam,
  listExamMastersByCourse,
  listRegisteredExamSubjects,
  listStudentSubjects,
  listStudents,
  saveRegisteredExamSubjects,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'
import { listCourseYears } from '@/services/examination'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function text(...values: unknown[]): string {
  for (const v of values) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

function subjectIdOf(row: AnyRow): number {
  return num(row.subjectId ?? row.fk_subject_id ?? row.subject_id)
}

function subjectLabel(row: AnyRow): string {
  return text(row.shortName, row.subjectName, row.subject_name, row.Subject_name) || '-'
}

function fmtDate(v: unknown): string {
  if (!v) return ''
  try {
    const d = typeof v === 'string' || typeof v === 'number' ? new Date(v) : null
    if (!d || Number.isNaN(d.getTime())) return String(v)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return String(v)
  }
}

function examOptionLabel(e: AnyRow): string {
  const name = text(e.examName, e.exam_name) || `Exam ${num(e.examId ?? e.fk_exam_id)}`
  const from = fmtDate(e.fromDate ?? e.from_date)
  const to = fmtDate(e.toDate ?? e.to_date)
  const range = from && to ? ` (${from} - ${to})` : ''
  const tags = [
    e.isRegularExam || e.is_regular_exam ? '(Regular)' : '',
    e.isSupplyExam || e.is_supply_exam ? '(Supple)' : '',
  ]
    .filter(Boolean)
    .join('')
  return `${name}${range}${tags ? ` ${tags}` : ''}`
}

/**
 * Angular exam-registration-without-fee:
 * - Exams: ExamMaster by Course.courseId (exclude internal)
 * - Course years: CourseYear by course, ASC, keep semNo <= student's current sem
 * - Subjects (same year as student): StudentSubject domain list
 * - Subjects (other year): studentsubjectsforsupplyexam
 * - UI section shown only after exam selected (flag)
 */
export default function ExamRegisterSubjectsPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [students, setStudents] = useState<AnyRow[]>([])
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [selectedStudentRow, setSelectedStudentRow] = useState<AnyRow | null>(null)
  const [examsList, setExamsList] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [registeredSubjects, setRegisteredSubjects] = useState<AnyRow[]>([])
  const [checkedSubjects, setCheckedSubjects] = useState<Set<number>>(new Set())
  const [checkAll, setCheckAll] = useState(true)

  const [studentId, setStudentId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examSelected, setExamSelected] = useState(false)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedStudent =
    selectedStudentRow ??
    students.find((s) => num(s.studentId ?? s.id) === num(studentId)) ??
    null

  const studentCurrentCourseYearId = num(
    selectedStudent?.courseYearId ?? selectedStudent?.fk_course_year_id,
  )

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter((s) =>
      `${subjectLabel(s)} ${text(s.subjectCode, s.subject_code, s.Subject_code)}`
        .toLowerCase()
        .includes(q),
    )
  }, [subjects, subjectSearch])

  const selectedSubjectRows = useMemo(
    () => subjects.filter((s) => checkedSubjects.has(subjectIdOf(s))),
    [subjects, checkedSubjects],
  )

  const allFilteredSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => {
      const sid = subjectIdOf(s)
      return sid > 0 && checkedSubjects.has(sid)
    })

  async function onSearchStudents(q: string) {
    const term = q.trim()
    if (!term) {
      setStudents([])
      return
    }
    if (term.length < 5) return
    setStudentSearchLoading(true)
    try {
      const rows = await listStudents(term).catch(() => [])
      setStudents(Array.isArray(rows) ? rows : [])
    } finally {
      setStudentSearchLoading(false)
    }
  }

  /** Angular: trim course years to semNo <= student's current semester */
  function trimCourseYearsBySem(years: AnyRow[], student: AnyRow): AnyRow[] {
    const studentCode = text(student.courseYearCode, student.course_year_code)
    const current =
      years.find(
        (y) =>
          text(y.courseYearCode, y.course_year_code) === studentCode ||
          num(y.courseYearId ?? y.fk_course_year_id) ===
            num(student.courseYearId ?? student.fk_course_year_id),
      ) ?? null
    const semNo = num(current?.semNo ?? current?.sem_no)
    if (!semNo) return years
    return years.filter((y) => {
      const sn = num(y.semNo ?? y.sem_no)
      return !sn || sn <= semNo
    })
  }

  function normalizeSubjects(rows: AnyRow[], cyId: number, examType: 'Regular' | 'Supple'): AnyRow[] {
    return rows.map((r) => ({
      ...r,
      subjectId: subjectIdOf(r),
      courseYearId: cyId || num(r.courseYearId ?? r.fk_course_year_id),
      examType,
      shortName: text(r.shortName) || text(r.subjectCode, r.subject_code) || null,
      subjectName: text(r.subjectName, r.subject_name),
      subjectCode: text(r.subjectCode, r.subject_code),
      Subject_name: text(r.subjectName, r.subject_name),
      Subject_code: text(r.subjectCode, r.subject_code),
      checked: true,
      isSelected: true,
    }))
  }

  function applyChecks(list: AnyRow[], registered: AnyRow[]) {
    const already = new Set(
      registered
        .map((r) => subjectIdOf(r) || num(r.fk_subject_id))
        .filter((x) => x > 0),
    )
    // Also match by subjectCode + courseYearId like Angular addExamSubjects
    const alreadyCodes = new Set(
      registered.map(
        (r) =>
          `${text(r.subjectCode, r.subject_code)}::${num(r.courseYearId ?? r.fk_course_year_id)}`,
      ),
    )
    const next = new Set<number>()
    for (const s of list) {
      const sid = subjectIdOf(s)
      if (!sid) continue
      const codeKey = `${text(s.subjectCode, s.subject_code)}::${num(s.courseYearId)}`
      if (already.has(sid) || alreadyCodes.has(codeKey)) continue
      next.add(sid)
    }
    setCheckedSubjects(next)
    setCheckAll(next.size > 0 && next.size === list.filter((s) => subjectIdOf(s) > 0).length)
  }

  /**
   * Angular getStudentSubjects(courseYearId):
   * same year → StudentSubject; other year → studentsubjectsforsupplyexam
   */
  async function loadStudentSubjects(student: AnyRow, cyId: number, eid: number | null, registered: AnyRow[]) {
    if (!cyId || !student) {
      setSubjects([])
      setCheckedSubjects(new Set())
      return
    }
    setLoading(true)
    try {
      const collegeId = num(student.collegeId ?? student.fk_college_id)
      const academicYearId = num(student.academicYearId ?? student.fk_academic_year_id)
      const studentDetailId = num(student.studentId ?? student.id ?? student.fk_student_id)
      const currentCy = num(student.courseYearId ?? student.fk_course_year_id)
      let rows: AnyRow[] = []

      if (currentCy === cyId) {
        if (collegeId && academicYearId && studentDetailId) {
          rows = await listStudentSubjects({
            collegeId,
            academicYearId,
            studentId: studentDetailId,
            courseYearId: cyId,
          }).catch(() => [])
        }
        rows = normalizeSubjects(Array.isArray(rows) ? rows : [], cyId, 'Regular')
      } else {
        if (collegeId && studentDetailId && eid) {
          rows = await getStudentSubjectsForSupplyExam({
            collegeId,
            courseYearId: cyId,
            studentId: studentDetailId,
            examId: eid,
          }).catch(() => [])
        }
        rows = normalizeSubjects(Array.isArray(rows) ? rows : [], cyId, 'Supple').map((r) => ({
          ...r,
          credits: r.creditPoints ?? r.credits ?? r.subCredits,
        }))
      }

      setSubjects(rows)
      applyChecks(rows, registered)
    } finally {
      setLoading(false)
    }
  }

  async function onStudentSelect(nextStudentId: number | null, row: AnyRow | null) {
    if (!nextStudentId || !row) {
      setStudentId(null)
      setSelectedStudentRow(null)
      setExamId(null)
      setExamSelected(false)
      setCourseYearId(null)
      setExamsList([])
      setCourseYears([])
      setSubjects([])
      setRegisteredSubjects([])
      setCheckedSubjects(new Set())
      return
    }

    setStudentId(nextStudentId)
    setSelectedStudentRow(row)
    setStudents((prev) =>
      prev.some((x) => num(x.studentId ?? x.id) === nextStudentId) ? prev : [...prev, row],
    )
    setExamId(null)
    setExamSelected(false)
    setSubjects([])
    setRegisteredSubjects([])
    setCheckedSubjects(new Set())
    setSubjectSearch('')

    const cid = num(row.courseId ?? row.fk_course_id)
    if (!cid) return

    setLoading(true)
    try {
      // Angular getExamsList — ExamMaster by course, exclude internal
      const exams = await listExamMastersByCourse(cid).catch(() => [])
      setExamsList((Array.isArray(exams) ? exams : []).filter((e) => !(e.isInternalExam ?? e.is_internal_exam)))

      // Angular course years ASC, trim by student semNo
      const yearsRaw = await listCourseYears(cid).catch(() => [])
      const yearsSorted = [...(Array.isArray(yearsRaw) ? yearsRaw : [])].sort(
        (a, b) => num(a.semNo ?? a.sem_no) - num(b.semNo ?? b.sem_no),
      )
      const years = trimCourseYearsBySem(yearsSorted, row)
      setCourseYears(years)

      const defaultCy =
        num(row.courseYearId ?? row.fk_course_year_id) ||
        num(years[0]?.courseYearId ?? years[0]?.fk_course_year_id) ||
        null
      setCourseYearId(defaultCy)

      // Angular loads subjects as soon as course year is known (exam not required for regular list)
      if (defaultCy) {
        await loadStudentSubjects(row, defaultCy, null, [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function onExamSelect(nextExamId: number) {
    if (!selectedStudent || !nextExamId) return
    setExamId(nextExamId)
    setExamSelected(true)
    setLoading(true)
    try {
      const reg = await listRegisteredExamSubjects(
        num(selectedStudent.studentId ?? selectedStudent.id),
        nextExamId,
      ).catch(() => [])
      const registered = Array.isArray(reg) ? reg : []
      setRegisteredSubjects(registered)

      const cy =
        courseYearId ||
        num(selectedStudent.courseYearId ?? selectedStudent.fk_course_year_id) ||
        null
      if (cy) {
        if (!courseYearId) setCourseYearId(cy)
        await loadStudentSubjects(selectedStudent, cy, nextExamId, registered)
      }
    } finally {
      setLoading(false)
    }
  }

  async function onCourseYearSelect(nextCourseYearId: number) {
    setCourseYearId(nextCourseYearId)
    if (!selectedStudent || !nextCourseYearId) {
      setSubjects([])
      setCheckedSubjects(new Set())
      return
    }
    await loadStudentSubjects(
      selectedStudent,
      nextCourseYearId,
      examId,
      registeredSubjects,
    )
  }

  function toggleSubject(sid: number, checked: boolean) {
    if (!sid) return
    setCheckedSubjects((prev) => {
      const next = new Set(prev)
      if (checked) next.add(sid)
      else next.delete(sid)
      return next
    })
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckAll(checked)
    setCheckedSubjects((prev) => {
      const next = new Set(prev)
      for (const s of filteredSubjects) {
        const sid = subjectIdOf(s)
        if (!sid) continue
        if (checked) next.add(sid)
        else next.delete(sid)
      }
      return next
    })
  }

  async function onSave() {
    if (!selectedStudent || !examId || checkedSubjects.size === 0 || !courseYearId) return
    const selected = subjects.filter((s) => checkedSubjects.has(subjectIdOf(s)))
    if (selected.length === 0) return

    const isSameYear = courseYearId === studentCurrentCourseYearId
    const examTypeCode = isSameYear ? 'Regular' : 'Supple'

    const payload: AnyRow[] = [
      {
        collegeId: num(selectedStudent.collegeId ?? selectedStudent.fk_college_id),
        courseGroupId: num(selectedStudent.courseGroupId ?? selectedStudent.fk_course_group_id),
        courseYearId: num(courseYearId),
        regulationId: num(selectedStudent.regulationId ?? selectedStudent.fk_regulation_id),
        studentId: num(selectedStudent.studentId ?? selectedStudent.id),
        examId: num(examId),
        examtypeCatCode: examTypeCode,
        isActive: true,
        isFeePaid: false,
        examStudentDetailDTOs: selected.map((s) => ({
          ...s,
          courseYearId: num(courseYearId),
          subjectId: subjectIdOf(s),
          subjectCode: text(s.subjectCode, s.subject_code),
          subjectName: text(s.subjectName, s.subject_name, s.shortName),
        })),
      },
    ]

    setSaving(true)
    try {
      await saveRegisteredExamSubjects(payload)
      toastSuccess('Subjects saved successfully')
      const reg = await listRegisteredExamSubjects(
        num(selectedStudent.studentId ?? selectedStudent.id),
        num(examId),
      ).catch(() => [])
      const registered = Array.isArray(reg) ? reg : []
      setRegisteredSubjects(registered)
      applyChecks(subjects, registered)
    } catch (e: unknown) {
      toastError(e, 'Failed to save subjects')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteRegistered(row: AnyRow) {
    const detailId = num(
      row.examStudentDetailId ??
        row.examStdDetailId ??
        row.exam_student_detail_id ??
        row.id,
    )
    if (!detailId || !selectedStudent || !examId) return
    try {
      await deactivateRegisteredExamSubject(detailId)
      toastSuccess('Subject removed')
      const reg = await listRegisteredExamSubjects(
        num(selectedStudent.studentId ?? selectedStudent.id),
        num(examId),
      ).catch(() => [])
      setRegisteredSubjects(Array.isArray(reg) ? reg : [])
    } catch (e: unknown) {
      toastError(e, 'Failed to delete subject')
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Register Subjects" subtitle="Register and update exam subjects" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Register Subjects Update</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown
              className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-5 space-y-1">
                <StudentSearchSelect
                  label="Student"
                  value={studentId}
                  students={students}
                  selectedStudent={selectedStudent}
                  isLoading={studentSearchLoading}
                  onSearch={(term) => void onSearchStudents(term)}
                  onChange={(id, row) => void onStudentSelect(id, row)}
                />
              </div>
              <div className="md:col-span-7 space-y-1">
                <Label>Exam *</Label>
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    if (v) void onExamSelect(Number(v))
                  }}
                  options={examsList.map((e) => ({
                    value: String(num(e.examId ?? e.fk_exam_id)),
                    label: examOptionLabel(e),
                  }))}
                  placeholder="Select Exam"
                  searchable
                  disabled={!selectedStudent}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {!!selectedStudent && examSelected && (
        <div className="app-card p-3 space-y-2">
          <div className="rounded border-4 border-[#c3d9ff] p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-2">
                {selectedStudent.studentPhotoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedStudent.studentPhotoPath}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                    alt="student"
                    className="h-24 w-24 rounded object-cover border bg-card"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded border bg-card">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="md:col-span-7 text-[11px] leading-6">
                <div className="text-[12px] font-semibold text-blue-700">
                  {text(selectedStudent.firstName, selectedStudent.studentName) || '-'}{' '}
                  <span>({selectedStudent.isLateral ? 'LATERAL' : 'REGULAR'})</span>
                </div>
                <div className="text-muted-foreground">
                  {text(selectedStudent.hallticketNumber, selectedStudent.rollNumber) || '-'}
                </div>
                <div className="text-muted-foreground">
                  {text(selectedStudent.collegeCode) || '-'} /{' '}
                  {text(selectedStudent.academicYear, selectedStudent.academic_year) || '-'} /{' '}
                  {text(selectedStudent.courseCode) || '-'} /{' '}
                  {text(selectedStudent.groupCode) || '-'} /{' '}
                  {text(selectedStudent.courseYearName) || '-'} / Section{' '}
                  {text(selectedStudent.section) || '-'}
                </div>
                <div className="text-muted-foreground">
                  {text(selectedStudent.mobile, selectedStudent.mobileNumber) || '-'}
                </div>
              </div>
              <div className="md:col-span-3 text-[11px] leading-8">
                <div>
                  Quota :{' '}
                  <span className="text-blue-700">
                    {text(selectedStudent.quotaDisplayName) || '-'}
                  </span>
                </div>
                <div>
                  Student Status :{' '}
                  <span className="font-medium text-green-700">
                    {text(selectedStudent.studentStatusDisplayName) || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded border border-blue-200 p-3">
            <h3 className="text-[14px] font-semibold">Select Exam Subjects</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="rounded border bg-white p-3 md:col-span-3">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => {
                    if (v) void onCourseYearSelect(Number(v))
                  }}
                  options={courseYears.map((y) => ({
                    value: String(num(y.courseYearId ?? y.fk_course_year_id)),
                    label: text(y.courseYearName, y.course_year_name, y.courseYearCode) || 'Course Year',
                  }))}
                  placeholder="Course Year"
                />
              </div>

              <div className="overflow-hidden rounded border md:col-span-5">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
                  <div className="min-w-0 w-full max-w-sm">
                    <SearchInput
                      className="w-full"
                      placeholder="Search..."
                      value={subjectSearch}
                      onChange={setSubjectSearch}
                    />
                  </div>
                  <div className="whitespace-nowrap text-[12px]">
                    Total Subjects:{' '}
                    <span className="font-semibold text-muted-foreground">
                      {loading ? '…' : subjects.length}
                    </span>
                  </div>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-[#C3D9FF]">
                      <tr>
                        <th className="w-12 px-2 py-2 text-left">
                          <Checkbox
                            checked={allFilteredSelected || (checkAll && filteredSubjects.length > 0)}
                            onCheckedChange={(v) => toggleAllFiltered(!!v)}
                          />
                          <span className="ml-1">All</span>
                        </th>
                        <th className="px-2 py-2 text-left">Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((s, i) => {
                        const sid = subjectIdOf(s)
                        return (
                          <tr key={`sub-${sid || i}`} className="border-t">
                            <td className="px-2 py-2">
                              <Checkbox
                                checked={checkedSubjects.has(sid)}
                                onCheckedChange={(v) => toggleSubject(sid, !!v)}
                              />
                            </td>
                            <td className="px-2 py-2">{subjectLabel(s)}</td>
                          </tr>
                        )
                      })}
                      {!loading && filteredSubjects.length === 0 && (
                        <tr className="border-t">
                          <td colSpan={2} className="px-2 py-6 text-center text-muted-foreground">
                            No subjects found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedSubjectRows.length > 0 && (
                <div className="overflow-hidden rounded border md:col-span-3">
                  <div className="bg-[#C3D9FF] px-2 py-2 text-[14px]">
                    Selected Subjects : {selectedSubjectRows.length}
                  </div>
                  <div className="max-h-[320px] divide-y overflow-auto">
                    {selectedSubjectRows.map((s, i) => (
                      <div key={`sel-${i}`} className="px-2 py-2 text-[12px]">
                        {subjectLabel(s)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSubjectRows.length > 0 && (
                <div className="flex items-end justify-end md:col-span-1">
                  <Button
                    type="button"
                    className="h-8 px-5 text-[12px]"
                    disabled={saving}
                    onClick={() => void onSave()}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {registeredSubjects.length > 0 && (
            <div className="overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">SI.No</th>
                    <th className="px-2 py-1 text-left">Course Year</th>
                    <th className="px-2 py-1 text-left">Subject Code</th>
                    <th className="px-2 py-1 text-left">Subject</th>
                    <th className="px-2 py-1 text-left">Exam Type</th>
                    <th className="px-2 py-1 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredSubjects.map((r, i) => (
                    <tr key={`reg-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">
                        {text(r.courseYearName, r.course_year_name) || '-'}
                      </td>
                      <td className="px-2 py-1">{text(r.subjectCode, r.subject_code) || '-'}</td>
                      <td className="px-2 py-1">{text(r.subjectName, r.subject_name) || '-'}</td>
                      <td className="px-2 py-1">
                        {text(r.examtypeCatCode, r.exam_type_code, r.examType) || '-'}
                      </td>
                      <td className="px-2 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void onDeleteRegistered(r)}
                          aria-label="Delete subject"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  )
}
