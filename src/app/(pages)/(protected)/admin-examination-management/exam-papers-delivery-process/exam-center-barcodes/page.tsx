'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  generateBarcodesForExamStudents,
  getExamOmrStudents,
  getUnivExamFiltersRegSup,
  getUnivExamRestNoTtBundle,
  getUnivExamSubjectUc,
} from '@/services/pre-examination'
import { listUnivExamCentersByUniversity, listUniversitiesForExamGroup } from '@/services/exam-papers-delivery'
import { PageContainer, PageHeader } from '@/components/layout'
import { DataTable, TableCard } from '@/common/components/table'
import type { ColDef } from 'ag-grid-community'

type AnyRow = Record<string, any>

const BARCODE_COL_ORDER = ['siNo', 'student', 'barcodeNo', 'subject'] as const
type BarcodeColKey = (typeof BARCODE_COL_ORDER)[number]

const BARCODE_COL_DEFS: Record<BarcodeColKey, ColDef<AnyRow>> = {
  siNo: {
    colId: 'siNo',
    headerName: 'S.No',
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 80,
    minWidth: 70,
    flex: 0,
  },
  student: {
    colId: 'student',
    headerName: 'Student',
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => {
      const r = p.data
      if (!r) return '—'
      const name = r.student_name ?? '—'
      const ht = r.hallticket_number ?? '-'
      return `${name} (${ht})`
    },
  },
  barcodeNo: {
    colId: 'barcodeNo',
    headerName: 'Barcode No',
    minWidth: 140,
    flex: 0,
    valueGetter: (p) => p.data?.omr_serial_no ?? '—',
  },
  subject: {
    colId: 'subject',
    headerName: 'Subject',
    minWidth: 220,
    flex: 1,
    valueGetter: (p) => {
      const r = p.data
      if (!r) return '—'
      const sn = r.subject_name ?? '-'
      const sc = r.subject_code ?? '-'
      return `${sn} (${sc})`
    },
  },
}

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
]
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
const pickRegValue = (row: AnyRow | null | undefined) => pickNum(row, REG_ID_KEYS) || regSyntheticId(row)
const pickBackendRegId = (row: AnyRow | null | undefined) => pickNum(row, REG_ID_KEYS)

