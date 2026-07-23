'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { Select } from '@/common/components/select'
import { FormField } from '@/common/components/forms'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MINIO_URL } from '@/config/constants/api'
import { getErrorMessage } from '@/lib/errors'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createParentAccount,
  fetchStudentDetail,
  getDigitalOnlineSyncFilters,
  listAcademicYearsForCollege,
  listStudentsForParentAccountManage,
} from '@/services'

type AnyRow = Record<string, unknown>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const DEFAULT_STUDENT_PHOTO = '/assets/images/avatars/default_Student.png'

function mergeStudentDetailFragment(row: AnyRow): AnyRow {
  const chunks = [row.studentDetail, row.StudentDetail, row.studentProfile, row.StudentProfile].filter(
    (v): v is AnyRow => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
  )
  const nested = chunks.reduce<AnyRow>((acc, cur) => ({ ...acc, ...cur }), {})
  return { ...row, ...nested }
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  const m = mergeStudentDetailFragment(row)
  for (const key of keys) {
    const v = s(m[key]).trim()
    if (v) return v
  }
  return ''
}

function studentOptionFromRow(row: AnyRow): { value: string; label: string } | null {
  const sid = n(row.studentId ?? row.fk_student_id ?? row.student_id)
  if (!sid) return null
  const ht = pickText(row, ['rollNumber', 'hallticketNumber', 'hallTicketNumber', 'admissionNumber'])
  const name = pickText(row, ['firstName', 'studentName', 'fullName', 'name'])
  const label = ht && name ? `${ht} ${name}` : name || ht || `Student ${sid}`
  return { value: String(sid), label }
}

function academicYearOption(row: AnyRow): { value: string; label: string } | null {
  const id = n(row.academicYearId ?? row.fk_academic_year_id)
  if (!id) return null
  const label = s(row.academicYear ?? row.academic_year)
  return { value: String(id), label: label || `Year ${id}` }
}

/** Angular `[src]='students[0].studentPhotoPath'` + MINIO when path is relative. */
function studentPhotoUrl(row: AnyRow): string {
  const m = mergeStudentDetailFragment(row)
  const p = pickText(m, [
    'studentPhotoPath',
    'student_photo_path',
    'photoPath',
    'photo_path',
    'studentPhoto',
    'imagePath',
  ])
  if (!p) return DEFAULT_STUDENT_PHOTO
  if (/^https?:\/\//i.test(p) || p.startsWith('/assets/')) {
    return p.includes('?') ? p : `${p}?${Date.now()}`
  }
  const base = MINIO_URL.replace(/\/$/, '')
  const path = p.startsWith('/') ? p : `/${p}`
  const full = base ? `${base}${path}` : p
  return full.includes('?') ? full : `${full}?${Date.now()}`
}

function academicLine(row: AnyRow, collegeCode: string): string {
  const m = mergeStudentDetailFragment(row)
  const section = pickText(m, ['section', 'sectionName', 'groupSectionName', 'groupsectionName'])
  const parts = [
    collegeCode || pickText(m, ['collegeCode', 'college_code']),
    pickText(m, ['courseCode', 'course_code', 'courseName']),
    pickText(m, ['groupCode', 'group_code', 'courseGroupCode']),
    pickText(m, ['courseYearName', 'course_year_name', 'courseYear']),
    section ? (section.toLowerCase().startsWith('section') ? section : `Section ${section}`) : '',
  ].filter(Boolean)
  return parts.join(' / ') || '—'
}

const EMPTY_FORM = {
  firstName: '',
  userName: '',
  email: '',
  password: '',
  passwordConfirm: '',
  mobileNumber: '',
}

