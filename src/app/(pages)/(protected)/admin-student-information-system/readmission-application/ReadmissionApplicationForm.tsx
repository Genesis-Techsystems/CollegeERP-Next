'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Button } from '@/components/ui/button'
import defaultStudent from '@/assets/images/avatars/default_Student.png'
import { StatusBadge } from '@/common/components/data-display'
import { toastError, toastSuccess } from '@/lib/toast'
import { useSessionContext } from '@/context/SessionContext'
import {
  fetchStudentDetail,
  listAcademicYearsForReadmissionWithProcFallback,
  listStudentCourseYearsByCourse,
  listGroupSectionsForReadmission,
  listStudentRegulationsByCourse,
  resolveUniversityIdForReadmission,
  submitStudentReadmission,
} from '@/services'

type AnyRow = Record<string, any>

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const v = Number(row[k] ?? 0)
    if (Number.isFinite(v) && v > 0) return v
  }
  return 0
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function toIsoDate(d: Date | null): string {
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function statusTone(code: string): 'active' | 'inactive' | 'pending' | 'draft' | 'published' {
  const c = code.toUpperCase()
  if (c === 'INCOLLEGE') return 'active'
  if (c === 'DETAINRECOMMENDED' || c === 'DTND') return 'pending'
  if (c === 'PASSEDOUT') return 'published'
  return 'inactive'
}

/** Match `student-promotion` / `studentdetail` field variants */
const COLLEGE_ID_KEYS = ['collegeId', 'fk_college_id', 'college_id', 'fk_collegeId'] as const

export function ReadmissionApplicationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()

  const studentId = useMemo(() => Number(searchParams.get('studentId') ?? 0), [searchParams])
  const universityIdParam = useMemo(() => Number(searchParams.get('universityId') ?? 0), [searchParams])
  const organizationIdParam = useMemo(() => Number(searchParams.get('organizationId') ?? 0), [searchParams])
  const collegeIdParam = useMemo(() => Number(searchParams.get('collegeId') ?? 0), [searchParams])

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [student, setStudent] = useState<AnyRow | null>(null)

  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [sections, setSections] = useState<AnyRow[]>([])

  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(null)
  const [reason, setReason] = useState('')

  /** Avoid re-applying student's section when user changes AY/CY and clears selection intentionally */
  const sectionDefaultAppliedRef = useRef(false)

  const loadSections = useCallback(async (s: AnyRow, ayId: number | null, cyId: number | null) => {
    const collegeId = num(s, [...COLLEGE_ID_KEYS])
    const courseGroupId = num(s, ['courseGroupId', 'fk_course_group_id'])
    if (!courseGroupId || !ayId || !cyId) {
      setSections([])
      return
    }
    try {
      const rows = await listGroupSectionsForReadmission({
        courseYearId: cyId,
        academicYearId: ayId,
        courseGroupId,
        collegeId: collegeId || undefined,
      })
      setSections(Array.isArray(rows) ? rows : [])
    } catch {
      setSections([])
    }
  }, [])

  useEffect(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setFromDate(d)
  }, [])

  useEffect(() => {
    async function run() {
      if (!studentId) {
        setLoading(false)
        toastError(new Error('Missing student id'), 'Readmission')
        return
      }
      sectionDefaultAppliedRef.current = false
      setLoading(true)
      try {
        const row = await fetchStudentDetail(studentId)
        if (!row) {
          setStudent(null)
          toastError(new Error('Student not found'), 'Readmission')
          return
        }
        const fromDetail = num(row, [...COLLEGE_ID_KEYS])
        const fromUrl = collegeIdParam > 0 ? collegeIdParam : 0
        const fromSession =
          Number(user?.collegeId) > 0 && (fromDetail <= 0 && fromUrl <= 0) ? Number(user?.collegeId) : 0
        const merged: AnyRow =
          fromDetail <= 0 && (fromUrl > 0 || fromSession > 0)
            ? { ...row, collegeId: fromUrl || fromSession }
            : row
        setStudent(merged)

        const collegeId =
          num(merged, [...COLLEGE_ID_KEYS]) || (collegeIdParam > 0 ? collegeIdParam : 0) || fromSession
        const resolvedUniv = await resolveUniversityIdForReadmission(merged, universityIdParam)
        const courseId = num(merged, ['courseId', 'fk_course_id'])

        const orgForAy = organizationIdParam || Number(user?.organizationId ?? 0)
        const empForAy = Number(user?.employeeId ?? 0)

        const [ays, regs, cyrs] = await Promise.all([
          listAcademicYearsForReadmissionWithProcFallback(resolvedUniv, collegeId, orgForAy, empForAy),
          courseId ? listStudentRegulationsByCourse(courseId) : Promise.resolve([] as AnyRow[]),
          courseId ? listStudentCourseYearsByCourse(courseId) : Promise.resolve([] as AnyRow[]),
        ])
        setAcademicYears(ays)
        setRegulations(regs)
        setCourseYears(cyrs)

        const pickAcademicYearId = (): number | null => {
          const fromStudent = num(merged, ['academicYearId', 'fk_academic_year_id', 'acdmYearId'])
          if (fromStudent > 0 && ays.some((a) => num(a, ['academicYearId', 'fk_academic_year_id']) === fromStudent)) {
            return fromStudent
          }
          const ayLabel = txt(merged, ['academicYear', 'academic_year']).trim()
          if (ayLabel) {
            const match = ays.find(
              (a) => txt(a, ['academicYear', 'academic_year', 'academic_year_name']).trim() === ayLabel,
            )
            if (match) return num(match, ['academicYearId', 'fk_academic_year_id'])
          }
          return ays[0] ? num(ays[0], ['academicYearId', 'fk_academic_year_id']) : null
        }

        const firstReg = regs[0] ? num(regs[0], ['regulationId', 'fk_regulation_id']) : null
        const pickCourseYearId = (): number | null => {
          const fromStudent = num(merged, ['courseYearId', 'fk_course_year_id'])
          if (fromStudent > 0 && cyrs.some((c) => num(c, ['courseYearId', 'fk_course_year_id']) === fromStudent)) {
            return fromStudent
          }
          const cyLabel = txt(merged, ['courseYearName', 'course_year_name']).trim()
          if (cyLabel) {
            const match = cyrs.find(
              (c) => txt(c, ['courseYearName', 'course_year_name']).trim() === cyLabel,
            )
            if (match) return num(match, ['courseYearId', 'fk_course_year_id'])
          }
          return cyrs[0] ? num(cyrs[0], ['courseYearId', 'fk_course_year_id']) : null
        }

        const ayId = pickAcademicYearId()
        const cyId = pickCourseYearId()
        setAcademicYearId(ayId)
        setRegulationId(firstReg)
        setCourseYearId(cyId)
      } catch (e) {
        toastError(e, 'Failed to load readmission data')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [
    studentId,
    universityIdParam,
    organizationIdParam,
    collegeIdParam,
    user?.employeeId,
    user?.organizationId,
    loadSections,
  ])

  useEffect(() => {
    if (!student || !academicYearId || !courseYearId) return
    void loadSections(student, academicYearId, courseYearId)
  }, [student, academicYearId, courseYearId, loadSections])

  useEffect(() => {
    if (sectionDefaultAppliedRef.current || !student || sections.length === 0) return
    const sid = num(student, ['groupSectionId', 'fk_group_section_id', 'group_section_id'])
    if (sid <= 0) return
    const ok = sections.some((s) => num(s, ['groupSectionId', 'fk_group_section_id']) === sid)
    if (ok) {
      setGroupSectionId(sid)
      sectionDefaultAppliedRef.current = true
    }
  }, [student, sections])

  const ayOptions = useMemo(
    () =>
      academicYears
        .map((r) => ({
          value: String(num(r, ['academicYearId', 'fk_academic_year_id', 'academic_year_id'])),
          label: txt(r, ['academicYear', 'academic_year', 'academic_year_name']) || 'Academic year',
        }))
        .filter((o) => o.value !== '0' && o.value !== ''),
    [academicYears],
  )

  const regOptions = useMemo(
    () =>
      regulations.map((r) => ({
        value: String(num(r, ['regulationId', 'fk_regulation_id'])),
        label: txt(r, ['regulationName', 'regulationCode']) || 'Regulation',
      })),
    [regulations],
  )

  const cyOptions = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(num(r, ['courseYearId', 'fk_course_year_id'])),
        label: txt(r, ['courseYearName', 'course_year_name']) || 'Course year',
      })),
    [courseYears],
  )

  const secOptions = useMemo(
    () =>
      sections.map((r) => ({
        value: String(num(r, ['groupSectionId', 'fk_group_section_id'])),
        label: txt(r, ['section', 'groupSectionName', 'group_section_name']) || 'Section',
      })),
    [sections],
  )

  function goBackToList() {
    const cid = student ? num(student, [...COLLEGE_ID_KEYS]) : 0
    const oid = student ? num(student, ['organizationId', 'fk_organization_id']) : 0
    const q = new URLSearchParams()
    if (cid) q.set('collegeId', String(cid))
    if (oid) q.set('organizationId', String(oid))
    const tail = q.toString()
    router.push(
      `/admin-student-information-system/student-re-admission${tail ? `?${tail}` : ''}`,
    )
  }

  async function onSave() {
    if (!student) return
    if (!academicYearId || !regulationId || !courseYearId || !groupSectionId) {
      toastError(new Error('Please fill all required fields'), 'Readmission')
      return
    }
    const r = reason.trim()
    if (!r) {
      toastError(new Error('Reason is required'), 'Readmission')
      return
    }
    if (!fromDate) {
      toastError(new Error('From date is required'), 'Readmission')
      return
    }

    const selectedCy = courseYears.find(
      (x) => num(x, ['courseYearId', 'fk_course_year_id']) === courseYearId,
    )
    // Resolve the student's current course year by id first (the reliable field the
    // form already relies on); fall back to name matching only if the id is absent.
    // The old name-only match silently no-op'd when studentdetail omitted courseYearName,
    // letting an invalid downgrade through with no warning.
    const studentCyId = num(student, ['courseYearId', 'fk_course_year_id'])
    const currentCy =
      (studentCyId > 0
        ? courseYears.find((x) => num(x, ['courseYearId', 'fk_course_year_id']) === studentCyId)
        : undefined) ??
      courseYears.find(
        (x) =>
          txt(x, ['courseYearName', 'course_year_name']) ===
          txt(student, ['courseYearName', 'course_year_name']),
      )
    if (selectedCy && currentCy) {
      const selNo = Number(selectedCy.yearNo ?? selectedCy.year_no ?? 0)
      const curNo = Number(currentCy.yearNo ?? currentCy.year_no ?? 0)
      if (selNo < curNo) {
        toastError(
          new Error('You are rejoining to wrong course year — please check'),
          'Readmission',
        )
        return
      }
    }

    const payload: Record<string, unknown> = {
      academicYearId,
      regulationId,
      courseYearId,
      groupSectionId,
      fromDate: toIsoDate(fromDate),
      toDate: toIsoDate(fromDate),
      reason: r,
      collegeId: num(student, [...COLLEGE_ID_KEYS]),
      courseId: num(student, ['courseId', 'fk_course_id']),
      courseGroupId: num(student, ['courseGroupId', 'fk_course_group_id']),
      quotaId: num(student, ['quotaId', 'fk_quota_id']),
      studentId: num(student, ['studentId', 'fk_student_id']),
    }

    setSubmitting(true)
    try {
      await submitStudentReadmission(payload)
      toastSuccess('Re-admission saved successfully')
      goBackToList()
    } catch (e) {
      toastError(e, 'Failed to save re-admission')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageContainer className="space-y-4">
        <PageHeader title="Student Re-Admission" subtitle="Student Information System" />
        <p className="text-sm text-slate-600 px-6">Loading…</p>
      </PageContainer>
    )
  }

  if (!student) {
    return (
      <PageContainer className="space-y-4">
        <PageHeader title="Student Re-Admission" subtitle="Student Information System" />
        <div className="app-card mx-6 p-4">
          <p className="text-sm text-slate-700">No student loaded.</p>
          <Button type="button" className="mt-3 h-8 text-xs" variant="outline" onClick={goBackToList}>
            Back
          </Button>
        </div>
      </PageContainer>
    )
  }

  const stCode = String(student.studentStatusCode ?? student.student_status_code ?? '').trim()
  const lateral = Boolean(student.isLateral ?? student.is_lateral)

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Student Re-Admission" subtitle="Student Information System" />

      <div className="app-card overflow-hidden mx-6">
        <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-start">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote student photo URLs */}
            <img
  src={txt(student, ['studentPhotoPath']) || defaultStudent.src}
  alt=""
  className="h-20 w-20 rounded-md border border-border object-cover"
  onError={(e) => {
    e.currentTarget.src = defaultStudent.src
  }}
