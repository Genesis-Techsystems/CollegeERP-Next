'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef } from 'ag-grid-community'
import { SearchInput } from '@/common/components/search'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, Filter } from 'lucide-react'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getAssignSubjectsEvaluatorRegulationSubjects,
  getAssignSubjectsEvaluatorRoles,
  getEvaluationExamFilters,
  saveAssignSubjectsEvaluator,
} from '@/services/evaluation-process'

type AnyRow = Record<string, any>

const MOCK_EVALUATORS = ['Dr. K SHYAM SUNDER REDDY', 'Dr. A KUMAR', 'Prof. S LAKSHMI']

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
const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function statusRenderer(p: { value?: boolean }) {
  return <span>{p.value ? 'Active' : 'Inactive'}</span>
}

function makeSelectRenderer(toggleOne: (index: number, checked: boolean) => void) {
  return (p: { data?: AnyRow; node?: { rowIndex?: number } }) => (
    <input
      type="checkbox"
      checked={Boolean(p.data?.selected)}
      onChange={(e) => toggleOne(p.node?.rowIndex ?? 0, e.target.checked)}
    />
  )
}

export default function AssignSubjectsEvaluatorPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [filterOpen, setFilterOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [search, setSearch] = useState('')

  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [regulationSubjectRows, setRegulationSubjectRows] = useState<AnyRow[]>([])
  const [roleRows, setRoleRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [roleId, setRoleId] = useState<number | null>(null)
  const [isReEvaluation, setIsReEvaluation] = useState(false)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)

  const courses = useMemo(
    () => dedupeBy(filterRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])),
    [filterRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filterRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      ),
    [filterRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filterRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      ),
    [filterRows, courseId, academicYearId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        regulationSubjectRows,
        (r) => pickNum(r, ['fk_regulation_id', 'regulationId']),
      ),
    [regulationSubjectRows],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        regulationSubjectRows.filter(
          (r) => pickNum(r, ['fk_regulation_id', 'regulationId']) === Number(regulationId),
        ),
        (r) => pickNum(r, ['fk_subject_id', 'subjectId']),
      ),
    [regulationSubjectRows, regulationId],
  )

  const showExtraFilters = roleId === 96 || roleId === 97
  const colleges = useMemo(
    () =>
      dedupeBy(
        regulationSubjectRows.filter(
          (r) => pickNum(r, ['fk_regulation_id', 'regulationId']) === Number(regulationId),
        ),
        (r) => pickNum(r, ['fk_college_id', 'collegeId']),
      ),
    [regulationSubjectRows, regulationId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        regulationSubjectRows.filter(
          (r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId),
        ),
        (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId']),
      ),
    [regulationSubjectRows, collegeId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        regulationSubjectRows.filter(
          (r) =>
            pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId']),
      ),
    [regulationSubjectRows, collegeId, courseGroupId],
  )

  const allSelected = rows.length > 0 && rows.every((r) => Boolean(r.selected))

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [filters, roles] = await Promise.all([
          getEvaluationExamFilters(employeeId).catch(() => []),
          getAssignSubjectsEvaluatorRoles().catch(() => []),
        ])
        const f = Array.isArray(filters) ? filters : []
        setFilterRows(f)
        setRoleRows(Array.isArray(roles) ? roles : [])
        if (f[0]) setCourseId(pickNum(f[0], ['fk_course_id', 'courseId']))
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
    async function loadRegSub() {
      if (!courseId || !academicYearId || !examId) return
      const list = await getAssignSubjectsEvaluatorRegulationSubjects({
        courseId,
        academicYearId,
        examId,
        employeeId,
      }).catch(() => [])
      const r = Array.isArray(list) ? list : []
      setRegulationSubjectRows(r)
      if (r[0]) setRegulationId(pickNum(r[0], ['fk_regulation_id', 'regulationId']))
    }
    void loadRegSub()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (subjects[0]) setSubjectId(pickNum(subjects[0], ['fk_subject_id', 'subjectId']))
  }, [subjects])

  useEffect(() => {
    if (roleRows[0] && !roleId) setRoleId(pickNum(roleRows[0], ['pk_role_id', 'roleId']))
  }, [roleRows, roleId])

  useEffect(() => {
    setRows([])
    setHasFetched(false)
  }, [courseId, academicYearId, examId, regulationId, subjectId, roleId, collegeId, courseGroupId, courseYearId, isReEvaluation])

  function buildRows(): AnyRow[] {
    const subject = subjects.find((s) => pickNum(s, ['fk_subject_id', 'subjectId']) === Number(subjectId))
    const course = courses.find((c) => pickNum(c, ['fk_course_id', 'courseId']) === Number(courseId))
    const exam = exams.find((e) => pickNum(e, ['fk_exam_id', 'examId']) === Number(examId))
    const role = roleRows.find((r) => pickNum(r, ['pk_role_id', 'roleId']) === Number(roleId))

    return MOCK_EVALUATORS.map((name, i) => ({
      evaluatorName: name,
      courseId: courseId ?? 0,
      courseName: pickText(course, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-',
      examId: examId ?? 0,
      examName: pickText(exam, ['exam_name', 'examName']) || '-',
      regulationId: regulationId ?? 0,
      profileId: roleId ?? 0,
      profileName: pickText(role, ['role_name', 'roleName']) || '-',
      subjectId: subjectId ?? 0,
      subjectName: pickText(subject, ['subject_name', 'subjectName']) || '-',
      examEvaluatorId: 9001 + i,
      examEvaluatorProfileDetId: 3001 + i,
      selected: i === 1,
      isActive: i === 1,
      isReEvaluation,
      collegeCode: pickText(
        colleges.find((c) => pickNum(c, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['college_code', 'collegeCode'],
      ),
      courseGroup: pickText(
        courseGroups.find((g) => pickNum(g, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)),
        ['group_code', 'groupCode'],
      ),
      courseYear: pickText(
        courseYears.find((y) => pickNum(y, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId)),
        ['course_year_code', 'courseYearCode'],
      ),
    }))
  }

  function onGetList() {
    if (!courseId || !academicYearId || !examId || !regulationId || !subjectId || !roleId) {
      toastError('Please select required filters.')
      return
    }
    setRows(buildRows())
    setHasFetched(true)
  }

  function toggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked, isActive: checked })))
  }

  function toggleOne(index: number, checked: boolean) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: checked, isActive: checked } : r)))
  }

  async function onSave() {
    if (rows.length === 0) return
    const payload = rows.map((row) => ({
      courseId: row.courseId,
      examId: row.examId,
      regulationId: row.regulationId,
      profileId: row.profileId,
      subjectId: row.subjectId,
      examEvaluatorId: row.examEvaluatorId,
      examEvaluatorProfileDetId: row.examEvaluatorProfileDetId,
      isReEvaluation: Boolean(row.isReEvaluation),
      isActive: Boolean(row.selected),
    }))
    setLoading(true)
    try {
      await saveAssignSubjectsEvaluator(payload)
      toastSuccess('Saved successfully.')
    } catch (error: any) {
      toastError(error?.message ?? 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(term)))
  }, [rows, search])

  const cols = useMemo<ColDef[]>(
    () => [
      {
        headerName: '',
        width: 60,
        cellRenderer: makeSelectRenderer(toggleOne),
      },
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 80 },
      { field: 'evaluatorName', headerName: 'Evaluator Name', minWidth: 220 },
      { field: 'courseName', headerName: 'Course', minWidth: 120 },
      { field: 'examName', headerName: 'Exam', minWidth: 240 },
      { field: 'profileName', headerName: 'Profile', minWidth: 160 },
      { field: 'subjectName', headerName: 'Subject', minWidth: 240 },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
    ],
    [],
  )

  return (
    <div className="px-6 pb-6 pt-2 space-y-2">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Assign Subjects Evaluator</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>
        {filterOpen && (
          <div className="p-3 space-y-2 text-[13px]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Course</Label>
                <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={`c-${pickNum(c, ['fk_course_id'])}`} value={String(pickNum(c, ['fk_course_id']))}>{pickText(c, ['course_code', 'course_name'])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Academic Year</Label>
                <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                  <SelectContent>{academicYears.map((a) => <SelectItem key={`ay-${pickNum(a, ['fk_academic_year_id'])}`} value={String(pickNum(a, ['fk_academic_year_id']))}>{pickText(a, ['academic_year'])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4">
                <Label className="text-[12px] text-muted-foreground">Exam</Label>
                <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={`e-${pickNum(e, ['fk_exam_id'])}`} value={String(pickNum(e, ['fk_exam_id']))}>{pickText(e, ['exam_name'])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Regulation</Label>
                <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger>
                  <SelectContent>{regulations.map((r) => <SelectItem key={`r-${pickNum(r, ['fk_regulation_id'])}`} value={String(pickNum(r, ['fk_regulation_id']))}>{pickText(r, ['regulation_code'])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4">
                <Label className="text-[12px] text-muted-foreground">Subjects</Label>
                <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={`s-${pickNum(s, ['fk_subject_id'])}`} value={String(pickNum(s, ['fk_subject_id']))}>{pickText(s, ['subject_name'])} ({pickText(s, ['subject_code'])})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Select Role</Label>
                <Select value={roleId ? String(roleId) : undefined} onValueChange={(v) => setRoleId(Number(v))}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Role" /></SelectTrigger>
                  <SelectContent>{roleRows.map((r) => <SelectItem key={`role-${pickNum(r, ['pk_role_id'])}`} value={String(pickNum(r, ['pk_role_id']))}>{pickText(r, ['role_name'])}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Checkbox checked={isReEvaluation} onCheckedChange={(v) => setIsReEvaluation(v === true)} />
                <span className="text-[12px]">Is Re-Evaluation</span>
              </div>
              <div className="md:col-span-1">
                <Button className="h-8 px-3 text-[12px] w-full" onClick={onGetList} disabled={loading}>Get List</Button>
              </div>
            </div>

            {showExtraFilters && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                <div className="md:col-span-3">
                  <Label className="text-[12px] text-muted-foreground">College</Label>
                  <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
                    <SelectContent>{colleges.map((c) => <SelectItem key={`cl-${pickNum(c, ['fk_college_id'])}`} value={String(pickNum(c, ['fk_college_id']))}>{pickText(c, ['college_code'])}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label className="text-[12px] text-muted-foreground">Course Group</Label>
                  <Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger>
                    <SelectContent>{courseGroups.map((g) => <SelectItem key={`cg-${pickNum(g, ['fk_course_group_id'])}`} value={String(pickNum(g, ['fk_course_group_id']))}>{pickText(g, ['group_code'])}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label className="text-[12px] text-muted-foreground">Course Year</Label>
                  <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
                    <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
                    <SelectContent>{courseYears.map((y) => <SelectItem key={`cy-${pickNum(y, ['fk_course_year_id'])}`} value={String(pickNum(y, ['fk_course_year_id']))}>{pickText(y, ['course_year_code'])}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="w-full max-w-sm">
                <SearchInput className="w-full" placeholder="Search" value={search} onChange={setSearch} />
              </div>
              <label className="inline-flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
                <span>All</span>
              </label>
            </div>
          </div>
          <div className="p-4">
            <DataTable rowData={filteredRows} columnDefs={cols} pagination loading={loading} />
          </div>
          <div className="px-4 pb-4 flex justify-end">
            <Button onClick={() => void onSave()} disabled={loading || rows.length === 0}>Save</Button>
          </div>
        </div>
      )}
    </div>
  )
}
