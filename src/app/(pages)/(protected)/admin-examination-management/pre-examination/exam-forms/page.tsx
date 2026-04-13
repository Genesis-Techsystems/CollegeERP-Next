'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>

const REG_ID_KEYS = ['fk_regulation_id', 'regulationId', 'fk_regulationId', 'regulation_id']
const SUBJECT_ID_KEYS = ['fk_subject_id', 'subjectId', 'fk_subjectId', 'subject_id']

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

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

export default function ExamFormsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regRows, setRegRows] = useState<AnyRow[]>([])
  const [subRows, setSubRows] = useState<AnyRow[]>([])
  const [students, setStudents] = useState<AnyRow[]>([])
  const [selectedData, setSelectedData] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [selectedBackendRegulationId, setSelectedBackendRegulationId] = useState(0)

  const courses = useMemo(
    () =>
      dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])).filter(
        (r) => pickNum(r, ['fk_course_id', 'courseId']) > 0,
      ),
    [baseRows],
  )
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
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) => pickNum(r, ['fk_college_id', 'collegeId'])).filter(
        (r) => pickNum(r, ['fk_college_id', 'collegeId']) > 0,
      ),
    [restRows],
  )
  const groups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId']),
      ),
    [restRows, collegeId],
  )
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId']),
      ),
    [restRows, collegeId, courseGroupId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(regRows, (r) => pickNum(r, REG_ID_KEYS)).filter((r) => pickNum(r, REG_ID_KEYS) > 0),
    [regRows],
  )
  const subjects = useMemo(() => dedupeBy(subRows, (r) => pickNum(r, SUBJECT_ID_KEYS)), [subRows])

  useEffect(() => {
    setIsMounted(true)
    const id = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    setEmployeeId(Number.isFinite(id) ? id : 0)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    void init()
  }, [isMounted, employeeId])

  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
    setSubRows([])
    setSubjectId(null)
    const first = groups[0]
    if (first) setCourseGroupId(pickNum(first, ['fk_course_group_id', 'courseGroupId']))
  }, [collegeId])

  useEffect(() => {
    setCourseYearId(null)
    setSubRows([])
    setSubjectId(null)
    const first = years[0]
    if (first) setCourseYearId(pickNum(first, ['fk_course_year_id', 'courseYearId']))
  }, [courseGroupId])

  useEffect(() => {
    if (!regulations.length) return
    if (!regulationId) {
      const first = regulations[0]
      setRegulationId(pickNum(first, REG_ID_KEYS))
      setSelectedBackendRegulationId(pickNum(first, REG_ID_KEYS))
    }
  }, [regulations, regulationId])

  useEffect(() => {
    if (!regulationId) return
    void loadSubjects(regulationId)
  }, [regulationId])

  async function init() {
    setLoading(true)
    try {
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      setBaseRows(Array.isArray(rows) ? rows : [])
      const c = dedupeBy(rows, (r) => pickNum(r, ['fk_course_id', 'courseId']))[0]
      if (!c) return
      const cid = pickNum(c, ['fk_course_id', 'courseId'])
      setCourseId(cid)
      const ay = dedupeBy(
        rows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === cid),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
      )[0]
      if (!ay) return
      const ayid = pickNum(ay, ['fk_academic_year_id', 'academicYearId'])
      setAcademicYearId(ayid)
      const ex = dedupeBy(
        rows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId']) === cid &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId']) === ayid,
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId']),
      )[0]
      if (!ex) return
      const eid = pickNum(ex, ['fk_exam_id', 'examId'])
      setExamId(eid)
      await onExamChange(eid, cid, ayid)
    } finally {
      setLoading(false)
    }
  }

  async function onExamChange(eid: number, cidArg?: number, ayArg?: number) {
    const cid = Number(cidArg ?? courseId ?? 0)
    const ayid = Number(ayArg ?? academicYearId ?? 0)
    if (!cid || !ayid) return
    const bundle = await getUnivExamRestNoTtBundle({
      courseId: cid,
      examId: eid,
      academicYearId: ayid,
      employeeId,
    }).catch(() => ({ restFilters: [], regulations: [] }))
    const rest = Array.isArray(bundle.restFilters) ? bundle.restFilters : []
    const regs = Array.isArray(bundle.regulations) ? bundle.regulations : []
    setRestRows(rest)
    setRegRows(dedupeBy([...regs, ...rest], (r) => pickNum(r, REG_ID_KEYS)))
    const clg = dedupeBy(rest, (r) => pickNum(r, ['fk_college_id', 'collegeId'])).find(
      (r) => pickNum(r, ['fk_college_id', 'collegeId']) > 0,
    )
    if (clg) setCollegeId(pickNum(clg, ['fk_college_id', 'collegeId']))
  }

  async function loadSubjects(targetRegId?: number | null) {
    if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId) return
    const backendReg = Number(targetRegId ?? selectedBackendRegulationId ?? regulationId ?? 0)
    const rows = await getUnivExamSubjectUc({
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      examId,
      academicYearId,
      regulationId: backendReg,
      employeeId,
    }).catch(() => [])
    const list = Array.isArray(rows) ? rows : []
    setSubRows(list)
    if (list[0]) setSubjectId(pickNum(list[0], SUBJECT_ID_KEYS))
  }

  async function getList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId) return
    setLoading(true)
    try {
      const course = courses.find((x) => pickNum(x, ['fk_course_id', 'courseId']) === Number(courseId))
      const ay = academicYears.find((x) => pickNum(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId))
      const col = colleges.find((x) => pickNum(x, ['fk_college_id', 'collegeId']) === Number(collegeId))
      const grp = groups.find((x) => pickNum(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId))
      const yr = years.find((x) => pickNum(x, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId))
      setSelectedData(
        [
          pickText(col, ['college_code', 'collegeCode']),
          pickText(ay, ['academic_year', 'academicYear']),
          pickText(course, ['course_code', 'courseCode']),
          pickText(grp, ['group_code', 'groupCode']),
          pickText(yr, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']),
        ]
          .filter(Boolean)
          .join(' / '),
      )

      const rows = await getExamOmrStudents({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId: selectedBackendRegulationId || regulationId || 0,
        subjectId,
      }).catch(() => [])
      setStudents(Array.isArray(rows) ? rows : [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Forms" subtitle="Manage exam registration forms" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Forms</h2>
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
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label>Course</Label>
              <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c, i) => (
                    <SelectItem key={`c-${i}`} value={String(pickNum(c, ['fk_course_id', 'courseId']))}>
                      {pickText(c, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year</Label>
              <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((a, i) => (
                    <SelectItem key={`ay-${i}`} value={String(pickNum(a, ['fk_academic_year_id', 'academicYearId']))}>
                      {pickText(a, ['academic_year', 'academicYear']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 space-y-1">
              <Label>Exam Master</Label>
              <Select
                value={examId ? String(examId) : undefined}
                onValueChange={(v) => {
                  const eid = Number(v)
                  setExamId(eid)
                  void onExamChange(eid, courseId ?? undefined, academicYearId ?? undefined)
                }}
              >
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Master" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e, i) => (
                    <SelectItem key={`e-${i}`} value={String(pickNum(e, ['fk_exam_id', 'examId']))}>
                      {pickText(e, ['exam_name', 'examName']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>College</Label>
              <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c, i) => (
                    <SelectItem key={`cl-${i}`} value={String(pickNum(c, ['fk_college_id', 'collegeId']))}>
                      {pickText(c, ['college_code', 'collegeCode', 'college_name', 'collegeName']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Course Group</Label>
              <Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g, i) => (
                    <SelectItem key={`g-${i}`} value={String(pickNum(g, ['fk_course_group_id', 'courseGroupId']))}>
                      {pickText(g, ['group_code', 'groupCode']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Course Years</Label>
              <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
                <SelectContent>
                  {years.map((y, i) => (
                    <SelectItem key={`y-${i}`} value={String(pickNum(y, ['fk_course_year_id', 'courseYearId']))}>
                      {pickText(y, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>Regulation</Label>
              <Select
                value={regulationId ? String(regulationId) : undefined}
                onValueChange={(v) => {
                  const id = Number(v)
                  setRegulationId(id)
                  setSelectedBackendRegulationId(id)
                  setSubjectId(null)
                }}
              >
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger>
                <SelectContent>
                  {regulations.map((r, i) => (
                    <SelectItem key={`r-${i}`} value={String(pickNum(r, REG_ID_KEYS))}>
                      {pickText(r, ['regulation_code', 'regulationCode', 'regulation_name', 'regulationName']) || '-'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-1">
              <Label>Subject</Label>
              <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s, i) => (
                    <SelectItem key={`s-${i}`} value={String(pickNum(s, SUBJECT_ID_KEYS))}>
                      {(pickText(s, ['subject_name', 'subjectName']) || '-') + ' (' + (pickText(s, ['subject_code', 'subjectCode']) || '-') + ')'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Button type="button" onClick={getList} disabled={loading} className="h-8 px-3 text-[12px] w-full">
                Get List
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>

      {selectedData && (
        <div className="app-card px-4 py-3">
          <strong className="text-[14px] text-[hsl(var(--primary))]">{selectedData}</strong>
        </div>
      )}

      {students.length > 0 && (
        <div className="app-card p-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-8 text-[12px]" onClick={() => alert('Print Form-A ready for wiring')}>
              Print Form-A
            </Button>
            <Button type="button" className="h-8 text-[12px]" onClick={() => alert('Print D-Form ready for wiring')}>
              Print D-Form
            </Button>
            <Button type="button" className="h-8 text-[12px]" onClick={() => alert('Print Form ready for wiring')}>
              Print Form
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
