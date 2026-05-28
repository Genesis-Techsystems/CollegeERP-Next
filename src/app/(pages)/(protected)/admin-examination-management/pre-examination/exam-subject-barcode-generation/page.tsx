'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Barcode, ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { DataTable, TableCard } from '@/common/components/table'
import {
  generateBarcodesForExamStudents,
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from '@/services/pre-examination'
import { PageContainer, PageHeader } from '@/components/layout'
import { useBarcodeStickerPrint } from './_print/useBarcodeStickerPrint'
import type { ColDef } from 'ag-grid-community'

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

const COL_DEFS = {
  slNo: {
    colId: 'slNo',
    headerName: 'S.No',
    valueGetter: (p: any) => (p.node?.rowIndex ?? 0) + 1,
    width: 72,
    minWidth: 64,
    flex: 0,
  } as ColDef<AnyRow>,
  student: {
    colId: 'student',
    headerName: 'Student',
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => {
      const r = p.data
      if (!r) return '—'
      const name = r.student_name ?? r.studentName ?? r.firstName ?? '—'
      const ht = r.hallticket_number ?? r.hallticketNumber ?? r.rollNumber ?? '—'
      return `${name} (${ht})`
    },
  } as ColDef<AnyRow>,
  barcodeNo: {
    colId: 'barcodeNo',
    headerName: 'Barcode No',
    minWidth: 130,
    valueGetter: (p) => p.data?.omr_serial_no ?? p.data?.omrSerialNo ?? '—',
  } as ColDef<AnyRow>,
  subject: {
    colId: 'subject',
    headerName: 'Subject',
    minWidth: 220,
    flex: 1,
    valueGetter: (p) => {
      const r = p.data
      if (!r) return '—'
      const name = r.subject_name ?? r.subjectName ?? '—'
      const code = r.subject_code ?? r.subjectCode ?? '—'
      return `${name} (${code})`
    },
  } as ColDef<AnyRow>,
}

export default function ExamSubjectBarcodeGenerationPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
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
    // Some regulation-filtered subject responses do not include regulation fields in each row.
    // In that case, use all subject rows as-is (already scoped by API).
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

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [COL_DEFS.slNo, COL_DEFS.student, COL_DEFS.barcodeNo, COL_DEFS.subject],
    [],
  )

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const d = p.data
    if (!d) return ''
    const det = Number(d.fk_exam_std_det_id ?? d.examStdDetId ?? d.exam_std_det_id ?? 0)
    if (det > 0) return String(det)
    const sid = Number(d.student_id ?? d.studentId ?? d.fk_student_id ?? 0)
    const sub = Number(d.fk_subject_id ?? d.subjectId ?? 0)
    return `row-${sid}-${sub}-${String(d.omr_serial_no ?? d.hallticket_number ?? '')}`
  }, [])

  const printExamName =
    pickText(
      exams.find((e) => pickNum(e, ['fk_exam_id', 'examId', 'fk_examId']) === Number(examId)),
      ['exam_name', 'examName'],
    ) || 'Exam'
  const { printMode, printButton, printView } = useBarcodeStickerPrint(rows, printExamName)

  async function init() {
    setLoading(true)
    try {
      const rows = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      setBaseRows(rows)
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
    if (firstReg) setRegulationId(pickRegValue(firstReg))
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
    const rows = await getUnivExamSubjectUc({
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      examId,
      academicYearId,
      regulationId: regId,
      employeeId,
    }).catch(() => [])
    const list = Array.isArray(rows) ? rows : []
    setSubjectRows(list)

    // Legacy behavior: regulation/subject both become available from subject filter response.
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
    // Legacy behavior: changing regulation always calls subject API with selected regulation id.
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

  async function fetchOmrStudentRows() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId) return
    const selectedRegRow = regulations.find((r) => pickRegValue(r) === Number(regulationId ?? 0)) ?? null
    const backendRegulationId = selectedBackendRegulationId || pickBackendRegId(selectedRegRow)
    const res = await getExamOmrStudents({
      examId,
      collegeId,
      courseGroupId,
      courseYearId,
      regulationId: backendRegulationId > 0 ? backendRegulationId : 0,
      subjectId,
    }).catch(() => [])
    setRows(Array.isArray(res) ? res : [])
  }

  async function getList() {
    if (!examId || !collegeId || !courseGroupId || !courseYearId || !subjectId) return
    setTableLoading(true)
    setHasFetched(true)
    try {
      await fetchOmrStudentRows()
    } finally {
      setTableLoading(false)
    }
  }

  async function generateBarcode() {
    const ids = rows.map((r) => Number(r.fk_exam_std_det_id ?? 0)).filter((x) => x > 0)
    if (ids.length === 0) return
    setTableLoading(true)
    try {
      await generateBarcodesForExamStudents(ids).catch(() => null)
      await fetchOmrStudentRows()
    } finally {
      setTableLoading(false)
    }
  }

  // When the sticker print is active, replace the page with the print layout
  // (the AppShell @media print rules hide nav/aside so only stickers print).
  if (printMode) return <>{printView}</>

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Subject Barcode" subtitle="Generate subject-wise barcodes" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Subject Barcode</h2>
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
              <Button type="button" onClick={getList} disabled={loading || tableLoading} className="h-8 px-3 text-[12px] w-full">Get List</Button>
            </div>
          </div>
        </div>
        )}
      </div>

      {hasFetched && (
        <TableCard withHeaderBorder={false}>
          <DataTable
            rowData={rows}
            columnDefs={columnDefs}
            loading={tableLoading}
            pagination
            paginationPageSize={10}
            getRowId={getRowId}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search students…',
              pdfDocumentTitle: 'Exam Subject Barcode',
            }}
            toolbarLeading={(
              <span className="max-w-[min(100%,28rem)] truncate text-[12px] font-medium text-[hsl(var(--primary))]" title={tableSummaryText}>
                {tableSummaryText}
              </span>
            )}
            toolbarTrailing={(
              <div className="flex items-center gap-2">
                {printButton}
                <Button
                  type="button"
                  size="sm"
                  onClick={generateBarcode}
                  disabled={tableLoading || rows.length === 0}
                  className="h-[30px] px-3 text-[12px]"
                >
                  <Barcode className="mr-1.5 h-3.5 w-3.5" />
                  Generate Barcode
                </Button>
              </div>
            )}
          />
        </TableCard>
      )}
    </PageContainer>
  )
}

