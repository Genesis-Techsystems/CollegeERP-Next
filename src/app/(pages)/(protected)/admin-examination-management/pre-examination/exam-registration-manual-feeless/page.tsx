'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getExamRegistrationForm,
  listExamMastersByCourseAndAy,
  listRegisteredExamSubjects,
  listStudents,
  listStudentSubjects,
  saveRegisteredExamSubjects,
} from '@/services/pre-examination'
import { MINIO_URL } from '@/config/constants/api'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}
const getStatusClass = (code: string) => {
  const c = code.toUpperCase()
  if (c === 'INCOLLEGE') return 'text-green-700'
  if (c === 'DTND' || c === 'DETAINRECOMMENDED') return 'text-amber-700'
  if (c === 'PASSEDOUT') return 'text-blue-700'
  if (c === 'DISCONTINUED') return 'text-red-700'
  return 'text-slate-700'
}

export default function ExamRegistrationManualFeelessPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')
  const [students, setStudents] = useState<AnyRow[]>([])
  const [exams, setExams] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<string>('')
  const [examId, setExamId] = useState<string>('')
  const [hasFetched, setHasFetched] = useState(false)
  const [subjectSearch, setSubjectSearch] = useState('')
  const [examMode, setExamMode] = useState<'REGULAR' | 'SUPPLE'>('REGULAR')
  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [registeredSubjects, setRegisteredSubjects] = useState<AnyRow[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])
  const [selectedCourseYearId, setSelectedCourseYearId] = useState<number | null>(null)

  const canGetList = studentId.trim() !== '' && examId.trim() !== ''
  const selectedStudent = useMemo(
    () => students.find((s) => String(pickNum(s, ['studentId', 'fk_student_id'])) === studentId) ?? null,
    [students, studentId],
  )
  const filteredExams = useMemo(
    () =>
      exams.filter((e) =>
        examMode === 'REGULAR' ? Boolean(e.isRegularExam ?? e.is_regular_exam ?? true) : Boolean(e.isSupplyExam ?? e.is_supply_exam),
      ),
    [exams, examMode],
  )
  const selectedExam = useMemo(
    () => filteredExams.find((e) => String(pickNum(e, ['examId', 'fk_exam_id'])) === examId) ?? null,
    [filteredExams, examId],
  )
  const selectedStudentNumId = pickNum(selectedStudent, ['studentId', 'fk_student_id'])
  const selectedExamNumId = pickNum(selectedExam, ['examId', 'fk_exam_id'])
  const selectedCollegeId = pickNum(selectedStudent, ['collegeId', 'fk_college_id'])
  const selectedCourseId = pickNum(selectedStudent, ['courseId', 'fk_course_id'])
  const selectedAcademicYearId = pickNum(selectedStudent, ['academicYearId', 'fk_academic_year_id'])
  const selectedCourseGroupId = pickNum(selectedStudent, ['courseGroupId', 'fk_course_group_id'])
  const studentCourseYearId = pickNum(selectedStudent, ['courseYearId', 'fk_course_year_id'])
  const selectedRegulationId = pickNum(selectedStudent, ['regulationId', 'fk_regulation_id'])
  const courseYearOptions = useMemo(
    () =>
      [
        {
          id: studentCourseYearId,
          label:
            pickText(selectedStudent, ['courseYearCode', 'course_year_code', 'courseYearName', 'course_year_name']) || 'Course Year',
        },
      ].filter((x) => x.id > 0),
    [studentCourseYearId, selectedStudent],
  )
  const registeredSubjectIdSet = useMemo(
    () => new Set(registeredSubjects.map((s) => pickNum(s, ['subjectId', 'fk_subject_id']))),
    [registeredSubjects],
  )
  const selectableSubjects = useMemo(
    () => subjects.filter((s) => !registeredSubjectIdSet.has(pickNum(s, ['subjectId', 'fk_subject_id']))),
    [subjects, registeredSubjectIdSet],
  )
  const filteredSelectableSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase()
    if (!q) return selectableSubjects
    return selectableSubjects.filter((s) =>
      `${pickText(s, ['subjectName', 'subject_name'])} ${pickText(s, ['subjectCode', 'subject_code'])}`.toLowerCase().includes(q),
    )
  }, [selectableSubjects, subjectSearch])
  const selectedSubjects = useMemo(
    () => selectableSubjects.filter((s) => selectedSubjectIds.includes(pickNum(s, ['subjectId', 'fk_subject_id']))),
    [selectableSubjects, selectedSubjectIds],
  )
  const allSelected = filteredSelectableSubjects.length > 0 && filteredSelectableSubjects.every((s) => selectedSubjectIds.includes(pickNum(s, ['subjectId', 'fk_subject_id'])))

  useEffect(() => {
    const q = studentQuery.trim()
    if (q.length < 3) {
      setStudents([])
      return
    }
    const id = setTimeout(async () => {
      setLoading(true)
      try {
        const rows = await listStudents(q).catch(() => [])
        setStudents(Array.isArray(rows) ? rows : [])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(id)
  }, [studentQuery])

  useEffect(() => {
    async function loadExams() {
      if (!selectedStudent) {
        setExams([])
        return
      }
      const courseId = pickNum(selectedStudent, ['courseId', 'fk_course_id'])
      const academicYearId = pickNum(selectedStudent, ['academicYearId', 'fk_academic_year_id'])
      if (!courseId || !academicYearId) {
        setExams([])
        return
      }
      setLoading(true)
      try {
        const rows = await listExamMastersByCourseAndAy(courseId, academicYearId).catch(() => [])
        const list = Array.isArray(rows) ? rows : []
        setExams(list.filter((e) => !(e.isInternalExam ?? e.is_internal_exam)))
      } finally {
        setLoading(false)
      }
    }
    setExamId('')
    setExamMode('REGULAR')
    setSelectedCourseYearId(studentCourseYearId || null)
    setHasFetched(false)
    setSubjects([])
    setRegisteredSubjects([])
    setSelectedSubjectIds([])
    void loadExams()
  }, [selectedStudent])
  useEffect(() => {
    setExamId('')
    setHasFetched(false)
  }, [examMode])

  async function onGetList() {
    if (!canGetList) return
    if (!selectedStudentNumId || !selectedExamNumId || !selectedCollegeId || !selectedAcademicYearId || !selectedCourseId || !selectedCourseYearId) {
      toastError('Missing student academic details for loading subjects.')
      return
    }
    setLoading(true)
    try {
      const [subRows, regRows] = await Promise.all([
        listStudentSubjects({
          collegeId: selectedCollegeId,
          academicYearId: selectedAcademicYearId,
          studentId: selectedStudentNumId,
          courseYearId: selectedCourseYearId ?? studentCourseYearId ?? 0,
        }).catch(() => []),
        listRegisteredExamSubjects(selectedStudentNumId, selectedExamNumId).catch(() => []),
      ])
      const allSubjects = Array.isArray(subRows) ? subRows : []
      const regSubjects = Array.isArray(regRows) ? regRows : []
      setSubjects(allSubjects)
      setRegisteredSubjects(regSubjects)
      const regSet = new Set(regSubjects.map((s) => pickNum(s, ['subjectId', 'fk_subject_id'])))
      const initialSelected = allSubjects
        .map((s) => pickNum(s, ['subjectId', 'fk_subject_id']))
        .filter((id) => id > 0 && !regSet.has(id))
      setSelectedSubjectIds(initialSelected)
    } finally {
      setLoading(false)
    }
    setHasFetched(true)
  }

  function onToggleSubject(subjectVal: number, checked: boolean) {
    setSelectedSubjectIds((prev) => {
      if (checked) return prev.includes(subjectVal) ? prev : [...prev, subjectVal]
      return prev.filter((x) => x !== subjectVal)
    })
  }
  function onToggleAllSubjects(checked: boolean) {
    const scopedIds = filteredSelectableSubjects.map((s) => pickNum(s, ['subjectId', 'fk_subject_id'])).filter((id) => id > 0)
    if (!checked) {
      setSelectedSubjectIds((prev) => prev.filter((id) => !scopedIds.includes(id)))
      return
    }
    setSelectedSubjectIds((prev) => Array.from(new Set([...prev, ...scopedIds])))
  }

  async function onRegisterSubjects() {
    if (!selectedStudentNumId || !selectedExamNumId || !selectedCollegeId || !selectedCourseYearId || !selectedCourseGroupId) return
    if (selectedSubjectIds.length === 0) {
      toastError('Select at least one subject to register.')
      return
    }
    const examtypeCatId =
      pickNum(selectedExam, ['examtypeCatId', 'examTypeCatId']) || (selectedExam?.isSupplyExam || selectedExam?.is_supply_exam ? 2 : 1)

    const payload = [
      {
        registrationDate: new Date().toISOString(),
        isInternalExam: false,
        collegeId: selectedCollegeId,
        examId: selectedExamNumId,
        studentId: selectedStudentNumId,
        courseId: selectedCourseId || undefined,
        courseGroupId: selectedCourseGroupId,
        courseYearId: selectedCourseYearId ?? studentCourseYearId ?? 0,
        regulationId: selectedRegulationId || undefined,
        examtypeCatId,
        isActive: true,
        firstName: pickText(selectedStudent, ['firstName', 'studentName', 'student_name']) || undefined,
        hallticketNumber: pickText(selectedStudent, ['hallticketNumber', 'rollNumber', 'hallticket_number']) || undefined,
        examStudentDetailDTOs: selectedSubjectIds.map((sid) => ({ collegeId: selectedCollegeId, subjectId: sid, isActive: true })),
      },
    ]

    setLoading(true)
    try {
      await saveRegisteredExamSubjects(payload)
      toastSuccess('Subjects registered successfully.')
      await onGetList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to register subjects.')
    } finally {
      setLoading(false)
    }
  }
  async function onViewExamForm() {
    if (!selectedCollegeId || !selectedExamNumId || !selectedStudentNumId) return
    setLoading(true)
    try {
      const row = await getExamRegistrationForm({
        collegeId: selectedCollegeId,
        examId: selectedExamNumId,
        studentId: selectedStudentNumId,
      })
      const path = pickText(row, ['applicationFilePath', 'application_file_path', 'filePath', 'file_path'])
      if (!path) {
        toastError('Exam Form not uploaded.')
        return
      }
      const url = /^https?:\/\//i.test(path) ? path : `${MINIO_URL}${path}`
      if (!url || url === path) {
        toastError('Unable to open exam form.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to fetch exam form.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Registration Manual Feeless" subtitle="Register students without fee requirements" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Registration Manual Feeless</h2>
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
                <Label>Student</Label>
                <Select value={studentId || undefined} onValueChange={setStudentId}>
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 border-b sticky top-0 bg-white z-10">
                      <Input
                        value={studentQuery}
                        onChange={(e) => setStudentQuery(e.target.value)}
                        placeholder="Search student..."
                        className="h-8 text-[12px]"
                      />
                    </div>
                    {students.map((s) => (
                      <SelectItem
                        key={`s-${pickNum(s, ['studentId', 'fk_student_id']) || pickText(s, ['hallticketNumber', 'rollNumber', 'hallticket_number'])}`}
                        value={String(pickNum(s, ['studentId', 'fk_student_id']))}
                      >
                        {`${pickText(s, ['firstName', 'studentName', 'student_name']) || '-'} (${pickText(s, ['hallticketNumber', 'rollNumber', 'hallticket_number']) || '-'})`}
                      </SelectItem>
                    ))}
                    {students.length === 0 && studentQuery.trim().length >= 3 && (
                      <div className="px-2 py-2 text-[12px] text-muted-foreground">No students found.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-5 space-y-1">
                <Label>Exam</Label>
                <Select value={examId || undefined} onValueChange={setExamId}>
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Select Exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredExams.map((e) => (
                      <SelectItem key={`e-${pickNum(e, ['examId', 'fk_exam_id'])}`} value={String(pickNum(e, ['examId', 'fk_exam_id']))}>
                        {pickText(e, ['examName', 'exam_name']) || '-'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button type="button" disabled={!canGetList || loading} className="h-8 px-3 text-[12px] w-full" onClick={onGetList}>
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card p-3 space-y-2">
          <div className="rounded border bg-slate-50 px-3 py-2 text-[12px]">
            <span className="font-medium text-slate-700">
              {pickText(selectedStudent, ['firstName', 'studentName', 'student_name']) || '-'}
            </span>
            <span className="text-slate-500">
              {' '}
              ({pickText(selectedStudent, ['hallticketNumber', 'rollNumber', 'hallticket_number']) || '-'})
            </span>
            <span className="text-slate-500"> - {pickText(selectedExam, ['examName', 'exam_name']) || '-'}</span>
          </div>
          <div className="rounded border px-3 py-3 bg-white">
            <div className="flex items-start gap-3">
              <img
                src={pickText(selectedStudent, ['studentPhotoPath']) || '/assets/images/avatars/default_Student.png'}
                alt=""
                className="h-14 w-14 rounded border object-cover"
              />
              <div className="flex-1 text-[12px]">
                <div className="font-semibold">
                  {pickText(selectedStudent, ['firstName', 'studentName', 'student_name']) || '-'}{' '}
                  <span className="text-blue-600">(REGULAR)</span>
                </div>
                <div className="text-slate-600">{pickText(selectedStudent, ['hallticketNumber', 'rollNumber', 'hallticket_number']) || '-'}</div>
                <div className="text-slate-600">
                  {pickText(selectedStudent, ['collegeCode', 'college_code']) || '-'} / {pickText(selectedStudent, ['academicYear', 'academic_year']) || '-'} /{' '}
                  {pickText(selectedStudent, ['courseCode', 'course_code']) || '-'} / {pickText(selectedStudent, ['groupCode', 'group_code']) || '-'} /{' '}
                  {pickText(selectedStudent, ['courseYearCode', 'course_year_code', 'courseYearName']) || '-'}
                </div>
              </div>
              <div className="text-[12px] min-w-[220px]">
                <div>Quota : <span className="text-blue-700 font-semibold">{pickText(selectedStudent, ['quotaDisplayName']) || '-'}</span></div>
                <div>
                  Student Status :{' '}
                  <span className={`${getStatusClass(pickText(selectedStudent, ['studentStatusCode']))} font-semibold`}>
                    {pickText(selectedStudent, ['studentStatusDisplayName']) || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded border overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-100 text-[13px] font-medium">Select Exam Fee Subjects</div>
            <div className="p-2 text-[12px] flex items-center gap-6 border-b">
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={examMode === 'REGULAR'} onChange={() => setExamMode('REGULAR')} />
                <span>Regular</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" checked={examMode === 'SUPPLE'} onChange={() => setExamMode('SUPPLE')} />
                <span>Supplementary</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-7 rounded border overflow-hidden">
              <div className="p-2 border-b bg-slate-50">
                <Input
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="h-8 text-[12px]"
                  placeholder="Search subject..."
                />
              </div>
              <div className="px-3 py-2 text-[12px] border-b">
                Subjects: <span className="text-blue-600">{selectedSubjectIds.length}</span>
              </div>
              <div className="max-h-[320px] overflow-auto divide-y">
                <label className="px-3 py-2 flex items-center gap-2 text-[12px] bg-slate-50">
                  <input type="checkbox" checked={allSelected} onChange={(e) => onToggleAllSubjects(e.target.checked)} />
                  <span>All</span>
                </label>
                {filteredSelectableSubjects.map((s) => {
                  const sid = pickNum(s, ['subjectId', 'fk_subject_id'])
                  return (
                    <label key={`sub-${sid}`} className="px-3 py-2 flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(sid)}
                        onChange={(e) => onToggleSubject(sid, e.target.checked)}
                      />
                      <span>
                        {pickText(s, ['shortName', 'subjectName', 'subject_name']) || '-'}
                        {' - '}
                        <span className="text-blue-600">{pickText(s, ['subjectCode', 'subject_code']) || '-'}</span>
                      </span>
                    </label>
                  )
                })}
                {filteredSelectableSubjects.length === 0 && (
                  <div className="px-3 py-6 text-[12px] text-muted-foreground">No unregistered subjects found.</div>
                )}
              </div>
            </div>

            <div className="md:col-span-5 rounded border overflow-hidden">
              <div className="px-3 py-2 text-[12px] border-b bg-slate-50">
                Selected Subjects : <span className="text-blue-600">{selectedSubjects.length}</span>
              </div>
              <div className="max-h-[320px] overflow-auto divide-y">
                {selectedSubjects.map((s) => {
                  const sid = pickNum(s, ['subjectId', 'fk_subject_id'])
                  return (
                    <div key={`sel-${sid}`} className="px-3 py-2 text-[12px]">
                      {pickText(s, ['shortName', 'subjectName', 'subject_name']) || '-'}
                      {' - '}
                      <span className="text-blue-600">{pickText(s, ['subjectCode', 'subject_code']) || '-'}</span>
                    </div>
                  )
                })}
                {selectedSubjects.length === 0 && (
                  <div className="px-3 py-6 text-[12px] text-muted-foreground">No selected subjects.</div>
                )}
              </div>
            </div>
          </div>
          <div className="rounded border p-2 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3 space-y-1">
                <Label>Course Year *</Label>
                <Select
                  value={selectedCourseYearId ? String(selectedCourseYearId) : undefined}
                  onValueChange={(v) => setSelectedCourseYearId(Number(v))}
                >
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue placeholder="Course Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseYearOptions.map((cy) => (
                      <SelectItem key={`cy-${cy.id}`} value={String(cy.id)}>
                        {cy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" className="h-8 text-[12px]" disabled={loading || selectedSubjectIds.length === 0} onClick={onRegisterSubjects}>
              Add Subjects
            </Button>
          </div>

          <div className="rounded border overflow-hidden">
            <div className="px-3 py-2 text-[13px] font-medium bg-slate-100 border-b">Registrated Subjects</div>
            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left">SI No</th>
                    <th className="px-2 py-1 text-left">Course Year</th>
                    <th className="px-2 py-1 text-left">Subject</th>
                    <th className="px-2 py-1 text-left">Exam Form</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredSubjects.length > 0 ? (
                    <tr className="border-t">
                      <td className="px-2 py-1">1</td>
                      <td className="px-2 py-1">
                        {pickText(selectedStudent, ['courseYearCode', 'course_year_code', 'courseYearName', 'course_year_name']) || '-'}
                      </td>
                      <td className="px-2 py-1">
                        {registeredSubjects
                          .map((s) => `${pickText(s, ['shortName', 'subjectName', 'subject_name']) || '-'} - ${pickText(s, ['subjectCode', 'subject_code']) || '-'}`)
                          .join(', ')}
                      </td>
                      <td className="px-2 py-1">
                        <Button type="button" variant="outline" className="h-7 text-[12px]" onClick={onViewExamForm} disabled={loading}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t">
                      <td colSpan={4} className="px-2 py-4 text-center text-muted-foreground">
                        No registered subjects found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

