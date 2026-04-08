'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getUnivExamFiltersByType,
  getUnivExamRestNoTt,
  getUnivExamSubjectInss,
  listExamSubjectStudents,
  listRegisteredStudentsForExam,
  saveRegisteredExamSubjects,
} from '@/services/pre-examination'

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

const getStudentId = (s: AnyRow) =>
  Number(s.studentId ?? s.fk_student_id ?? s.student_id ?? s.std_id ?? 0)

export default function InternalExamRegistrationMultiplePage() {
  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([])
  const [students, setStudents] = useState<AnyRow[]>([])
  const [registeredStudents, setRegisteredStudents] = useState<AnyRow[]>([])
  const [selectedStudents, setSelectedStudents] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [searchAll, setSearchAll] = useState('')
  const [searchSelected, setSearchSelected] = useState('')
  const [searchRegistered, setSearchRegistered] = useState('')

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => Number(r.fk_course_id)).filter((r) => Number(r.fk_course_id) > 0), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => Number(r.fk_course_id) === Number(courseId)),
        (r) => Number(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            Number(r.fk_course_id) === Number(courseId) &&
            Number(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => Number(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(() => dedupeBy(restRows, (r) => Number(r.fk_college_id)), [restRows])
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => Number(r.fk_college_id) === Number(collegeId)),
        (r) => Number(r.fk_course_group_id),
      ),
    [restRows, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            Number(r.fk_college_id) === Number(collegeId) &&
            Number(r.fk_course_group_id) === Number(courseGroupId),
        ),
        (r) => Number(r.fk_course_year_id),
      ),
    [restRows, collegeId, courseGroupId],
  )
  const regulations = useMemo(() => dedupeBy(subjectFilterRows, (r) => Number(r.fk_regulation_id)), [subjectFilterRows])
  const subjectTypes = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter((r) => Number(r.fk_regulation_id) === Number(regulationId)),
        (r) => Number(r.fk_subjecttype_catdet_id),
      ),
    [subjectFilterRows, regulationId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        subjectFilterRows.filter(
          (r) =>
            Number(r.fk_regulation_id) === Number(regulationId) &&
            Number(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
        ),
        (r) => Number(r.fk_subject_id),
      ),
    [subjectFilterRows, regulationId, subjectTypeId],
  )

  const checkedCount = useMemo(() => students.filter((s) => !!s.c).length, [students])

  const studentsFiltered = useMemo(() => {
    const q = searchAll.trim().toLowerCase()
    const src = students
    if (!q) return src
    return src.filter((s) => `${s.firstName ?? s.studentName ?? ''} ${s.hallticketNumber ?? ''}`.toLowerCase().includes(q))
  }, [students, searchAll])
  const selectedFiltered = useMemo(() => {
    const q = searchSelected.trim().toLowerCase()
    if (!q) return selectedStudents
    return selectedStudents.filter((s) => `${s.firstName ?? s.studentName ?? ''} ${s.hallticketNumber ?? ''}`.toLowerCase().includes(q))
  }, [selectedStudents, searchSelected])
  const registeredFiltered = useMemo(() => {
    const q = searchRegistered.trim().toLowerCase()
    if (!q) return registeredStudents
    return registeredStudents.filter((s) => `${s.firstName ?? s.studentName ?? ''} ${s.hallticketNumber ?? ''}`.toLowerCase().includes(q))
  }, [registeredStudents, searchRegistered])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersByType(employeeId, 'INT').catch(() => [])
        const list = Array.isArray(rows) ? rows : []
        setBaseRows(list)
        const c = dedupeBy(list, (r) => Number(r.fk_course_id))[0]
        if (c?.fk_course_id) setCourseId(Number(c.fk_course_id))
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (!courseId) return
    const years = dedupeBy(baseRows.filter((r) => Number(r.fk_course_id) === Number(courseId)), (r) => Number(r.fk_academic_year_id))
    const current = years.sort((a, b) => Number(b.is_curr_ay ?? 0) - Number(a.is_curr_ay ?? 0))[0]
    setAcademicYearId(Number(current?.fk_academic_year_id ?? years[0]?.fk_academic_year_id ?? 0) || null)
    setExamId(null)
    setCollegeId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setRegulationId(null)
    setSubjectTypeId(null)
    setSubjectId(null)
    setRestRows([])
    setSubjectFilterRows([])
    setStudents([])
    setSelectedStudents([])
    setRegisteredStudents([])
  }, [courseId, baseRows])

  useEffect(() => {
    if (!courseId || !academicYearId) return
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          Number(r.fk_course_id) === Number(courseId) &&
          Number(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => Number(r.fk_exam_id),
    )
    setExamId(Number(list[0]?.fk_exam_id ?? 0) || null)
  }, [courseId, academicYearId, baseRows])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const rows = await getUnivExamRestNoTt({
        courseId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => [])
      const list = Array.isArray(rows) ? rows : []
      setRestRows(list)
      setCollegeId(Number(list[0]?.fk_college_id ?? 0) || null)
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    const list = dedupeBy(restRows.filter((r) => Number(r.fk_college_id) === Number(collegeId)), (r) => Number(r.fk_course_group_id))
    setCourseGroupId(Number(list[0]?.fk_course_group_id ?? 0) || null)
  }, [restRows, collegeId])

  useEffect(() => {
    const list = dedupeBy(
      restRows.filter(
        (r) =>
          Number(r.fk_college_id) === Number(collegeId) &&
          Number(r.fk_course_group_id) === Number(courseGroupId),
      ),
      (r) => Number(r.fk_course_year_id),
    )
    setCourseYearId(Number(list[0]?.fk_course_year_id ?? 0) || null)
  }, [restRows, collegeId, courseGroupId])

  useEffect(() => {
    async function loadSubjectsFilters() {
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId) return
      const rows = await getUnivExamSubjectInss({
        collegeId,
        courseId,
        courseGroupId,
        courseYearId,
        examId,
        academicYearId,
        employeeId,
      }).catch(() => [])
      const list = Array.isArray(rows) ? rows : []
      setSubjectFilterRows(list)
      setRegulationId(Number(dedupeBy(list, (r) => Number(r.fk_regulation_id))[0]?.fk_regulation_id ?? 0) || null)
    }
    void loadSubjectsFilters()
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, employeeId])

  useEffect(() => {
    const list = dedupeBy(
      subjectFilterRows.filter((r) => Number(r.fk_regulation_id) === Number(regulationId)),
      (r) => Number(r.fk_subjecttype_catdet_id),
    )
    setSubjectTypeId(Number(list[0]?.fk_subjecttype_catdet_id ?? 0) || null)
  }, [subjectFilterRows, regulationId])

  useEffect(() => {
    const list = dedupeBy(
      subjectFilterRows.filter(
        (r) =>
          Number(r.fk_regulation_id) === Number(regulationId) &&
          Number(r.fk_subjecttype_catdet_id) === Number(subjectTypeId),
      ),
      (r) => Number(r.fk_subject_id),
    )
    setSubjectId(Number(list[0]?.fk_subject_id ?? 0) || null)
  }, [subjectFilterRows, regulationId, subjectTypeId])

  useEffect(() => {
    async function loadStudents() {
      if (!collegeId || !academicYearId || !courseId || !courseGroupId || !courseYearId || !regulationId || !subjectId || !subjectTypeId || !examId) return
      const [all, reg] = await Promise.all([
        listExamSubjectStudents({
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          courseYearId,
          regulationId,
          subjectId,
          subjectTypeId,
        }).catch(() => []),
        listRegisteredStudentsForExam({
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          courseYearId,
          regulationId,
          subjectId,
          examId,
        }).catch(() => []),
      ])

      const allList = Array.isArray(all) ? all : []
      const regList = Array.isArray(reg) ? reg : []
      setRegisteredStudents(regList)
      const regSet = new Set(regList.map((s) => getStudentId(s)).filter((x) => x > 0))

      const mapped = allList.map((s) => {
        const sid = getStudentId(s)
        const already = regSet.has(sid)
        return { ...s, checked: true, c: true, already }
      })
      setStudents(mapped)
      setSelectedStudents(mapped.filter((s) => s.c))
    }
    void loadStudents()
  }, [collegeId, academicYearId, courseId, courseGroupId, courseYearId, regulationId, subjectId, subjectTypeId, examId])

  function toggleAll(checked: boolean) {
    const nextStudents = students.map((s) => {
      return { ...s, checked, c: checked }
    })
    setStudents(nextStudents)
    setSelectedStudents(nextStudents.filter((s) => s.c))
  }

  function toggleStudent(sid: number, checked: boolean) {
    const next = students.map((s) => {
      const id = getStudentId(s)
      if (id !== sid) return s
      return { ...s, checked, c: checked }
    })
    setStudents(next)
    setSelectedStudents(next.filter((s) => s.c))
  }

  async function onSave() {
    if (!selectedStudents.length || !collegeId || !examId || !courseGroupId || !courseYearId || !regulationId || !subjectId) return
    const toRegister = selectedStudents.filter((s) => !s.already)
    if (toRegister.length === 0) {
      alert('All selected students are already registered for this subject.')
      return
    }
    const payload = toRegister.map((s) => ({
      studentId: getStudentId(s),
      collegeId,
      examId,
      courseGroupId,
      courseYearId,
      regulationId,
      examtypeCatCode: 'Internal',
      isInternalExam: true,
      isActive: true,
      examStudentDetailDTOs: [{ collegeId, subjectId, isActive: true }],
    }))
    setLoading(true)
    try {
      await saveRegisteredExamSubjects(payload)
      const skipped = selectedStudents.length - toRegister.length
      if (skipped > 0) {
        alert(`Students registered successfully. Skipped ${skipped} already-registered student(s).`)
      } else {
        alert('Students registered successfully')
      }
      setSelectedStudents([])
      // reload
      const reg = await listRegisteredStudentsForExam({
        collegeId,
        academicYearId: Number(academicYearId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        regulationId: Number(regulationId),
        subjectId: Number(subjectId),
        examId: Number(examId),
      }).catch(() => [])
      const regList = Array.isArray(reg) ? reg : []
      setRegisteredStudents(regList)
      const regSet = new Set(regList.map((s) => getStudentId(s)).filter((x) => x > 0))
      setStudents((prev) => prev.map((s) => {
        const sid = getStudentId(s)
        if (regSet.has(sid)) return { ...s, checked: false, c: false, already: true }
        return s
      }))
    } catch (e: any) {
      alert(e?.message ?? 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-4 text-[12px]">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))]">Internal Exam Registration Multiple Students</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label>Course</Label>
              <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>{courses.map((c, i) => <SelectItem key={`c-${i}`} value={String(c.fk_course_id)}>{c.course_code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year</Label>
              <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
                <SelectContent>{academicYears.map((a, i) => <SelectItem key={`ay-${i}`} value={String(a.fk_academic_year_id)}>{a.academic_year}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5 space-y-1">
              <Label>Exam Master</Label>
              <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Master" /></SelectTrigger>
                <SelectContent>{exams.map((e, i) => <SelectItem key={`e-${i}`} value={String(e.fk_exam_id)}>{e.exam_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>College</Label>
              <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
                <SelectContent>{colleges.map((c, i) => <SelectItem key={`cl-${i}`} value={String(c.fk_college_id)}>{c.college_code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Course Group</Label>
              <Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger>
                <SelectContent>{courseGroups.map((g, i) => <SelectItem key={`g-${i}`} value={String(g.fk_course_group_id)}>{g.group_code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Course Year</Label>
              <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
                <SelectContent>{courseYears.map((y, i) => <SelectItem key={`y-${i}`} value={String(y.fk_course_year_id)}>{y.course_year_code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Regulation</Label>
              <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger>
                <SelectContent>{regulations.map((r, i) => <SelectItem key={`r-${i}`} value={String(r.fk_regulation_id)}>{r.regulation_code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="app-card p-4 space-y-3">
        <div className="text-[14px] font-medium rounded bg-blue-100 border px-3 py-2">Select Exam Subjects</div>

        <div className="border rounded overflow-hidden">
          <div className="border-b p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <Label>Subject Type</Label>
                <Select value={subjectTypeId ? String(subjectTypeId) : undefined} onValueChange={(v) => setSubjectTypeId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject Type" /></SelectTrigger>
                  <SelectContent>{subjectTypes.map((s, i) => <SelectItem key={`st-${i}`} value={String(s.fk_subjecttype_catdet_id)}>{s.subject_type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-6">
                <Label>Subject</Label>
                <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>{subjects.map((s, i) => <SelectItem key={`sub-${i}`} value={String(s.fk_subject_id)}>{s.subject_code} - {s.subject_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b">
          <div className="md:col-span-4 border-r overflow-hidden">
            <div className="p-2 border-b bg-slate-50 flex items-center gap-2">
              <Input className="h-8 text-[12px]" placeholder="Search..." value={searchAll} onChange={(e) => setSearchAll(e.target.value)} />
            </div>
            <div className="p-2 border-b text-[12px] flex items-center gap-2">
              <Checkbox checked={students.length > 0 && selectedStudents.length > 0 && selectedStudents.length === students.filter((s) => !s.already).length} onCheckedChange={(v) => toggleAll(!!v)} />
              <span>All</span>
              <span className="text-blue-600">Student List: {students.length}</span>
            </div>
            <div className="max-h-[300px] overflow-auto divide-y">
              {studentsFiltered.map((s, i) => {
                const sid = getStudentId(s)
                const checked = !!s.c
                return (
                  <div key={`a-${sid || i}`} className="px-2 py-2 flex items-center gap-2">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleStudent(sid, !!v)} />
                    <span className={s.already ? 'text-muted-foreground' : ''}>
                      {s.firstName ?? s.studentName ?? '-'} ({s.hallticketNumber ?? '-'})
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="md:col-span-4 border-r overflow-hidden">
            <div className="p-2 border-b bg-slate-50"><Input className="h-8 text-[12px]" placeholder="Search..." value={searchSelected} onChange={(e) => setSearchSelected(e.target.value)} /></div>
            <div className="p-2 border-b">Selected Students: <span className="text-blue-600">{selectedStudents.length}</span></div>
            <div className="max-h-[300px] overflow-auto divide-y">
              {selectedFiltered.map((s, i) => (
                <div key={`sel-${i}`} className="px-2 py-2">{s.firstName ?? s.studentName ?? '-'} ({s.hallticketNumber ?? '-'})</div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 overflow-hidden">
            <div className="p-2 border-b bg-slate-50"><Input className="h-8 text-[12px]" placeholder="Search..." value={searchRegistered} onChange={(e) => setSearchRegistered(e.target.value)} /></div>
            <div className="p-2 border-b">Registered Students: <span className="text-blue-600">{registeredStudents.length}</span></div>
            <div className="max-h-[300px] overflow-auto divide-y">
              {registeredFiltered.map((s, i) => (
                <div key={`reg-${i}`} className="px-2 py-2">{s.firstName ?? s.studentName ?? '-'} ({s.hallticketNumber ?? '-'})</div>
              ))}
            </div>
          </div>

          </div>

          <div className="h-16 grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-11 border-r" />
            <div className="md:col-span-1 flex items-center justify-center">
              <Button type="button" className="h-8 text-[12px] px-6" disabled={loading || checkedCount === 0} onClick={onSave}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

