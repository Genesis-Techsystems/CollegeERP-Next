'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookMarked, ChevronDown, Filter } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toastError } from '@/lib/toast'
import {
  getExamCenterByCodeRows,
  listAllActiveExamScanBundles,
  listAllActiveUnivEcProfiles,
  type AnyRow,
} from '@/services/exam-papers-delivery'
import { getUnivExamFiltersRegSup } from '@/services/pre-examination'

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

function dedupeBy<T>(rows: T[], keyFn: (row: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rows) {
    const key = keyFn(r)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

function pickAcademicYearKey(row: Row): string {
  return String(
    row.fk_academic_year_id ?? row.academicYearId ?? row.academic_year_id ?? row.fk_academic_yearid ?? '',
  ).trim()
}

function pickExamGroupKey(row: Row): string {
  return String(row.fk_exam_group_id ?? row.examGroupId ?? row.exam_group_id ?? row.fk_exam_id ?? row.examId ?? '').trim()
}

function pickCourseKey(row: Row): string {
  return String(row.fk_course_id ?? row.courseId ?? row.course_id ?? '').trim()
}

function pickCourseYearKey(row: Row): string {
  return String(row.fk_course_year_id ?? row.courseYearId ?? row.course_year_id ?? '').trim()
}

function pickRegulationKey(row: Row): string {
  return String(row.fk_regulation_id ?? row.regulationId ?? row.regulationCatId ?? '').trim()
}

function pickSubjectKey(row: Row): string {
  return String(row.fk_subject_id ?? row.subjectId ?? row.subject_id ?? '').trim()
}

export default function ExamScanBundleDetailsPage() {
  const [captureMode, setCaptureMode] = useState<'manual' | 'auto'>('manual')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)

  const [topRows, setTopRows] = useState<Row[]>([])
  const [scanFilterRows, setScanFilterRows] = useState<Row[]>([])
  const [scanProfiles, setScanProfiles] = useState<Row[]>([])
  const [bundles, setBundles] = useState<Row[]>([])

  const [form, setForm] = useState({
    academicYearId: '',
    examGroupId: '',
    courseId: '',
    courseYearId: '',
    regulationId: '',
    subjectId: '',
    examScanBundleId: '',
  })

  const academicYears = useMemo(
    () => dedupeBy(topRows, (r) => pickAcademicYearKey(r)),
    [topRows],
  )
  const examGroups = useMemo(
    () => dedupeBy(topRows.filter((r) => pickAcademicYearKey(r) === form.academicYearId), (r) => pickExamGroupKey(r)),
    [topRows, form.academicYearId],
  )
  const courses = useMemo(() => dedupeBy(scanFilterRows, (r) => pickCourseKey(r)), [scanFilterRows])
  const courseYears = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter((r) => pickCourseKey(r) === form.courseId),
        (r) => pickCourseYearKey(r),
      ),
    [scanFilterRows, form.courseId],
  )
  const regulations = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter((r) => pickCourseKey(r) === form.courseId && pickCourseYearKey(r) === form.courseYearId),
        (r) => pickRegulationKey(r),
      ),
    [scanFilterRows, form.courseId, form.courseYearId],
  )
  const subjects = useMemo(
    () =>
      dedupeBy(
        scanFilterRows.filter(
          (r) =>
            pickCourseKey(r) === form.courseId &&
            pickCourseYearKey(r) === form.courseYearId &&
            pickRegulationKey(r) === form.regulationId,
        ),
        (r) => pickSubjectKey(r),
      ),
    [scanFilterRows, form.courseId, form.courseYearId, form.regulationId],
  )

  const bundleOptions: SelectOption[] = useMemo(
    () =>
      bundles.map((b) => ({
        value: String(num(b.examScanBundleId ?? b.scanBundleId)),
        label: txt(b.bundleNumber ?? b.scanBundleNumber),
      })),
    [bundles],
  )

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem('employeeId') ?? 0))
  }, [])

  useEffect(() => {
    async function init() {
      if (!employeeId) return
      setLoading(true)
      try {
        const top = await getUnivExamFiltersRegSup(employeeId).catch(() => [])
        setTopRows(Array.isArray(top) ? top : [])
        const profiles = await listAllActiveUnivEcProfiles().catch(() => [])
        setScanProfiles(Array.isArray(profiles) ? profiles : [])
        const bundleRows = await listAllActiveExamScanBundles().catch(() => [])
        setBundles(Array.isArray(bundleRows) ? bundleRows : [])
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    if (!academicYears.length || form.academicYearId) return
    setForm((f) => ({ ...f, academicYearId: pickAcademicYearKey(academicYears[0]) }))
  }, [academicYears, form.academicYearId])

  useEffect(() => {
    if (!examGroups.length || form.examGroupId) return
    setForm((f) => ({ ...f, examGroupId: pickExamGroupKey(examGroups[0]) }))
  }, [examGroups, form.examGroupId])

  useEffect(() => {
    async function loadScanFilters() {
      if (!form.academicYearId || !form.examGroupId) return
      const rows = await getExamCenterByCodeRows({
        flag: 'eg_scan_filter',
        flagType: 'REGSUP',
        univExamcenterId: 0,
        examGroupId: Number(form.examGroupId),
        collegeId: 0,
        courseId: 0,
        courseGroupId: 0,
        courseYearId: 0,
        academicYearId: Number(form.academicYearId),
        examId: 0,
        regulationId: 0,
        subjectId: 0,
        universityId: 0,
      }).catch(() => [])
      setScanFilterRows(Array.isArray(rows) ? rows : [])
      setForm((f) => ({ ...f, courseId: '', courseYearId: '', regulationId: '', subjectId: '', examScanBundleId: '' }))
    }
    void loadScanFilters()
  }, [form.academicYearId, form.examGroupId])

  useEffect(() => {
    if (!courses.length) return
    setForm((f) => ({ ...f, courseId: f.courseId || pickCourseKey(courses[0]) }))
  }, [courses])

  useEffect(() => {
    if (!courseYears.length) return
    setForm((f) => ({ ...f, courseYearId: f.courseYearId || pickCourseYearKey(courseYears[0]) }))
  }, [courseYears])

  useEffect(() => {
    if (!regulations.length) return
    setForm((f) => ({ ...f, regulationId: f.regulationId || pickRegulationKey(regulations[0]) }))
  }, [regulations])

  useEffect(() => {
    if (!subjects.length) return
    setForm((f) => ({ ...f, subjectId: f.subjectId || pickSubjectKey(subjects[0]) }))
  }, [subjects])

  function onGetDetails() {
    if (!form.examScanBundleId) {
      toastError('Exam Scan Bundle is required.')
      return
    }
    // Placeholder for next step grid/capture flow.
  }

  return (
    <PageContainer className="space-y-5">
      <div className="app-card p-3 border-t-[3px] border-t-amber-300">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookMarked className="h-4 w-4 text-blue-700 shrink-0" aria-hidden />
            <h2 className="text-[14px] font-semibold leading-tight text-[hsl(var(--card-title))] truncate">
              Exam Scan Bundle Details
            </h2>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <span>Filter</span>
            <Filter className="h-4 w-4" aria-hidden />
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-10 gap-y-2 pt-3 text-[12px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={captureMode === 'manual'} onChange={() => setCaptureMode('manual')} />
            Manual bundle Capture
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={captureMode === 'auto'} onChange={() => setCaptureMode('auto')} />
            Auto bundle Capture
          </label>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="space-y-1 md:col-span-3">
              <Label>Academic Year *</Label>
              <Select
                options={academicYears.map((r) => ({
                  value: pickAcademicYearKey(r),
                  label: txt(r.academic_year ?? r.academicYear ?? r.academicYearCode ?? pickAcademicYearKey(r)),
                }))}
                value={form.academicYearId}
                onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam Group *</Label>
              <Select
                options={examGroups.map((r) => ({
                  value: pickExamGroupKey(r),
                  label: txt(r.exam_name ?? r.examName ?? r.examGroupName ?? pickExamGroupKey(r)),
                }))}
                value={form.examGroupId}
                onChange={(v) => setForm((f) => ({ ...f, examGroupId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Course *</Label>
              <Select
                options={courses.map((r) => ({
                  value: pickCourseKey(r),
                  label: txt(r.course_code ?? r.courseCode),
                }))}
                value={form.courseId}
                onChange={(v) => setForm((f) => ({ ...f, courseId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Years *</Label>
              <Select
                options={courseYears.map((r) => ({
                  value: pickCourseYearKey(r),
                  label: txt(r.course_year_code ?? r.courseYearCode),
                }))}
                value={form.courseYearId}
                onChange={(v) => setForm((f) => ({ ...f, courseYearId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Regulation *</Label>
              <Select
                options={regulations.map((r) => ({
                  value: pickRegulationKey(r),
                  label: txt(r.regulation_code ?? r.regulationCode ?? r.regulation_name),
                }))}
                value={form.regulationId}
                onChange={(v) => setForm((f) => ({ ...f, regulationId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>Subjects</Label>
              <Select
                options={subjects.map((r) => ({
                  value: pickSubjectKey(r),
                  label: `${txt(r.subject_name ?? r.subjectName)} (${txt(r.subject_code ?? r.subjectCode)})`,
                }))}
                value={form.subjectId}
                onChange={(v) => setForm((f) => ({ ...f, subjectId: v ?? '' }))}
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Exam Scan Bundle *</Label>
              <Select
                options={bundleOptions}
                value={form.examScanBundleId}
                onChange={(v) => setForm((f) => ({ ...f, examScanBundleId: v ?? '' }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="button" onClick={onGetDetails} disabled={loading}>Get Details</Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  )
}

