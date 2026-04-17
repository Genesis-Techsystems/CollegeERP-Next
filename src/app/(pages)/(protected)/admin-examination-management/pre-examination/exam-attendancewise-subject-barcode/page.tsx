'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Eye, FileText, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import {
  generateBarcodesForExamStudents,
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'

type AnyRow = Record<string, any>
const REG_ID_KEYS = [
  'fk_regulation_id',
  'regulationId',
  'fk_regulationId',
  'regulation_id',
  'regulationCatId',
  'fk_regulation_cat_id',
  'regulation.regulationId',
  'Regulation.regulationId',
]
const REG_TEXT_KEYS = [
  'regulation_code',
  'regulationCode',
  'regulation_name',
  'regulationName',
  'regulation',
  'regulation.regulationCode',
  'Regulation.regulationCode',
  'regulation.regulationName',
  'Regulation.regulationName',
  'regulationCodeDisplayName',
  'regulation_display_name',
  'regulationdisplayname',
  'regulationcode',
]
const SUBJECT_ID_KEYS = ['fk_subject_id', 'subjectId', 'fk_subjectId', 'subject_id']

const getByPath = (obj: AnyRow | null | undefined, path: string): any => {
  if (!obj) return undefined
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path]
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined
    cur = cur[p]
  }
  return cur
}

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const key of keys) {
    const v = Number(getByPath(row, key))
    if (v > 0) return v
  }
  return 0
}

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const key of keys) {
    const v = getByPath(row, key)
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

const regSyntheticId = (row: AnyRow | null | undefined) => {
  const txt = pickText(row, REG_TEXT_KEYS).trim().toLowerCase()
  if (!txt) return 0
  let h = 0
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) >>> 0
  return h > 0 ? h : 0
}
const pickRegValue = (row: AnyRow | null | undefined) => {
  const id = pickNum(row, REG_ID_KEYS)
  if (id > 0) return id
  return regSyntheticId(row)
}
const pickBackendRegId = (row: AnyRow | null | undefined) => pickNum(row, REG_ID_KEYS)

const dedupeBy = <T,>(rows: T[], keyFn: (r: T) => string | number) => {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function barcodeImgSrc(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === '-') return null
  if (s.startsWith('data:')) return s
  return `data:image/jpeg;base64,${s}`
}

