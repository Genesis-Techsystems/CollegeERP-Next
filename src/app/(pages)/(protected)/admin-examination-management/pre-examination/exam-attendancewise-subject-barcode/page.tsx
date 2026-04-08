'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from '@/services/pre-examination'

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

export default function ExamAttendancewiseSubjectBarcodePage() {
  const [employeeId, setEmployeeId] = useState(0)
  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regRows, setRegRows] = useState<AnyRow[]>([])
  const [subRows, setSubRows] = useState<AnyRow[]>([])
  const [rows, setRows] = useState<AnyRow[]>([])
  const [selectedData, setSelectedData] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])).filter((r) => pickNum(r, ['fk_course_id', 'courseId']) > 0),
    [baseRows],
  )
  const academicYears = useMemo(
    () => dedupeBy(baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)), (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId'])),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () => dedupeBy(baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) && pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId)), (r) => pickNum(r, ['fk_exam_id', 'examId'])),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => pickNum(r, ['fk_college_id', 'collegeId'])).filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) > 0),
    [restRows],
  )
  const groups = useMemo(
    () => dedupeBy(restRows.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId)), (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId'])),
    [restRows, collegeId],
  )
  const years = useMemo(
    () => dedupeBy(restRows.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) && pickNum(r, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId)), (r) => pickNum(r, ['fk_course_year_id', 'courseYearId'])),
    [restRows, collegeId, courseGroupId],
  )
  const regulations = useMemo(
    () => dedupeBy(regRows, (r) => pickNum(r, REG_ID_KEYS)).filter((r) => pickNum(r, REG_ID_KEYS) > 0),
    [regRows],
  )
  const subjects = useMemo(() => dedupeBy(subRows, (r) => pickNum(r, SUBJECT_ID_KEYS)), [subRows])

  useEffect(() => {
    const id = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
    setEmployeeId(Number.isFinite(id) ? id : 0)
  }, [])

  useEffect(() => {
    // Run init regardless of employeeId to avoid empty filters on first load
    void init()
  }, [employeeId])

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
      const ay = dedupeBy(rows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === cid), (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']))[0]
      if (!ay) return
      const ayid = pickNum(ay, ['fk_academic_year_id', 'academicYearId'])
      setAcademicYearId(ayid)
      const ex = dedupeBy(rows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === cid && pickNum(r, ['fk_academic_year_id', 'academicYearId']) === ayid), (r) => pickNum(r, ['fk_exam_id', 'examId']))[0]
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
    const dedupRegs = dedupeBy([...regs, ...rest], (r) => pickNum(r, REG_ID_KEYS)).filter((r) => pickNum(r, REG_ID_KEYS) > 0)
    setRegRows(dedupRegs)
    const nextRegId = dedupRegs[0] ? pickNum(dedupRegs[0], REG_ID_KEYS) : 0
    if (nextRegId) setRegulationId(nextRegId)

    // Auto-select College -> Group -> Year from REST filters
    const clg = dedupeBy(rest, (r) => pickNum(r, ['fk_college_id', 'collegeId'])).find((r) => pickNum(r, ['fk_college_id', 'collegeId']) > 0)
    const nextCollegeId = clg ? pickNum(clg, ['fk_college_id', 'collegeId']) : 0
    if (nextCollegeId) setCollegeId(nextCollegeId)

    const groupsForCollege = dedupeBy(
      rest.filter((r) => pickNum(r, ['fk_college_id', 'collegeId']) === nextCollegeId),
      (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId']),
    )
    const firstGroup = groupsForCollege.find((g) => pickNum(g, ['fk_course_group_id', 'courseGroupId']) > 0)
    const nextGroupId = firstGroup ? pickNum(firstGroup, ['fk_course_group_id', 'courseGroupId']) : 0
    if (nextGroupId) setCourseGroupId(nextGroupId)

    const yearsForGroup = dedupeBy(
      rest.filter(
        (r) =>
          pickNum(r, ['fk_college_id', 'collegeId']) === nextCollegeId &&
          pickNum(r, ['fk_course_group_id', 'courseGroupId']) === nextGroupId,
      ),
      (r) => pickNum(r, ['fk_course_year_id', 'courseYearId']),
    )
    const firstYear = yearsForGroup.find((y) => pickNum(y, ['fk_course_year_id', 'courseYearId']) > 0)
    const nextYearId = firstYear ? pickNum(firstYear, ['fk_course_year_id', 'courseYearId']) : 0
    if (nextYearId) setCourseYearId(nextYearId)

    // Load subjects immediately when all context is available
    if (nextCollegeId && cid && nextGroupId && nextYearId && eid && ayid && nextRegId) {
      await loadSubjects(nextRegId, nextCollegeId, cid, nextGroupId, nextYearId, eid, ayid)
    }
  }

  async function loadSubjects(
    regId?: number | null,
    collegeArg?: number,
    courseArg?: number,
    groupArg?: number,
    yearArg?: number,
    examArg?: number,
    ayArg?: number,
  ) {
    const clgId = Number(collegeArg ?? collegeId ?? 0)
    const crsId = Number(courseArg ?? courseId ?? 0)
    const grpId = Number(groupArg ?? courseGroupId ?? 0)
    const yrId = Number(yearArg ?? courseYearId ?? 0)
    const exId = Number(examArg ?? examId ?? 0)
    const ayId = Number(ayArg ?? academicYearId ?? 0)
    if (!clgId || !crsId || !grpId || !yrId || !exId || !ayId) return
    const rows = await getUnivExamSubjectUc({
      collegeId: clgId,
      courseId: crsId,
      courseGroupId: grpId,
      courseYearId: yrId,
      examId: exId,
      academicYearId: ayId,
      regulationId: Number(regId ?? regulationId ?? 0),
      employeeId,
    }).catch(() => [])
    const list = Array.isArray(rows) ? rows : []
    setSubRows(list)
    if (list[0]) setSubjectId(pickNum(list[0], SUBJECT_ID_KEYS))
  }

  async function onGetList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId) return
    setLoading(true)
    try {
      const course = courses.find((x) => pickNum(x, ['fk_course_id', 'courseId']) === Number(courseId))
      const ay = academicYears.find((x) => pickNum(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId))
      const col = colleges.find((x) => pickNum(x, ['fk_college_id', 'collegeId']) === Number(collegeId))
      const grp = groups.find((x) => pickNum(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId))
      const yr = years.find((x) => pickNum(x, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId))
      setSelectedData([
        pickText(col, ['college_code', 'collegeCode']),
        pickText(ay, ['academic_year', 'academicYear']),
        pickText(course, ['course_code', 'courseCode']),
        pickText(grp, ['group_code', 'groupCode']),
        pickText(yr, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']),
      ].filter(Boolean).join(' / '))

      const list = await getExamOmrStudents({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId: 0,
        subjectId,
      }).catch(() => [])
      // Attendance-wise page keeps only present students
      const present = (Array.isArray(list) ? list : []).filter((r) => Boolean(r.is_present ?? r.isPresent))
      setRows(present)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-3">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Attendance-wise Course Barcode</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label>Course</Label>
              <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>{courses.map((c, i) => <SelectItem key={`c-${i}`} value={String(pickNum(c, ['fk_course_id', 'courseId']))}>{pickText(c, ['course_code', 'courseCode']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year</Label>
              <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Year" /></SelectTrigger>
                <SelectContent>{academicYears.map((a, i) => <SelectItem key={`ay-${i}`} value={String(pickNum(a, ['fk_academic_year_id', 'academicYearId']))}>{pickText(a, ['academic_year', 'academicYear']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Exam Master</Label>
              <Select value={examId ? String(examId) : undefined} onValueChange={(v) => { const eid = Number(v); setExamId(eid); void onExamChange(eid, courseId ?? undefined, academicYearId ?? undefined) }}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Master" /></SelectTrigger>
                <SelectContent>{exams.map((e, i) => <SelectItem key={`e-${i}`} value={String(pickNum(e, ['fk_exam_id', 'examId']))}>{pickText(e, ['exam_name', 'examName']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>College</Label>
              <Select value={collegeId ? String(collegeId) : undefined} onValueChange={(v) => setCollegeId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="College" /></SelectTrigger>
                <SelectContent>{colleges.map((c, i) => <SelectItem key={`cl-${i}`} value={String(pickNum(c, ['fk_college_id', 'collegeId']))}>{pickText(c, ['college_code', 'collegeCode']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Course Group</Label>
              <Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Group" /></SelectTrigger>
                <SelectContent>{groups.map((g, i) => <SelectItem key={`g-${i}`} value={String(pickNum(g, ['fk_course_group_id', 'courseGroupId']))}>{pickText(g, ['group_code', 'groupCode']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Course Years</Label>
              <Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger>
                <SelectContent>{years.map((y, i) => <SelectItem key={`y-${i}`} value={String(pickNum(y, ['fk_course_year_id', 'courseYearId']))}>{pickText(y, ['course_year_code', 'courseYearCode']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Regulation</Label>
              <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger>
                <SelectContent>{regulations.map((r, i) => <SelectItem key={`r-${i}`} value={String(pickNum(r, REG_ID_KEYS))}>{pickText(r, ['regulation_code', 'regulationCode']) || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Subject</Label>
              <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
                <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s, i) => <SelectItem key={`s-${i}`} value={String(pickNum(s, SUBJECT_ID_KEYS))}>{(pickText(s, ['subject_name', 'subjectName']) || '-') + ' (' + (pickText(s, ['subject_code', 'subjectCode']) || '-') + ')'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="button" onClick={onGetList} disabled={loading} className="h-8 px-3 text-[12px] w-full">Get List</Button>
            </div>
          </div>
        </div>
      </div>

      {selectedData && (
        <div className="app-card px-4 py-3">
          <strong className="text-[14px] text-[hsl(var(--primary))]">{selectedData}</strong>
        </div>
      )}

      {rows.length > 0 && (
        <div className="app-card p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-8 text-[12px]" onClick={() => alert('Print Stickers')}>
              Print Stickers
            </Button>
            <Button type="button" className="h-8 text-[12px]" onClick={() => alert('Print Stickers With Barcode No')}>
              Print Stickers With Barcode No
            </Button>
            <Button type="button" className="h-8 text-[12px]" onClick={() => alert('Print Stickers Without USN')}>
              Print Stickers Without USN
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