export default function ParentAccountsManagePage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentOption, setSelectedStudentOption] = useState<{
    value: string
    label: string
  } | null>(null)
  const [selectedStudentRow, setSelectedStudentRow] = useState<AnyRow | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const formHydrateStudentRef = useRef(0)

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    setFiltersLoading(true)
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[])
        setAcademicData(d.academicYearData as AnyRow[])
      })
      .catch(() => {
        setFiltersData([])
        setAcademicData([])
      })
      .finally(() => setFiltersLoading(false))
  }, [])

  const colleges = useMemo(
    () => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)),
    [filtersData],
  )

  const syncAcademicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(
      academicData.filter((r) => n(r.fk_university_id) === univId),
      'fk_academic_year_id',
    ).sort((a, b) => s(b.academic_year).localeCompare(s(a.academic_year)))
  }, [academicData, filtersData, collegeId])

  const { data: domainAcademicYears = [], isLoading: domainYearsLoading } = useQuery({
    queryKey: ['ParentAccountManage', 'academicYearsDomain', collegeId],
    queryFn: () => listAcademicYearsForCollege(collegeId ?? 0),
    enabled: !!collegeId && syncAcademicYears.length === 0,
  })

  const academicYearOptions = useMemo(() => {
    if (syncAcademicYears.length > 0) {
      return syncAcademicYears
        .map((x) => academicYearOption(x))
        .filter((o): o is { value: string; label: string } => o != null)
    }
    return domainAcademicYears
      .map((x) => academicYearOption(x as AnyRow))
      .filter((o): o is { value: string; label: string } => o != null)
  }, [syncAcademicYears, domainAcademicYears])

  useEffect(() => {
    if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id))
  }, [colleges, collegeId])

  useEffect(() => {
    setAcademicYearId(null)
    setStudentId(null)
    setStudentSearch('')
    setSelectedStudentOption(null)
    setSelectedStudentRow(null)
    setForm(EMPTY_FORM)
    setPhotoError(false)
    formHydrateStudentRef.current = 0
  }, [collegeId])

  useEffect(() => {
    setStudentId(null)
    setStudentSearch('')
    setSelectedStudentOption(null)
    setSelectedStudentRow(null)
    setForm(EMPTY_FORM)
    setPhotoError(false)
    formHydrateStudentRef.current = 0
  }, [academicYearId])

  const studentSearchEnabled =
    !!collegeId && !!academicYearId && studentSearch.trim().length > 4

  const { data: studentRows = [], isFetching: studentsLoading } = useQuery({
    queryKey: [
      'ParentAccountManage',
      'students',
      collegeId,
      academicYearId,
      studentSearch.trim(),
    ],
    queryFn: () =>
      listStudentsForParentAccountManage({
        collegeId: collegeId ?? 0,
        academicYearId: academicYearId ?? 0,
        q: studentSearch.trim(),
      }),
    enabled: studentSearchEnabled,
  })

  const studentIdNum = studentId ? Number(studentId) : 0
  const { data: studentDetail } = useQuery({
    queryKey: ['ParentAccountManage', 'studentDetail', studentIdNum],
    queryFn: () => fetchStudentDetail(studentIdNum),
    enabled: studentIdNum > 0,
  })

  const studentOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: { value: string; label: string }[] = []
    if (selectedStudentOption) {
      seen.add(selectedStudentOption.value)
      out.push(selectedStudentOption)
    }
    for (const row of studentRows) {
      const opt = studentOptionFromRow(row as AnyRow)
      if (!opt || seen.has(opt.value)) continue
      seen.add(opt.value)
      out.push(opt)
    }
    return out
  }, [studentRows, selectedStudentOption])

  const previewStudent = useMemo((): AnyRow | null => {
    if (!studentIdNum) return null
    const base = selectedStudentRow ?? {}
    const detail =
      studentDetail && typeof studentDetail === 'object'
        ? (studentDetail as AnyRow)
        : null
    if (!Object.keys(base).length && !detail) return null
    return mergeStudentDetailFragment({ ...base, ...(detail ?? {}) })
  }, [studentIdNum, selectedStudentRow, studentDetail])

  const selectedCollegeCode = useMemo(() => {
    const row = colleges.find((c) => n(c.fk_college_id) === (collegeId ?? 0))
    return s(row?.college_code)
  }, [colleges, collegeId])

  const cardPhotoSrc = useMemo(() => {
    if (!previewStudent || photoError) return DEFAULT_STUDENT_PHOTO
    return studentPhotoUrl(previewStudent)
  }, [previewStudent, photoError])

  function handleStudentChange(value: string | null) {
    setStudentId(value)
    setPhotoError(false)
    if (!value) {
      setSelectedStudentOption(null)
      setSelectedStudentRow(null)
      setForm(EMPTY_FORM)
      formHydrateStudentRef.current = 0
      return
    }
    const fromSearch = studentOptions.find((o) => o.value === value)
    if (fromSearch) setSelectedStudentOption(fromSearch)
    const row =
      (studentRows as AnyRow[]).find(
        (r) => String(n(r.studentId ?? r.fk_student_id ?? r.student_id)) === value,
      ) ?? null
    setSelectedStudentRow(row)
  }

  // Angular selectedStudent: pName/firstName ← fatherName from search + studentdetail.
  useEffect(() => {
    if (!studentIdNum || !previewStudent) {
      if (!studentIdNum) {
        formHydrateStudentRef.current = 0
        setForm(EMPTY_FORM)
      }
      return
    }
    const studentJustChanged = formHydrateStudentRef.current !== studentIdNum
    formHydrateStudentRef.current = studentIdNum

    const father = pickText(previewStudent, [
      'fatherName',
      'father_name',
      'fathersName',
      'parentName',
      'parent_name',
      'fatherFirstName',
    ])
    const mobile = pickText(previewStudent, [
      'fatherMobile',
      'father_mobile',
      'fatherMobileNumber',
      'mobile',
      'mobileNumber',
      'mobile_number',
      'phone',
    ])
    // Only parent-specific username fields (never student.userName — that is the student login).
    const suggestedUserName = pickText(previewStudent, [
      'parentUserName',
      'parent_user_name',
      'fatherUserName',
      'father_user_name',
    ])

    setForm((prev) => ({
      ...prev,
      firstName: father || (studentJustChanged ? '' : prev.firstName),
      userName: studentJustChanged
        ? suggestedUserName
        : (prev.userName || suggestedUserName),
      email: studentJustChanged ? '' : prev.email,
      mobileNumber: studentJustChanged ? mobile : (prev.mobileNumber || mobile),
      password: studentJustChanged ? '' : prev.password,
      passwordConfirm: studentJustChanged ? '' : prev.passwordConfirm,
    }))
  }, [studentIdNum, previewStudent])

  async function handleAdd() {
    if (!collegeId || !academicYearId || !studentIdNum) {
      return toastError('Please select college, academic year, and student')
    }
    const organizationId = Number(localStorage.getItem('organizationId') ?? 0)
    if (!organizationId) {
      return toastError('Organization is missing from session')
    }
    try {
      setSaving(true)
      await createParentAccount({
        collegeId,
        academicYearId,
        studentId: studentIdNum,
        organizationId,
        firstName: form.firstName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
      })
      toastSuccess('Parent account created successfully')
      setStudentId(null)
      setSelectedStudentOption(null)
      setSelectedStudentRow(null)
      setStudentSearch('')
      setForm(EMPTY_FORM)
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FilteredPage
      title="Parent Account"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="College">
            <Select
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({
                value: String(n(x.fk_college_id)),
                label: s(x.college_code),
              }))}
              searchable
              clearable
              isLoading={filtersLoading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYearOptions}
              searchable
              clearable
              disabled={!collegeId}
              isLoading={filtersLoading || domainYearsLoading}
            />
          </GlobalFilterField>
          <GlobalFilterField label="Student">
            <Select
              value={studentId}
              onChange={handleStudentChange}
              options={studentOptions}
              searchable
              clearable
              disabled={!collegeId || !academicYearId}
              isLoading={studentsLoading}
              onSearch={setStudentSearch}
              placeholder={
                !collegeId || !academicYearId
                  ? 'Select college and year first'
                  : 'Search by student name or rollno.'
              }
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
      <div className="space-y-4">
        {previewStudent ? (
          <div className="rounded-md border border-sky-300/90 bg-sky-50/40 p-4 shadow-sm space-y-4">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cardPhotoSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
                <p className="font-semibold text-slate-900">
                  {pickText(previewStudent, [
                    'firstName',
                    'studentName',
                    'fullName',
                    'name',
                  ]) || '—'}
                </p>
                <p className="text-slate-500">
                  {pickText(previewStudent, [
                    'rollNumber',
                    'hallticketNumber',
                    'hallTicketNumber',
                    'admissionNumber',
                  ]) || '—'}
                </p>
                <p className="text-slate-500 leading-snug">
                  {academicLine(previewStudent, selectedCollegeCode)}
                </p>
                <p className="text-slate-500">
                  {pickText(previewStudent, [
                    'mobile',
                    'mobileNumber',
                    'mobile_number',
                    'phone',
                  ]) || '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="First Name">
                <Input
                  className="h-10 text-[13px]"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  disabled
                />
              </FormField>
              <FormField label="User Name" required>
                <Input
                  className="h-10 text-[13px]"
                  value={form.userName}
                  onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
                />
              </FormField>
              <FormField label="Email" required>
                <Input
                  className="h-10 text-[13px]"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </FormField>
              <FormField label="Enter your password" required>
                <div className="relative">
                  <Input
                    className="h-10 text-[13px] pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>
              <FormField label="Confirm Password" required>
                <Input
                  className="h-10 text-[13px]"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm((f) => ({ ...f, passwordConfirm: e.target.value }))}
                />
              </FormField>
              <FormField label="Mobile Number" required>
                <Input
                  className="h-10 text-[13px]"
                  type="tel"
                  value={form.mobileNumber}
                  onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                />
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                className="min-w-[100px] bg-[#0a2e67] hover:bg-[#082653]"
                disabled={saving}
                onClick={() => void handleAdd()}
              >
                {saving ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            className="min-w-[120px] bg-amber-400 text-slate-900 hover:bg-amber-500 border-0 shadow-sm"
            asChild
          >
            <Link href="/user-management/parent-accounts">Back</Link>
          </Button>
        </div>
      </div>
    </FilteredPage>
  )
}