export default function ExamAttendancewiseSubjectBarcodePage() {
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [hasFetched, setHasFetched] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [selectedBackendRegulationId, setSelectedBackendRegulationId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [employeeId, setEmployeeId] = useState(0)

  const courses = useMemo(
    () =>
      dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId'])).filter(
        (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) > 0,
      ),
    [baseRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === Number(courseId),
        ),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']),
      ),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === Number(courseId) &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) === Number(academicYearId),
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId', 'fk_examId']),
      ),
    [baseRows, courseId, academicYearId],
  )
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) => pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId'])).filter(
        (r) => pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']) > 0,
      ),
    [restRows],
  )
  const groups = useMemo(
    () =>
      dedupeBy(
        restRows.filter((r) => pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']) === Number(collegeId)),
        (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']),
      ),
    [restRows, collegeId],
  )
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']) === Number(collegeId) &&
            pickNum(r, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']) === Number(courseGroupId),
        ),
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']),
      ),
    [restRows, collegeId, courseGroupId],
  )
  const regulations = useMemo(() => {
    const fromRest = restRows.filter((r) => {
      const regId = pickRegValue(r)
      if (!regId) return false
      if (collegeId && pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']) !== Number(collegeId)) return false
      if (courseGroupId && pickNum(r, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']) !== Number(courseGroupId)) return false
      if (courseYearId && pickNum(r, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']) !== Number(courseYearId)) return false
      return true
    })
    const fromBase = baseRows.filter((r) => {
      const regId = pickRegValue(r)
      if (!regId) return false
      if (courseId && pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) !== Number(courseId)) return false
      if (academicYearId && pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) !== Number(academicYearId)) return false
      if (examId && pickNum(r, ['fk_exam_id', 'examId', 'fk_examId']) !== Number(examId)) return false
      return true
    })
    return dedupeBy(
      [...fromRest, ...regulationRows, ...fromBase],
      (r) => pickRegValue(r),
    ).filter((r) => pickRegValue(r) > 0)
  }, [restRows, regulationRows, baseRows, collegeId, courseGroupId, courseYearId, courseId, academicYearId, examId])
  const regulationBackendIdMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const r of regulations) {
      map.set(pickRegValue(r), pickBackendRegId(r))
    }
    return map
  }, [regulations])
  const subjects = useMemo(() => {
    const hasRegInRows = subjectRows.some((r) => pickRegValue(r) > 0)
    const scoped =
      regulationId && Number(regulationId) > 0 && hasRegInRows
        ? subjectRows.filter((r) => pickRegValue(r) === Number(regulationId))
        : subjectRows
    return dedupeBy(scoped, (r) => pickNum(r, SUBJECT_ID_KEYS))
  }, [subjectRows, regulationId])
  const tableSummaryText = useMemo(() => {
    const college = colleges.find((c) => pickNum(c, ['fk_college_id', 'collegeId', 'fk_collegeId']) === Number(collegeId))
    const ay = academicYears.find((a) => pickNum(a, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) === Number(academicYearId))
    const course = courses.find((c) => pickNum(c, ['fk_course_id', 'courseId', 'fk_courseId']) === Number(courseId))
    const group = groups.find((g) => pickNum(g, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']) === Number(courseGroupId))
    const year = years.find((y) => pickNum(y, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']) === Number(courseYearId))
    const subject = subjects.find((s) => pickNum(s, SUBJECT_ID_KEYS) === Number(subjectId))
    return [
      pickText(college, ['college_code', 'collegeCode', 'college_name', 'collegeName']) || '-',
      pickText(ay, ['academic_year', 'academicYear']) || '-',
      pickText(course, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-',
      pickText(group, ['group_code', 'groupCode']) || '-',
      pickText(year, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']) || '-',
      pickText(subject, ['subject_name', 'subjectName']) || '-',
    ].join(' / ')
  }, [colleges, academicYears, courses, groups, years, subjects, collegeId, academicYearId, courseId, courseGroupId, courseYearId, subjectId])

  async function init() {
    setLoading(true)
    try {
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      setBaseRows(Array.isArray(rows) ? rows : [])
      const c = dedupeBy(rows, (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId'])).find(
        (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) > 0,
      )
      if (!c) return
      const cid = pickNum(c, ['fk_course_id', 'courseId', 'fk_courseId'])
      setCourseId(cid)
      const ay = dedupeBy(
        rows.filter((r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === cid),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']),
      )[0]
      if (!ay) return
      const ayid = pickNum(ay, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId'])
      setAcademicYearId(ayid)
      const ex = dedupeBy(
        rows.filter(
          (r) =>
            pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === cid &&
            pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) === ayid,
        ),
        (r) => pickNum(r, ['fk_exam_id', 'examId', 'fk_examId']),
      )[0]
      if (!ex) return
      const eid = pickNum(ex, ['fk_exam_id', 'examId', 'fk_examId'])
      setExamId(eid)
      await onExamLoad(cid, ayid, eid)
    } finally {
      setLoading(false)
    }
  }

  async function onExamLoad(cid: number, ayid: number, eid: number) {
    const bundle = await getUnivExamRestNoTtBundle({
      courseId: cid,
      examId: eid,
      academicYearId: ayid,
      employeeId,
    }).catch(() => ({ restFilters: [], regulations: [] }))
    const rest = Array.isArray(bundle?.restFilters) ? bundle.restFilters : []
    const regsFromFlag = Array.isArray(bundle?.regulations) ? bundle.regulations : []
    setRestRows(rest)
    const regs = dedupeBy(
      [...regsFromFlag, ...rest].filter((r) => pickRegValue(r) > 0),
      (r) => pickRegValue(r),
    )
    setRegulationRows(regs)
    const firstReg = regs[0]
    if (firstReg) {
      const ui = pickRegValue(firstReg)
      setRegulationId(ui)
      setSelectedBackendRegulationId(pickBackendRegId(firstReg))
    }
    const clg = dedupeBy(rest, (r) => pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId'])).find(
      (r) => pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']) > 0,
    )
    if (clg) setCollegeId(pickNum(clg, ['fk_college_id', 'collegeId', 'fk_collegeId']))
  }

  async function loadSubjects(targetRegulationId?: number | null) {
    if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId) return
    const uiRegId = Number(targetRegulationId ?? regulationId ?? 0)
    const mappedBackendId = regulationBackendIdMap.get(uiRegId) ?? 0
    const selectedReg = regulations.find((r) => pickRegValue(r) === uiRegId)
    const regId = Number(mappedBackendId || pickNum(selectedReg, REG_ID_KEYS) || selectedBackendRegulationId || 0)
    const subRes = await getUnivExamSubjectUc({
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      examId,
      academicYearId,
      regulationId: regId,
      employeeId,
    }).catch(() => [])
    const list = Array.isArray(subRes) ? subRes : []
    setSubjectRows(list)

    const regFromSubject = dedupeBy(list.filter((r) => pickRegValue(r) > 0), (r) => pickRegValue(r))
    if (regFromSubject.length > 0) {
      setRegulationRows(regFromSubject)
      if (!regulationId || !regFromSubject.some((r) => pickRegValue(r) === Number(regulationId))) {
        setRegulationId(pickRegValue(regFromSubject[0]))
      }
    }

    if (list.length > 0) {
      const activeRegId = Number(targetRegulationId ?? regulationId ?? pickRegValue(regFromSubject[0]) ?? 0)
      const firstSubject =
        activeRegId > 0
          ? list.find((r) => pickRegValue(r) === activeRegId)
          : list[0]
      if (firstSubject) {
        setSubjectId(pickNum(firstSubject, SUBJECT_ID_KEYS))
      }
    } else {
      setSubjectId(null)
    }
  }

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
    setSubjectRows([])
    setSubjectId(null)
    const first = groups[0]
    if (first) setCourseGroupId(pickNum(first, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']))
  }, [collegeId])

  useEffect(() => {
    setCourseYearId(null)
    setSubjectRows([])
    setSubjectId(null)
    const first = years[0]
    if (first) setCourseYearId(pickNum(first, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']))
  }, [courseGroupId])

  useEffect(() => {
    if (collegeId && courseId && courseGroupId && courseYearId && examId && academicYearId) {
      void loadSubjects(0)
    }
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId])

  useEffect(() => {
    if (!regulationId) return
    void loadSubjects(regulationId)
  }, [regulationId])

  useEffect(() => {
    if (!regulations.length) {
      setRegulationId(null)
      setSubjectRows([])
      setSubjectId(null)
      return
    }
    const exists = regulations.some(
      (r) => pickRegValue(r) === Number(regulationId),
    )
    if (!exists) {
      const firstUi = pickRegValue(regulations[0])
      setRegulationId(firstUi)
      setSelectedBackendRegulationId(pickBackendRegId(regulations[0]))
      setSubjectRows([])
      setSubjectId(null)
    }
  }, [regulations, regulationId])

  function isPresentRow(r: AnyRow) {
    return Boolean(r.is_present ?? r.isPresent)
  }

  async function getList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId) return
    const selectedRegRow = regulations.find((r) => pickRegValue(r) === Number(regulationId ?? 0)) ?? null
    const backendRegulationId = selectedBackendRegulationId || pickBackendRegId(selectedRegRow)
    setLoading(true)
    setHasFetched(true)
    try {
      const res = await getExamOmrStudents({
        examId,
        collegeId,
        courseGroupId,
        courseYearId,
        regulationId: backendRegulationId > 0 ? backendRegulationId : 0,
        subjectId,
      }).catch(() => [])
      const all = Array.isArray(res) ? res : []
      setRows(all.filter(isPresentRow))
    } finally {
      setLoading(false)
    }
  }

  async function generateBarcode() {
    const ids = rows.map((r) => Number(r.fk_exam_std_det_id ?? 0)).filter((x) => x > 0)
    if (ids.length === 0) return
    await generateBarcodesForExamStudents(ids).catch(() => null)
    await getList()
  }

  function printStickersNotReady(kind: string) {
    toast.info(`${kind} is not available in Next.js yet (legacy print route not migrated).`)
  }

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Exam Attendance-wise Subject Barcode" subtitle="Generate attendance-based subject barcodes" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Exam Attendance-wise Subject Barcode</h2>
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
            <div className="md:col-span-2 space-y-1">
              <Label>Course</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => setCourseId(v ? Number(v) : 0)}
                options={courses.map((c, i) => ({ value: String(pickNum(c, ['fk_course_id', 'courseId', 'fk_courseId']) || i), label: pickText(c, ['course_code', 'courseCode', 'course_name', 'courseName']) || '-' }))}
                placeholder="Course"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Exam Year</Label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => setAcademicYearId(v ? Number(v) : 0)}
                options={academicYears.map((a, i) => ({ value: String(pickNum(a, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']) || i), label: pickText(a, ['academic_year', 'academicYear']) || '-' }))}
                placeholder="Exam Year"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <Label>Exam Master</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={async (v) => {
                  const eid = v ? Number(v) : 0
                  setExamId(eid)
                  if (courseId && academicYearId) await onExamLoad(courseId, academicYearId, eid)
                }}
                options={exams.map((e, i) => ({ value: String(pickNum(e, ['fk_exam_id', 'examId', 'fk_examId']) || i), label: pickText(e, ['exam_name', 'examName']) || '-' }))}
                placeholder="Exam Master"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label>College</Label>
              <Select
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => setCollegeId(v ? Number(v) : 0)}
                options={colleges.map((c, i) => ({ value: String(pickNum(c, ['fk_college_id', 'collegeId', 'fk_collegeId']) || i), label: pickText(c, ['college_code', 'collegeCode', 'college_name', 'collegeName']) || '-' }))}
                placeholder="College"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Course Group</Label>
              <Select
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => setCourseGroupId(v ? Number(v) : 0)}
                options={groups.map((g, i) => ({ value: String(pickNum(g, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']) || i), label: pickText(g, ['group_code', 'groupCode', 'course_group_code', 'courseGroupCode']) || '-' }))}
                placeholder="Group"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Course Year</Label>
              <Select
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => setCourseYearId(v ? Number(v) : 0)}
                options={years.map((y, i) => ({ value: String(pickNum(y, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']) || i), label: pickText(y, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']) || '-' }))}
                placeholder="Course Year"
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Regulation</Label>
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => {
                  const uiRegId = v ? Number(v) : 0
                  setRegulationId(uiRegId)
                  setSelectedBackendRegulationId(regulationBackendIdMap.get(uiRegId) ?? 0)
                  setSubjectId(null)
                }}
                options={regulations.map((r, i) => ({ value: String(pickRegValue(r) || i), label: pickText(r, REG_TEXT_KEYS) || `Regulation ${pickRegValue(r)}` }))}
                placeholder="Regulation"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <Label>Subject</Label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => setSubjectId(v ? Number(v) : 0)}
                options={subjects.map((s, i) => ({ value: String(pickNum(s, SUBJECT_ID_KEYS) || i), label: (pickText(s, ['subject_name', 'subjectName']) || '-') + ' (' + (pickText(s, ['subject_code', 'subjectCode']) || '-') + ')' }))}
                placeholder="Subject"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="button" onClick={getList} disabled={loading} className="h-8 px-3 text-[12px] w-full">Get List</Button>
            </div>
          </div>
        </div>
        )}
      </div>

      {hasFetched && (
        <div className="app-card p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[12px] text-[hsl(var(--primary))] min-w-0 flex-1 overflow-hidden text-ellipsis">
              {tableSummaryText}
            </div>
            <Button type="button" className="h-8 text-[12px] shrink-0" onClick={generateBarcode} disabled={rows.length === 0}>
              Generate Barcode
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => printStickersNotReady('Print stickers')}>
                Print Stickers
              </Button>
              <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => printStickersNotReady('Print stickers with barcode no')}>
                Print Stickers With Barcode No
              </Button>
              <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => printStickersNotReady('Print stickers without USN')}>
                Print Stickers Without USN
              </Button>
            </div>
          )}

          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1 text-left">S.No</th>
                  <th className="px-2 py-1 text-left">Student</th>
                  <th className="px-2 py-1 text-left">Barcode No</th>
                  <th className="px-2 py-1 text-left">Barcode</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-center w-[72px]">OMR</th>
                  <th className="px-2 py-1 text-center w-[72px]">Answer</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const img = barcodeImgSrc(r.omr_barcode)
                  return (
                    <tr key={`r-${i}`} className="border-t">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{r.student_name ?? '-'} ({r.hallticket_number ?? '-'})</td>
                      <td className="px-2 py-1">{r.omr_serial_no ?? '-'}</td>
                      <td className="px-2 py-1">
                        {img ? (
                          <img src={img} alt="" className="h-5 w-auto max-w-[120px] object-contain" />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-2 py-1">{r.subject_name ?? '-'} ({r.subject_code ?? '-'})</td>
                      <td className="px-2 py-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="View OMR page"
                          onClick={() => printStickersNotReady('OMR sheet view')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="View answer sheet"
                          onClick={() => printStickersNotReady('Answer sheet view')}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {!loading && rows.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">
                      No present students found for this subject.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}



