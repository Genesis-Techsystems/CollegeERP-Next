'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, type SelectOption } from '@/common/components/select'
import {
  deactivateRegisteredExamSubject,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTt,
  getUnivExamSubjectUc,
  listStudentSubjects,
  listRegisteredExamSubjects,
  listStudents,
  saveRegisteredExamSubjects,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'
import { listCourseYears } from '@/services/examination'

type AnyRow = Record<string, any>

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function ExamRegisterSubjectsPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [students, setStudents] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [registeredSubjects, setRegisteredSubjects] = useState<AnyRow[]>([])
  const [checkedSubjects, setCheckedSubjects] = useState<Set<number>>(new Set())

  const [studentId, setStudentId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const selectedStudent = students.find((s) => Number(s.studentId ?? s.id) === Number(studentId)) ?? null

  const exams = useMemo(() => {
    if (!selectedStudent) return []
    const sidCourse = Number(selectedStudent.courseId ?? selectedStudent.fk_course_id ?? 0)
    const sidAy = Number(selectedStudent.academicYearId ?? selectedStudent.fk_academic_year_id ?? 0)
    const byCourse = filterRows.filter((r) => Number(r.fk_course_id) === sidCourse)
    const byAy = sidAy > 0 ? byCourse.filter((r) => Number(r.fk_academic_year_id) === sidAy) : byCourse
    return dedupeBy(byAy, (r) => Number(r.fk_exam_id)).filter((r) => Number(r.fk_exam_id) > 0)
  }, [filterRows, selectedStudent])

  const studentOptions = useMemo<SelectOption[]>(
    () =>
      students.map((s, i) => ({
        value: String(s.studentId ?? s.id ?? i),
        label: `${s.hallticketNumber ?? s.rollNumber ?? '-'} - ${s.firstName ?? s.studentName ?? '-'}`,
      })),
    [students],
  )

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter((s) =>
      `${s.subject_name ?? s.subjectName ?? ''} ${s.subject_code ?? s.subjectCode ?? ''}`.toLowerCase().includes(q),
    )
  }, [subjects, subjectSearch])

  useEffect(() => {
    async function loadFilters() {
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
        setFilterRows(Array.isArray(rows) ? rows : [])
      } finally {
        setLoading(false)
      }
    }
    void loadFilters()
  }, [employeeId])

  async function onSearchStudents(q: string) {
    const term = q.trim()
    if (term.length === 0) {
      setStudents([])
      return
    }
    if (term.length < 3) return
    const rows = await listStudents(term).catch(() => [])
    setStudents(Array.isArray(rows) ? rows : [])
  }

  async function onStudentSelect(nextStudentId: number) {
    if (!Number.isFinite(nextStudentId) || nextStudentId <= 0) {
      setStudentId(null)
      setExamId(null)
      setCourseYearId(null)
      setRestRows([])
      setSubjects([])
      setRegisteredSubjects([])
      setCheckedSubjects(new Set())
      return
    }

    setStudentId(nextStudentId)
    setExamId(null)
    setCourseYearId(null)
    setRestRows([])
    setSubjects([])
    setRegisteredSubjects([])
    setCheckedSubjects(new Set())

    const s = students.find((x) => Number(x.studentId ?? x.id) === nextStudentId)
    if (!s) return
    const cid = Number(s.courseId ?? s.fk_course_id ?? 0)
    if (!cid) return
    const cys = await listCourseYears(cid).catch(() => [])
    const years = Array.isArray(cys) ? cys : []
    setCourseYears(years)
    const defaultCy = Number(s.courseYearId ?? s.fk_course_year_id ?? years[0]?.courseYearId ?? 0) || null
    setCourseYearId(defaultCy)
  }

  async function onExamSelect(nextExamId: number) {
    setExamId(nextExamId)
    setSubjects([])
    setRegisteredSubjects([])
    setCheckedSubjects(new Set())
    if (!selectedStudent) return
    const rest = await getUnivExamRestNoTt({
      courseId: Number(selectedStudent.courseId ?? selectedStudent.fk_course_id ?? 0),
      examId: nextExamId,
      academicYearId: Number(selectedStudent.academicYearId ?? selectedStudent.fk_academic_year_id ?? 0),
      employeeId,
    }).catch(() => [])
    setRestRows(Array.isArray(rest) ? rest : [])
    const reg = await listRegisteredExamSubjects(Number(selectedStudent.studentId ?? selectedStudent.id ?? 0), nextExamId).catch(() => [])
    setRegisteredSubjects(Array.isArray(reg) ? reg : [])
    if (courseYearId) {
      setTimeout(() => {
        void onGetSubjects()
      }, 0)
    }
  }

  async function onCourseYearSelect(nextCourseYearId: number) {
    setCourseYearId(nextCourseYearId)
    setSubjects([])
    setCheckedSubjects(new Set())
    if (!selectedStudent || !examId || !nextCourseYearId) return
    setTimeout(() => {
      void onGetSubjects()
    }, 0)
  }

  async function onGetSubjects() {
    if (!selectedStudent || !examId || !courseYearId) return
    setLoading(true)
    try {
      const selectedExamRow =
        exams.find((e) => Number(e.fk_exam_id ?? e.examId ?? 0) === Number(examId)) ?? null
      const studentCollegeId = Number(
        selectedStudent.collegeId ??
          selectedStudent.fk_college_id ??
          restRows[0]?.fk_college_id ??
          selectedExamRow?.fk_college_id ??
          0,
      )
      const studentAcademicYearId = Number(
        selectedStudent.academicYearId ??
          selectedStudent.fk_academic_year_id ??
          selectedExamRow?.fk_academic_year_id ??
          restRows[0]?.fk_academic_year_id ??
          0,
      )
      const studentDetailId = Number(
        selectedStudent.studentId ??
          selectedStudent.id ??
          selectedStudent.fk_student_id ??
          selectedStudent.student_detail_id ??
          0,
      )

      // Primary source: StudentSubject domain list (legacy page parity)
      const studentSubjectRows =
        studentCollegeId > 0 && studentAcademicYearId > 0 && studentDetailId > 0
          ? await listStudentSubjects({
              collegeId: studentCollegeId,
              academicYearId: studentAcademicYearId,
              studentId: studentDetailId,
              courseYearId: Number(courseYearId),
            }).catch(() => [])
          : []

      if (Array.isArray(studentSubjectRows) && studentSubjectRows.length > 0) {
        setSubjects(studentSubjectRows)
        const already = new Set(
          registeredSubjects.map((r) => Number(r.fk_subject_id ?? r.subjectId ?? r.subject_id ?? 0)).filter((x) => x > 0),
        )
        setCheckedSubjects(
          new Set(
            studentSubjectRows
              .map((r) => Number(r.fk_subject_id ?? r.subjectId ?? r.subject_id ?? 0))
              .filter((x) => x > 0 && !already.has(x)),
          ),
        )
        return
      }

      // Fallback source kept for safety.
      const studentCourseGroupId = Number(selectedStudent.courseGroupId ?? selectedStudent.fk_course_group_id ?? 0)
      const studentRegulationId = Number(selectedStudent.regulationId ?? selectedStudent.fk_regulation_id ?? 0)
      const fallbackGroupId = Number(restRows[0]?.fk_course_group_id ?? 0)
      const fallbackRegulationId = Number(restRows[0]?.fk_regulation_id ?? 0)

      const rows = await getUnivExamSubjectUc({
        collegeId: Number(selectedStudent.collegeId ?? selectedStudent.fk_college_id ?? 0),
        courseId: Number(selectedStudent.courseId ?? selectedStudent.fk_course_id ?? 0),
        courseGroupId: studentCourseGroupId || fallbackGroupId || 0,
        courseYearId: Number(courseYearId),
        examId: Number(examId),
        academicYearId: Number(selectedStudent.academicYearId ?? selectedStudent.fk_academic_year_id ?? 0),
        regulationId: studentRegulationId || fallbackRegulationId || 0,
        employeeId,
      }).catch(() => [])

      const list = Array.isArray(rows) ? rows : []
      setSubjects(list)
      const already = new Set(
        registeredSubjects.map((r) => Number(r.fk_subject_id ?? r.subjectId ?? r.subject_id ?? 0)).filter((x) => x > 0),
      )
      setCheckedSubjects(
        new Set(
          list
            .map((r) => Number(r.fk_subject_id ?? r.subjectId))
            .filter((x) => x > 0 && !already.has(x)),
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    if (!selectedStudent || !examId || checkedSubjects.size === 0 || !courseYearId) return
    const selected = subjects.filter((s) => checkedSubjects.has(Number(s.fk_subject_id ?? s.subjectId ?? 0)))
    if (selected.length === 0) return

    const examTypeCode = 'Regular'
    const grouped = new Map<number, AnyRow[]>()
    for (const s of selected) {
      const cy = Number(courseYearId)
      const arr = grouped.get(cy) ?? []
      arr.push({
        ...s,
        courseYearId: cy,
        subjectId: Number(s.fk_subject_id ?? s.subjectId ?? 0),
        subjectCode: s.subject_code ?? s.subjectCode ?? '',
        subjectName: s.subject_name ?? s.subjectName ?? '',
      })
      grouped.set(cy, arr)
    }

    const payload: AnyRow[] = Array.from(grouped.entries()).map(([cy, subs]) => ({
      collegeId: Number(selectedStudent.collegeId ?? selectedStudent.fk_college_id ?? 0),
      courseGroupId: Number(selectedStudent.courseGroupId ?? selectedStudent.fk_course_group_id ?? restRows[0]?.fk_course_group_id ?? 0),
      courseYearId: cy,
      regulationId: Number(selectedStudent.regulationId ?? selectedStudent.fk_regulation_id ?? restRows[0]?.fk_regulation_id ?? 0),
      studentId: Number(selectedStudent.studentId ?? selectedStudent.id ?? 0),
      examId: Number(examId),
      examtypeCatCode: examTypeCode,
      isActive: true,
      isFeePaid: false,
      examStudentDetailDTOs: subs,
    }))

    setSaving(true)
    try {
      await saveRegisteredExamSubjects(payload)
      alert('Subjects saved successfully')
      const reg = await listRegisteredExamSubjects(Number(selectedStudent.studentId ?? selectedStudent.id ?? 0), Number(examId)).catch(() => [])
      setRegisteredSubjects(Array.isArray(reg) ? reg : [])
      setCheckedSubjects(new Set())
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save subjects')
    } finally {
      setSaving(false)
    }
  }

  async function onDeleteRegistered(row: AnyRow) {
    const id = Number(row.examStdDetId ?? row.examStdDetID ?? row.exam_std_det_id ?? 0)
    if (!id) return
    const reason = window.prompt('Enter reason for delete', '') ?? ''
    if (reason === null) return
    try {
      await deactivateRegisteredExamSubject(id, reason)
      if (selectedStudent && examId) {
        const reg = await listRegisteredExamSubjects(Number(selectedStudent.studentId ?? selectedStudent.id ?? 0), Number(examId)).catch(() => [])
        setRegisteredSubjects(Array.isArray(reg) ? reg : [])
      }
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete subject')
    }
  }

  const selectedSubjectRows = useMemo(
    () => subjects.filter((s) => checkedSubjects.has(Number(s.fk_subject_id ?? s.subjectId ?? 0))),
    [subjects, checkedSubjects],
  )

  const allFilteredSelected =
    filteredSubjects.length > 0 &&
    filteredSubjects.every((s) => checkedSubjects.has(Number(s.fk_subject_id ?? s.subjectId ?? 0)))

  function toggleSubject(id: number, checked: boolean) {
    setCheckedSubjects((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAllFiltered(checked: boolean) {
    setCheckedSubjects((prev) => {
      const next = new Set(prev)
      for (const s of filteredSubjects) {
        const id = Number(s.fk_subject_id ?? s.subjectId ?? 0)
        if (id <= 0) continue
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Register Subjects" subtitle="Register and update exam subjects" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Exam Register Subjects Update</h2>
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
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-5 space-y-1">
              <Select
                label="Student"
                placeholder="Search by student name / hallticket"
                value={studentId ? String(studentId) : null}
                options={studentOptions}
                searchable
                clearable
                className="[&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
                onSearch={(term) => void onSearchStudents(term)}
                onChange={(v) => void onStudentSelect(Number(v ?? 0))}
              />
            </div>
            <div className="md:col-span-7 space-y-1">
              <Label>Exam</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => { if (v) void onExamSelect(Number(v)) }}
                options={exams.map((e, i) => ({ value: String(e.fk_exam_id ?? e.examId), label: (e.exam_name ?? e.examName) ?? `Exam ${e.fk_exam_id ?? e.examId}` }))}
                placeholder="Select Exam"
              />
            </div>
          </div>
        </div>
        )}
      </div>

      {!!selectedStudent && !!examId && (
        <div className="app-card p-3 space-y-2">
          <div className="rounded border border-blue-200 bg-blue-50/40 p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-2">
                {selectedStudent.studentPhotoPath ? (
                  <img
                    src={selectedStudent.studentPhotoPath}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                    alt="student"
                    className="h-24 w-24 rounded object-cover border bg-white"
                  />
                ) : (
                  <div className="h-24 w-24 rounded border bg-white flex items-center justify-center">
                    <User className="h-10 w-10 text-slate-400" />
                  </div>
                )}
              </div>
              <div className="md:col-span-7 text-[11px] leading-6">
                <div className="font-semibold text-[12px]">
                  {selectedStudent.firstName ?? selectedStudent.studentName ?? '-'}{' '}
                  <span className="text-blue-700">
                    ({selectedStudent.isLateral ? 'LATERAL' : 'REGULAR'})
                  </span>
                </div>
                <div className="text-muted-foreground">{selectedStudent.hallticketNumber ?? selectedStudent.rollNumber ?? '-'}</div>
                <div className="text-muted-foreground">
                  {selectedStudent.collegeCode ?? '-'} / {selectedStudent.academicYear ?? selectedStudent.academic_year ?? '-'} /{' '}
                  {selectedStudent.courseCode ?? '-'} / {selectedStudent.groupCode ?? '-'} / {selectedStudent.courseYearName ?? '-'} / Section {selectedStudent.section ?? '-'}
                </div>
                <div className="text-muted-foreground">{selectedStudent.mobile ?? '-'}</div>
              </div>
              <div className="md:col-span-3 text-[11px] leading-8">
                <div>
                  Quota : <span className="text-blue-700">{selectedStudent.quotaDisplayName ?? '-'}</span>
                </div>
                <div>
                  Student Status :{' '}
                  <span className="text-green-700 font-medium">{selectedStudent.studentStatusDisplayName ?? '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded border border-blue-200 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3 rounded border p-3">
                <Label>Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => { if (v) void onCourseYearSelect(Number(v)) }}
                  options={courseYears.map((y, i) => ({ value: String(y.courseYearId ?? y.fk_course_year_id), label: y.courseYearName ?? y.course_year_name ?? y.courseYearCode ?? y.course_year_code }))}
                  placeholder="Course Year"
                />
              </div>

              <div className="md:col-span-5 rounded border overflow-hidden">
                <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between gap-3">
                  <div className="w-full max-w-[260px]">
                    <Input
                      className="h-8 text-[12px]"
                      placeholder="Search..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                    />
                  </div>
                  <div className="text-[12px] whitespace-nowrap">Total Subjects: <span className="font-semibold text-muted-foreground">{filteredSubjects.length}</span></div>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-blue-100 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left w-12">
                          <Checkbox checked={allFilteredSelected} onCheckedChange={(v) => toggleAllFiltered(!!v)} />
                        </th>
                        <th className="px-2 py-2 text-left">Subjects</th>
                      </tr>
                      <tr className="border-t">
                        <th className="px-2 py-1 text-left" colSpan={2}>All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((s, i) => {
                        const sid = Number(s.fk_subject_id ?? s.subjectId ?? 0)
                        const checked = checkedSubjects.has(sid)
                        return (
                          <tr key={`sub-${sid || i}`} className="border-t">
                            <td className="px-2 py-2">
                              <Checkbox checked={checked} onCheckedChange={(v) => toggleSubject(sid, !!v)} />
                            </td>
                            <td className="px-2 py-2">{s.shortName ?? s.subject_name ?? s.subjectName ?? '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-3 rounded border overflow-hidden">
                <div className="px-2 py-2 bg-blue-100 text-[14px]">
                  Selected Subjects : {checkedSubjects.size}
                </div>
                <div className="max-h-[320px] overflow-auto divide-y">
                  {selectedSubjectRows.map((s, i) => (
                    <div key={`sel-${i}`} className="px-2 py-2 text-[12px]">
                      {s.shortName ?? s.subject_name ?? s.subjectName ?? '-'}
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-1 flex items-end justify-end">
                <Button
                  type="button"
                  className="h-8 text-[12px] px-5"
                  disabled={checkedSubjects.size === 0 || saving}
                  onClick={onSave}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>

          {registeredSubjects.length > 0 && (
            <div className="rounded border overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50">
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
                      <td className="px-2 py-1">{r.courseYearName ?? r.course_year_name ?? '-'}</td>
                      <td className="px-2 py-1">{r.subjectCode ?? r.subject_code ?? '-'}</td>
                      <td className="px-2 py-1">{r.subjectName ?? r.subject_name ?? '-'}</td>
                      <td className="px-2 py-1">{r.examtypeCatCode ?? r.exam_type_code ?? '-'}</td>
                      <td className="px-2 py-1">
                        <Button type="button" variant="outline" className="h-7 text-[11px]" onClick={() => void onDeleteRegistered(r)}>
                          Delete
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

