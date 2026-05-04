'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { BookMarked, ChevronDown, Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  addListUnivEcStudents,
  listUnivEcCollegesByCenterAndExam,
  listUnivEcStudentsByCenterExamSubject,
  listUnivExamCentersByUniversity,
  listUniversitiesForExamGroup,
  type AnyRow,
} from '@/services/exam-papers-delivery'
import { getExamOmrStudents, getUnivExamFiltersRegSup } from '@/services/pre-examination'

type Row = AnyRow

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (row: T) => number): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const r of rows) {
    const key = keyFn(r)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

function pickCourseId(r: Row): number {
  return num(r.fk_course_ids ?? r.fk_course_id ?? r.courseId)
}
function pickAyId(r: Row): number {
  return num(r.pk_academic_year_id ?? r.fk_academic_year_id ?? r.academicYearId)
}
function pickExamId(r: Row): number {
  return num(r.pk_exam_id ?? r.fk_exam_id ?? r.examId)
}
function pickCourseYearId(r: Row): number {
  return num(r.fk_course_year_ids ?? r.fk_course_year_id ?? r.courseYearId)
}
function pickRegId(r: Row): number {
  return num(r.pk_regulation_id ?? r.fk_regulation_id ?? r.regulationId)
}
function pickSubjectId(r: Row): number {
  return num(r.fk_subject_id ?? r.subjectId)
}
function pickCollegeId(r: Row): number {
  return num(r.collegeId ?? r.fk_college_id)
}

export default function UnivExamcenterStudentsPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [showSections, setShowSections] = useState(false)

  const [allRows, setAllRows] = useState<Row[]>([])
  const [candidateRows, setCandidateRows] = useState<Row[]>([])
  const [candidateSource, setCandidateSource] = useState<Row[]>([])
  const [assignedRows, setAssignedRows] = useState<Row[]>([])
  const [univExamCenters, setUnivExamCenters] = useState<Row[]>([])
  const [examCenterColleges, setExamCenterColleges] = useState<Row[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Row[]>([])
  const [searchCandidates, setSearchCandidates] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [orgId, setOrgId] = useState(0)

  const [form, setForm] = useState({
    courseId: '',
    academicYearId: '',
    examId: '',
    courseYearId: '',
    regulationId: '',
    subjectId: '',
    univExamcenterId: '',
    collegeId: '0',
  })

  const courses = useMemo(() => dedupeBy(allRows, pickCourseId), [allRows])
  const academicYears = useMemo(
    () => dedupeBy(allRows.filter((r) => pickCourseId(r) === Number(form.courseId)), pickAyId),
    [allRows, form.courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        allRows.filter((r) => pickCourseId(r) === Number(form.courseId) && pickAyId(r) === Number(form.academicYearId)),
        pickExamId,
      ).filter((r) => r.is_internal_exam !== true),
    [allRows, form.courseId, form.academicYearId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        allRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAyId(r) === Number(form.academicYearId) &&
            pickExamId(r) === Number(form.examId),
        ),
        pickCourseYearId,
      ),
    [allRows, form.courseId, form.academicYearId, form.examId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        allRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAyId(r) === Number(form.academicYearId) &&
            pickExamId(r) === Number(form.examId) &&
            pickCourseYearId(r) === Number(form.courseYearId),
        ),
        pickRegId,
      ),
    [allRows, form.courseId, form.academicYearId, form.examId, form.courseYearId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        allRows.filter(
          (r) =>
            pickCourseId(r) === Number(form.courseId) &&
            pickAyId(r) === Number(form.academicYearId) &&
            pickExamId(r) === Number(form.examId) &&
            pickCourseYearId(r) === Number(form.courseYearId) &&
            pickRegId(r) === Number(form.regulationId),
        ),
        pickSubjectId,
      ),
    [allRows, form.courseId, form.academicYearId, form.examId, form.courseYearId, form.regulationId],
  )

  const centerOptions: SelectOption[] = useMemo(
    () =>
      univExamCenters.map((c) => ({
        value: String(num(c.univExamcenterId ?? c.univExamCenterId)),
        label: txt(c.examcenterCode ?? c.examCenterCode),
      })),
    [univExamCenters],
  )

  const collegeOptions: SelectOption[] = useMemo(
    () => [
      { value: '0', label: 'All' },
      ...examCenterColleges.map((c) => ({
        value: String(num(c.collegeId ?? c.fk_college_id)),
        label: txt(c.collegeCode ?? c.college_code),
      })),
    ],
    [examCenterColleges],
  )

  const filteredCandidates = useMemo(() => {
    const q = searchCandidates.trim().toLowerCase()
    if (!q) return candidateRows
    return candidateRows.filter((r) => `${txt(r.hallticket_number)} ${txt(r.omr_serial_no)}`.toLowerCase().includes(q))
  }, [candidateRows, searchCandidates])

  const assignedColumnDefs = useMemo<ColDef<Row>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 80, flex: 0 },
      { headerName: 'Exam Center', minWidth: 140, valueGetter: (p) => txt(p.data?.examcenterCode) },
      { headerName: 'Exam', minWidth: 160, valueGetter: (p) => txt(p.data?.examName) },
      { headerName: 'Subject Code', minWidth: 130, valueGetter: (p) => txt(p.data?.subjectCode ?? p.data?.subject_code) },
      { headerName: 'Student', minWidth: 140, valueGetter: (p) => txt(p.data?.hallticketNumber ?? p.data?.hallticket_number) },
    ],
    [],
  )

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
    setOrgId(Number(globalThis?.localStorage?.getItem('organizationId') ?? 0))
  }, [])

  useEffect(() => {
    async function init() {
      if (!employeeId) return
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
        const list = Array.isArray(rows) ? rows : []
        setAllRows(list)
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (!courses.length || form.courseId) return
    setForm((f) => ({ ...f, courseId: String(pickCourseId(courses[0])) }))
  }, [courses, form.courseId])

  useEffect(() => {
    const v = academicYears[0] ? String(pickAyId(academicYears[0])) : ''
    setForm((f) => ({ ...f, academicYearId: v, examId: '', courseYearId: '', regulationId: '', subjectId: '', univExamcenterId: '', collegeId: '0' }))
  }, [form.courseId, academicYears])

  useEffect(() => {
    const v = exams[0] ? String(pickExamId(exams[0])) : ''
    setForm((f) => ({ ...f, examId: v, courseYearId: '', regulationId: '', subjectId: '', univExamcenterId: '', collegeId: '0' }))
  }, [form.academicYearId, exams])

  useEffect(() => {
    const v = courseYears[0] ? String(pickCourseYearId(courseYears[0])) : ''
    setForm((f) => ({ ...f, courseYearId: v, regulationId: '', subjectId: '' }))
  }, [form.examId, courseYears])

  useEffect(() => {
    const v = regulations[0] ? String(pickRegId(regulations[0])) : ''
    setForm((f) => ({ ...f, regulationId: v, subjectId: '' }))
  }, [form.courseYearId, regulations])

  useEffect(() => {
    const v = subjects[0] ? String(pickSubjectId(subjects[0])) : ''
    setForm((f) => ({ ...f, subjectId: v }))
  }, [form.regulationId, subjects])

  useEffect(() => {
    async function loadExamCenters() {
      if (!form.examId || !employeeId || !orgId) return
      const univs = await listUniversitiesForExamGroup(orgId, employeeId).catch(() => [])
      const universityId = num((univs[0] ?? {})['universityId'])
      if (!universityId) {
        setUnivExamCenters([])
        return
      }
      const centers = await listUnivExamCentersByUniversity(universityId).catch(() => [])
      setUnivExamCenters(Array.isArray(centers) ? centers : [])
    }
    void loadExamCenters()
  }, [form.examId, employeeId, orgId])

  useEffect(() => {
    const v = centerOptions[0]?.value ?? ''
    setForm((f) => ({ ...f, univExamcenterId: v, collegeId: '0' }))
  }, [centerOptions])

  useEffect(() => {
    async function loadCenterColleges() {
      if (!form.univExamcenterId || !form.examId) return
      const rows = await listUnivEcCollegesByCenterAndExam(Number(form.univExamcenterId), Number(form.examId)).catch(() => [])
      setExamCenterColleges(Array.isArray(rows) ? rows : [])
      setForm((f) => ({ ...f, collegeId: '0' }))
    }
    void loadCenterColleges()
  }, [form.univExamcenterId, form.examId])

  function toggleCandidate(idx: number, checked: boolean) {
    const row = filteredCandidates[idx]
    if (!row) return
    setCandidateRows((rows) =>
      rows.map((r) => (num(r.fk_student_id) === num(row.fk_student_id) ? { ...r, checked, isSelected: checked } : r)),
    )
  }

  function toggleSelectAll(checked: boolean) {
    setSelectAll(checked)
    setCandidateRows((rows) => rows.map((r) => ({ ...r, checked, isSelected: checked })))
  }

  useEffect(() => {
    const selected = candidateRows.filter((r) => r.isSelected === true)
    setSelectedStudents(selected)
  }, [candidateRows])

  async function onGetStudents() {
    if (!form.examId || !form.courseId || !form.courseYearId || !form.regulationId || !form.subjectId || !form.univExamcenterId) {
      toastError('Please select required filters.')
      return
    }
    setLoadingList(true)
    try {
      const [allExamStudents, alreadyAssigned] = await Promise.all([
        getExamOmrStudents({
          examId: Number(form.examId),
          collegeId: Number(form.collegeId),
          courseId: Number(form.courseId),
          courseGroupId: 0,
          courseYearId: Number(form.courseYearId),
          regulationId: Number(form.regulationId),
          subjectId: Number(form.subjectId),
        }).catch(() => []),
        listUnivEcStudentsByCenterExamSubject(
          Number(form.univExamcenterId),
          Number(form.examId),
          Number(form.subjectId),
        ).catch(() => []),
      ])

      const assigned = Array.isArray(alreadyAssigned) ? alreadyAssigned : []
      const assignedStudentIds = new Set(assigned.map((r) => num(r.studentDetailId ?? r.fk_student_id)))
      const candidates = (Array.isArray(allExamStudents) ? allExamStudents : [])
        .filter((r) => !assignedStudentIds.has(num(r.fk_student_id)))
        .map((r) => ({ ...r, checked: false, isSelected: false }))

      setAssignedRows(assigned)
      setCandidateRows(candidates)
      setCandidateSource(candidates)
      setSelectedStudents([])
      setSelectAll(false)
      setShowSections(true)
    } catch (e) {
      toastError(e, 'Failed to get students')
      setShowSections(false)
      setAssignedRows([])
      setCandidateRows([])
      setSelectedStudents([])
    } finally {
      setLoadingList(false)
    }
  }

  function onSearchOmr(value: string) {
    setSearchCandidates(value)
    const q = value.trim().toLowerCase()
    if (!q) {
      setCandidateRows(candidateSource)
      return
    }
    setCandidateRows(candidateSource.filter((r) => txt(r.omr_serial_no).toLowerCase().includes(q)))
  }

  async function onAssign() {
    if (!selectedStudents.length) {
      toastError('Please select students.')
      return
    }
    setAssigning(true)
    try {
      const payload = selectedStudents.map((s) => ({
        univExamCentersId: Number(form.univExamcenterId),
        examMasterId: Number(form.examId),
        studentDetailId: num(s.fk_student_id),
        subjectId: Number(form.subjectId),
        isActive: true,
        createdUser: employeeId,
      }))
      await addListUnivEcStudents(payload)
      toastSuccess('Students assigned.')
      await onGetStudents()
    } catch (e) {
      toastError(e, 'Assign failed')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam center students" subtitle="Exam papers delivery process · Exam center students" />

      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="text-[14px] font-semibold leading-tight text-[hsl(var(--card-title))] truncate">
              Exam Center Students
            </h2>
          </div>
          <button type="button" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filterOpen && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
            <div className="space-y-1 md:col-span-2"><Label>Program</Label><Select options={courses.map((r) => ({ value: String(pickCourseId(r)), label: txt(r.course_code) }))} value={form.courseId} onChange={(v) => setForm((f) => ({ ...f, courseId: v }))} disabled={loading} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Academic Year</Label><Select options={academicYears.map((r) => ({ value: String(pickAyId(r)), label: txt(r.academic_year) }))} value={form.academicYearId} onChange={(v) => setForm((f) => ({ ...f, academicYearId: v }))} /></div>
            <div className="space-y-1 md:col-span-4"><Label>Exam</Label><Select options={exams.map((r) => ({ value: String(pickExamId(r)), label: txt(r.exam_name) }))} value={form.examId} onChange={(v) => setForm((f) => ({ ...f, examId: v }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Course Years</Label><Select options={courseYears.map((r) => ({ value: String(pickCourseYearId(r)), label: txt(r.course_year_code) }))} value={form.courseYearId} onChange={(v) => setForm((f) => ({ ...f, courseYearId: v }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Regulation</Label><Select options={regulations.map((r) => ({ value: String(pickRegId(r)), label: txt(r.regulation_code) }))} value={form.regulationId} onChange={(v) => setForm((f) => ({ ...f, regulationId: v }))} /></div>
            <div className="space-y-1 md:col-span-4"><Label>Subjects</Label><Select options={subjects.map((r) => ({ value: String(pickSubjectId(r)), label: `${txt(r.subject_name)} (${txt(r.subject_code)})` }))} value={form.subjectId} onChange={(v) => setForm((f) => ({ ...f, subjectId: v }))} /></div>
            <div className="space-y-1 md:col-span-3"><Label>Exam Center</Label><Select options={centerOptions} value={form.univExamcenterId} onChange={(v) => setForm((f) => ({ ...f, univExamcenterId: v }))} /></div>
            <div className="space-y-1 md:col-span-3"><Label>Exam Center college</Label><Select options={collegeOptions} value={form.collegeId} onChange={(v) => setForm((f) => ({ ...f, collegeId: v }))} /></div>
            <div className="md:col-span-2"><Button type="button" onClick={() => void onGetStudents()} disabled={loadingList} className="w-full">Get Students</Button></div>
          </div>
        )}
      </div>

      {showSections && (
        <>
          <div className="app-card p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 border rounded-md p-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <SearchInput value={searchCandidates} onChange={onSearchOmr} placeholder="Search…" className="w-full max-w-sm" />
                  <span className="text-[13px] text-blue-700 font-semibold whitespace-nowrap">Selected: {selectedStudents.length}</span>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-[70px]">
                          <label className="flex items-center gap-2">
                            <Checkbox checked={selectAll} onCheckedChange={(v) => toggleSelectAll(v === true)} />
                            All
                          </label>
                        </th>
                        <th className="text-left py-1">Serial No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((c, idx) => (
                        <tr key={`${num(c.fk_student_id)}-${idx}`} className="border-b">
                          <td className="py-1">
                            <Checkbox checked={Boolean(c.checked)} onCheckedChange={(v) => toggleCandidate(idx, v === true)} />
                          </td>
                          <td className="py-1">{txt(c.hallticket_number)} ({txt(c.omr_serial_no)})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-5 border rounded-md p-2">
                <h4 className="text-[13px] text-blue-700 font-semibold mb-2">Selected Students: {selectedStudents.length}</h4>
                <div className="max-h-[320px] overflow-auto">
                  <table className="w-full text-[13px]">
                    <tbody>
                      {selectedStudents.map((s, idx) => (
                        <tr key={`${num(s.fk_student_id)}-s-${idx}`} className="border-b">
                          <td className="py-1 text-blue-700">{txt(s.hallticket_number)} ({txt(s.omr_serial_no) || '-'})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-2 flex items-end justify-center">
                <Button onClick={() => void onAssign()} disabled={assigning || !selectedStudents.length}>Assign</Button>
              </div>
            </div>
          </div>

          <div className="app-card overflow-hidden">
            <div className="p-2">
              <DataTable
                rowData={assignedRows}
                columnDefs={assignedColumnDefs}
                loading={loadingList}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search…',
                  pdfDocumentTitle: 'Examcenter Students — Assigned',
                }}
              />
            </div>
          </div>
        </>
      )}
    </PageContainer>
  )
}