export default function ExamCenterBarcodesPage() {
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
  const [examCenterId, setExamCenterId] = useState<number | null>(null)
  const [examCenters, setExamCenters] = useState<AnyRow[]>([])
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [selectedBackendRegulationId, setSelectedBackendRegulationId] = useState<number>(0)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [employeeId, setEmployeeId] = useState(0)

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId'])).filter((r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) > 0),
    [baseRows],
  )
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === Number(courseId)),
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
  const groups = useMemo(
    () => dedupeBy(restRows, (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId'])),
    [restRows],
  )
  const years = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            pickNum(r, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']) === Number(courseGroupId),
        ),
        (r) => pickNum(r, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']),
      ),
    [restRows, courseGroupId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy([...restRows, ...regulationRows].filter((r) => pickRegValue(r) > 0), (r) => pickRegValue(r)),
    [restRows, regulationRows],
  )
  const regulationBackendIdMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const r of regulations) map.set(pickRegValue(r), pickBackendRegId(r))
    return map
  }, [regulations])
  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => pickNum(r, SUBJECT_ID_KEYS)), [subjectRows])

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
    const regs = dedupeBy([...regsFromFlag, ...rest].filter((r) => pickRegValue(r) > 0), (r) => pickRegValue(r))
    setRegulationRows(regs)
    if (regs[0]) setRegulationId(pickRegValue(regs[0]))
    const clg = dedupeBy(rest, (r) => pickNum(r, ['fk_college_id', 'collegeId', 'fk_collegeId']))[0]
    if (clg) setCollegeId(pickNum(clg, ['fk_college_id', 'collegeId', 'fk_collegeId']))
  }

  async function loadSubjects(targetRegulationId?: number | null) {
    if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId) return
    const uiRegId = Number(targetRegulationId ?? regulationId ?? 0)
    const mappedBackendId = regulationBackendIdMap.get(uiRegId) ?? 0
    const selectedReg = regulations.find((r) => pickRegValue(r) === uiRegId)
    const regId = Number(mappedBackendId || pickNum(selectedReg, REG_ID_KEYS) || selectedBackendRegulationId || 0)
    const list = await getUnivExamSubjectUc({
      collegeId,
      courseId,
      courseGroupId,
      courseYearId,
      examId,
      academicYearId,
      regulationId: regId,
      employeeId,
    }).catch(() => [])
    setSubjectRows(Array.isArray(list) ? list : [])
    const first = Array.isArray(list) ? list[0] : null
    if (first) setSubjectId(pickNum(first, SUBJECT_ID_KEYS))
  }

  async function init() {
    setLoading(true)
    try {
      const filters = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
      setBaseRows(Array.isArray(filters) ? filters : [])
      const c = dedupeBy(filters, (r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']))[0]
      if (!c) return
      const cid = pickNum(c, ['fk_course_id', 'courseId', 'fk_courseId'])
      setCourseId(cid)
      const ay = dedupeBy(
        filters.filter((r) => pickNum(r, ['fk_course_id', 'courseId', 'fk_courseId']) === cid),
        (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']),
      )[0]
      if (!ay) return
      const ayid = pickNum(ay, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId'])
      setAcademicYearId(ayid)
      const ex = dedupeBy(
        filters.filter(
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
    async function loadCenters() {
      const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
      const univs = await listUniversitiesForExamGroup(orgId, employeeId).catch(() => [])
      const firstUniv = Array.isArray(univs) ? univs[0] : null
      const universityId = Number(firstUniv?.universityId ?? firstUniv?.university_id ?? 0)
      if (!universityId) {
        setExamCenters([])
        setExamCenterId(null)
        return
      }
      const centers = await listUnivExamCentersByUniversity(universityId).catch(() => [])
      const centerRows = Array.isArray(centers) ? centers : []
      setExamCenters(centerRows)
      const firstCenterId = Number(
        centerRows[0]?.univExamcenterId ?? centerRows[0]?.univExamCenterId ?? centerRows[0]?.univ_examcenter_id ?? 0,
      )
      setExamCenterId(firstCenterId || null)
    }
    if (employeeId > 0) void loadCenters()
  }, [employeeId])

  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
    setSubjectRows([])
    setSubjectId(null)
    const first = groups[0]
    if (first) setCourseGroupId(pickNum(first, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']))
  }, [groups])

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

  const columnDefs = useMemo(() => BARCODE_COL_ORDER.map((k) => BARCODE_COL_DEFS[k]), [])

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const d = p.data
    if (!d) return ''
    const det = Number(d.fk_exam_std_det_id ?? d.examStdDetId ?? d.exam_std_det_id ?? 0)
    if (det > 0) return String(det)
    const sid = Number(d.student_id ?? d.studentId ?? d.fk_student_id ?? 0)
    const sub = Number(d.fk_subject_id ?? d.subjectId ?? 0)
    return `row-${sid}-${sub}-${String(d.omr_serial_no ?? d.hallticket_number ?? '')}`
  }, [])

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
      setRows(Array.isArray(res) ? res : [])
    } finally {
      setLoading(false)
    }
  }

  async function generateBarcode() {
    const ids = rows.map((r) => Number(r.fk_exam_std_det_id ?? 0)).filter((x) => x > 0)
    if (!ids.length) return
    await generateBarcodesForExamStudents(ids).catch(() => null)
    await getList()
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam center barcodes" subtitle="Exam papers delivery process · Generate exam center barcodes" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Exam Center Barcodes</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {(
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-3 space-y-1"><Label>Academic Year *</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((a, i) => <SelectItem key={`ay-${i}`} value={String(pickNum(a, ['fk_academic_year_id', 'academicYearId', 'fk_academicYearId']))}>{pickText(a, ['academic_year', 'academicYear']) || '-'}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Exam Group *</Label><Select value={examId ? String(examId) : undefined} onValueChange={async (v) => { const eid = Number(v); setExamId(eid); if (courseId && academicYearId) await onExamLoad(courseId, academicYearId, eid) }}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Group" /></SelectTrigger><SelectContent>{exams.map((e, i) => <SelectItem key={`e-${i}`} value={String(pickNum(e, ['fk_exam_id', 'examId', 'fk_examId']))}>{pickText(e, ['exam_name', 'examName']) || '-'}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-5 space-y-1"><Label>Exam Center *</Label><Select value={examCenterId ? String(examCenterId) : undefined} onValueChange={(v) => setExamCenterId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Center" /></SelectTrigger><SelectContent>{examCenters.map((c, i) => <SelectItem key={`ec-${i}`} value={String(Number(c.univExamcenterId ?? c.univExamCenterId ?? c.univ_examcenter_id ?? 0))}>{String(c.examcenterCode ?? c.examCenterCode ?? '-')}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-3 space-y-1"><Label>Course Group</Label><Select value={courseGroupId ? String(courseGroupId) : undefined} onValueChange={(v) => setCourseGroupId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent>{groups.map((g, i) => <SelectItem key={`g-${i}`} value={String(pickNum(g, ['fk_course_group_id', 'courseGroupId', 'fk_course_groupId']))}>{pickText(g, ['group_code', 'groupCode']) || '-'}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1"><Label>Course Years *</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => setCourseYearId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent>{years.map((y, i) => <SelectItem key={`y-${i}`} value={String(pickNum(y, ['fk_course_year_id', 'courseYearId', 'fk_course_yearId']))}>{pickText(y, ['course_year_code', 'courseYearCode', 'course_year_name', 'courseYearName']) || '-'}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-3 space-y-1"><Label>Subjects</Label><Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger><SelectContent>{subjects.map((s, i) => <SelectItem key={`s-${i}`} value={String(pickNum(s, SUBJECT_ID_KEYS))}>{(pickText(s, ['subject_name', 'subjectName']) || '-') + ' (' + (pickText(s, ['subject_code', 'subjectCode']) || '-') + ')'}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 flex flex-col justify-end md:items-end">
                <Button type="button" onClick={getList} disabled={loading} className="h-8 shrink-0 px-2.5 text-[12px] w-full md:w-auto">
                  Get Students
                </Button>
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
            loading={loading}
            pagination
            paginationPageSize={10}
            getRowId={getRowId}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search students…',
              pdfDocumentTitle: 'Exam Center Barcodes',
            }}
          />
        </TableCard>
      )}
    </PageContainer>
  )
}

