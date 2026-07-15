'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/toast'
import {
  getExamCenterByCodeRows,
  listExamScanBundlesBySubjectFilters,
  pickExamScanBundleId,
  pickExamScanBundleLabel,
  type AnyRow,
} from '@/services/exam-papers-delivery'
import { getUnivExamFiltersRegSup } from '@/services/pre-examination'

type Row = AnyRow

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
  return String(
    row.fk_univ_exam_group_id ??
      row.univExamGroupId ??
      row.fk_exam_group_id ??
      row.examGroupId ??
      row.exam_group_id ??
      row.fk_exam_id ??
      row.examId ??
      '',
  ).trim()
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
  const [loading, setLoading] = useState(false)
  const [bundlesLoading, setBundlesLoading] = useState(false)
  const [employeeId, setEmployeeId] = useState(0)

  const [topRows, setTopRows] = useState<Row[]>([])
  const [scanFilterRows, setScanFilterRows] = useState<Row[]>([])
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

  const bundleOptions: SelectOption[] = useMemo(() => {
    const seen = new Set<string>()
    const out: SelectOption[] = []
    for (const b of bundles) {
      const id = pickExamScanBundleId(b)
      if (!id) continue
      const value = String(id)
      if (seen.has(value)) continue
      seen.add(value)
      out.push({ value, label: pickExamScanBundleLabel(b) || value })
    }
    return out
  }, [bundles])

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
        flag: 'eg_scan_filter' as 'eg_filters',
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
      setBundles([])
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

  // Angular `selectedSubject` — load bundles for exam group + course year + regulation + subject
  useEffect(() => {
    async function loadBundles() {
      const examGroupId = Number(form.examGroupId)
      const courseYearId = Number(form.courseYearId)
      const regulationId = Number(form.regulationId)
      const subjectId = Number(form.subjectId)
      if (!examGroupId || !courseYearId || !regulationId || !subjectId) {
        setBundles([])
        setForm((f) => (f.examScanBundleId ? { ...f, examScanBundleId: '' } : f))
        return
      }
      setBundlesLoading(true)
      try {
        const rows = await listExamScanBundlesBySubjectFilters({
          examGroupId,
          courseYearId,
          regulationId,
          subjectId,
        }).catch(() => [])
        const list = Array.isArray(rows) ? rows : []
        setBundles(list)
        setForm((f) => {
          const stillValid = list.some((b) => String(pickExamScanBundleId(b)) === f.examScanBundleId)
          if (stillValid) return f
          const first = list[0] ? String(pickExamScanBundleId(list[0])) : ''
          return { ...f, examScanBundleId: first && first !== '0' ? first : '' }
        })
      } finally {
        setBundlesLoading(false)
      }
    }
    void loadBundles()
  }, [form.examGroupId, form.courseYearId, form.regulationId, form.subjectId])

  function onGetDetails() {
    if (!form.examScanBundleId) {
      toastError('Exam Scan Bundle is required.')
      return
    }
    // Placeholder for next step grid/capture flow.
  }

  return (
    <FilteredPage
      title="Exam Scan Bundle Details"
      filters={(
        <>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-2 text-[12px]">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={captureMode === 'manual'} onChange={() => setCaptureMode('manual')} />
              Manual bundle Capture
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={captureMode === 'auto'} onChange={() => setCaptureMode('auto')} />
              Auto bundle Capture
            </label>
          </div>
          <GlobalFilterBarRow>
            <GlobalFilterField label="Academic Year">
              <Select
                options={academicYears.map((r) => ({
                  value: pickAcademicYearKey(r),
                  label: txt(r.academic_year ?? r.academicYear ?? r.academicYearCode ?? pickAcademicYearKey(r)),
                }))}
                value={form.academicYearId}
                onChange={(v) => setForm((f) => ({ ...f, academicYearId: v ?? '' }))}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Group">
              <Select
                options={examGroups.map((r) => ({
                  value: pickExamGroupKey(r),
                  label: txt(
                    r.exam_group_code ??
                      r.examGroupCode ??
                      r.exam_name ??
                      r.examName ??
                      r.examGroupName ??
                      pickExamGroupKey(r),
                  ),
                }))}
                value={form.examGroupId}
                onChange={(v) => setForm((f) => ({ ...f, examGroupId: v ?? '' }))}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course">
              <Select
                options={courses.map((r) => ({
                  value: pickCourseKey(r),
                  label: txt(r.course_code ?? r.courseCode),
                }))}
                value={form.courseId}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    courseId: v ?? '',
                    courseYearId: '',
                    regulationId: '',
                    subjectId: '',
                    examScanBundleId: '',
                  }))
                }
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Years">
              <Select
                options={courseYears.map((r) => ({
                  value: pickCourseYearKey(r),
                  label: txt(r.course_year_code ?? r.courseYearCode),
                }))}
                value={form.courseYearId}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    courseYearId: v ?? '',
                    regulationId: '',
                    subjectId: '',
                    examScanBundleId: '',
                  }))
                }
              />
            </GlobalFilterField>
            <GlobalFilterField label="Regulation">
              <Select
                options={regulations.map((r) => ({
                  value: pickRegulationKey(r),
                  label: txt(r.regulation_code ?? r.regulationCode ?? r.regulation_name),
                }))}
                value={form.regulationId}
                onChange={(v) =>
                  setForm((f) => ({ ...f, regulationId: v ?? '', subjectId: '', examScanBundleId: '' }))
                }
              />
            </GlobalFilterField>
            <GlobalFilterField label="Subjects">
              <Select
                options={subjects.map((r) => ({
                  value: pickSubjectKey(r),
                  label: `${txt(r.subject_name ?? r.subjectName)} (${txt(r.subject_code ?? r.subjectCode)})`,
                }))}
                value={form.subjectId}
                onChange={(v) => setForm((f) => ({ ...f, subjectId: v ?? '', examScanBundleId: '' }))}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Exam Scan Bundle">
              <Select
                options={bundleOptions}
                value={form.examScanBundleId}
                onChange={(v) => setForm((f) => ({ ...f, examScanBundleId: v ?? '' }))}
                isLoading={bundlesLoading}
                searchable={bundleOptions.length > 8}
              />
            </GlobalFilterField>
            <GlobalFilterField label="Action" className="global-filter-field--shrink global-filter-field--action">
              <Button type="button" onClick={onGetDetails} disabled={loading || bundlesLoading}>
                Get Details
              </Button>
            </GlobalFilterField>
          </GlobalFilterBarRow>
        </>
      )}
    />
  )
}