/>
          </div>
          <div className="min-w-0 flex-1 space-y-1 text-[12px]">
            <p className="text-[14px] font-semibold text-slate-900">
              {txt(student, ['firstName', 'studentName'])}{' '}
              <span className="text-blue-600">({lateral ? 'LATERAL' : 'REGULAR'})</span>
            </p>
            <p className="text-slate-500">{txt(student, ['hallticketNumber', 'rollNumber'])}</p>
            <p className="text-slate-500">
              {txt(student, ['collegeCode'])} / {txt(student, ['academicYear', 'academic_year'])} /{' '}
              {txt(student, ['courseName', 'course_name'])} / {txt(student, ['groupCode', 'group_code'])} /{' '}
              {txt(student, ['courseYearName', 'course_year_name'])} / Section{' '}
              {txt(student, ['section', 'sectionName'])}
            </p>
            <p className="text-slate-500">{txt(student, ['mobile', 'mobileNumber'])}</p>
          </div>
          <div className="text-[12px] sm:text-right">
            <p className="text-slate-700">
              <span className="font-medium">Student status:</span>{' '}
              {stCode ? (
                <StatusBadge status={statusTone(stCode)} label={txt(student, ['studentStatusDisplayName', 'student_status_display_name']) || stCode} />
              ) : (
                '—'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="app-card mx-6 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Academic Year"
            required
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => {
              setAcademicYearId(v ? Number(v) : null)
              setGroupSectionId(null)
            }}
            options={ayOptions}
            placeholder="Academic Year"
            className="[&_label]:text-xs [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
          />
          <Select
            label="Regulation"
            required
            value={regulationId ? String(regulationId) : null}
            onChange={(v) => setRegulationId(v ? Number(v) : null)}
            options={regOptions}
            placeholder="Regulation"
            className="[&_label]:text-xs [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
          />
          <Select
            label="Course Year"
            required
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => {
              setCourseYearId(v ? Number(v) : null)
              setGroupSectionId(null)
            }}
            options={cyOptions}
            placeholder="Course Year"
            className="[&_label]:text-xs [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
          />
          <Select
            label="Section"
            required
            value={groupSectionId ? String(groupSectionId) : null}
            onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
            options={secOptions}
            placeholder="Section"
            searchable
            className="[&_label]:text-xs [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
          />
          <DatePicker
            label="From Date"
            value={fromDate}
            onChange={setFromDate}
            placeholder="From date"
            className="max-w-xs"
          />
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-slate-700">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            required
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-[12px]"
            placeholder="Reason"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" className="h-8 text-xs" onClick={goBackToList}>
            Back
          </Button>
          <Button type="button" className="h-8 text-xs" disabled={submitting} onClick={() => void onSave()}>
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
