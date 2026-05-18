'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Computer, Home } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GM_CODES } from '@/config/constants/ui'
import { toastError } from '@/lib/toast'
import {
  fetchStudentDetail,
  listAcademicYearsForReadmissionWithProcFallback,
  listActiveCollegesForStudentEdit,
  listBatchesByCourse,
  listCourseGroups,
  listCourseYearsByCourse,
  listCoursesByUniversity,
  listGeneralDetailsByCode,
  listRegulationsByCourse,
  normalizeStudentRow,
} from '@/services'

type AnyRow = Record<string, unknown>

const STEPS = [
  { id: 'office', label: 'Office Use' },
  { id: 'personal', label: 'Personal Info' },
  { id: 'education', label: 'Educational Record' },
  { id: 'activities', label: 'Activities' },
  { id: 'certificates', label: 'Certificates' },
] as const

type StepId = (typeof STEPS)[number]['id']

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function selectOptions(rows: AnyRow[], valueKeys: string[], labelKeys: string[]) {
  return rows.map((row) => ({
    value: String(num(row, valueKeys)),
    label: txt(row, labelKeys) || String(num(row, valueKeys)),
  }))
}

export function EditStudentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = useMemo(() => Number(searchParams.get('studentId') ?? 0), [searchParams])
  const checkMode = useMemo(() => Number(searchParams.get('check') ?? 1), [searchParams])

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<AnyRow | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const hydratedRef = useRef(false)

  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [batches, setBatches] = useState<AnyRow[]>([])
  const [quotas, setQuotas] = useState<AnyRow[]>([])
  const [studentTypes, setStudentTypes] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [courseYearId, setCourseYearId] = useState<string | null>(null)
  const [quotaId, setQuotaId] = useState<string | null>(null)
  const [regulationId, setRegulationId] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [studentTypeId, setStudentTypeId] = useState<string | null>(null)
  const [applicationNumber, setApplicationNumber] = useState('')
  const [refApplicationNo, setRefApplicationNo] = useState('')
  const [receiptNo, setReceiptNo] = useState('')
  const [admissionDate, setAdmissionDate] = useState<Date | null>(null)
  const [registrationDate, setRegistrationDate] = useState<Date | null>(null)
  const [isLateral, setIsLateral] = useState(false)

  const activeStep = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  const universityId = useMemo(() => {
    const cid = Number(collegeId ?? 0)
    const college = colleges.find((c) => num(c, ['collegeId', 'fk_college_id']) === cid)
    return num(college, ['universityId', 'fk_university_id'])
  }, [colleges, collegeId])

  const applyStudentToForm = useCallback((row: AnyRow) => {
    setCollegeId(String(num(row, ['collegeId', 'fk_college_id']) || '') || null)
    setAcademicYearId(String(num(row, ['academicYearId', 'fk_academic_year_id']) || '') || null)
    setCourseId(String(num(row, ['courseId', 'fk_course_id']) || '') || null)
    setCourseGroupId(String(num(row, ['courseGroupId', 'fk_course_group_id']) || '') || null)
    setCourseYearId(String(num(row, ['courseYearId', 'fk_course_year_id']) || '') || null)
    setQuotaId(String(num(row, ['quotaId', 'fk_quota_id']) || '') || null)
    setRegulationId(String(num(row, ['regulationId', 'fk_regulation_id']) || '') || null)
    setBatchId(String(num(row, ['batchId', 'fk_batch_id']) || '') || null)
    setStudentTypeId(String(num(row, ['studentTypeId', 'fk_student_type_id']) || '') || null)
    setApplicationNumber(txt(row, ['applicationNumber', 'applicationNo', 'application_no']))
    setRefApplicationNo(txt(row, ['refApplicationNo', 'ref_application_no', 'referenceApplicationNumber']))
    setReceiptNo(txt(row, ['receiptNo', 'receipt_no', 'receiptNumber']))
    setAdmissionDate(parseDate(row.adminssionDate ?? row.admissionDate ?? row.admission_date))
    setRegistrationDate(parseDate(row.dateOfRegistration ?? row.date_of_registration))
    setIsLateral(Boolean(row.isLateral ?? row.is_lateral))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!studentId) {
        setStudent(null)
        setLoading(false)
        toastError(new Error('Missing student id'), 'Edit Student')
        return
      }
      setLoading(true)
      hydratedRef.current = false
      try {
        const [detail, collegeRows, quotaRows, typeRows] = await Promise.all([
          fetchStudentDetail(studentId, { check: checkMode }),
          listActiveCollegesForStudentEdit(),
          listGeneralDetailsByCode(GM_CODES.QUOTA),
          listGeneralDetailsByCode(GM_CODES.STUDENT_TYPE),
        ])
        if (cancelled) return
        setColleges(collegeRows)
        setQuotas(quotaRows)
        setStudentTypes(typeRows)
        if (!detail) {
          setStudent(null)
          toastError(new Error('Student not found'), 'Edit Student')
          return
        }
        const merged = normalizeStudentRow({ ...detail, profileStudentId: studentId })
        setStudent(merged)
        applyStudentToForm(merged)
        hydratedRef.current = true
      } catch (e) {
        if (!cancelled) {
          setStudent(null)
          toastError(e, 'Failed to load student')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [studentId, checkMode, applyStudentToForm])

  useEffect(() => {
    if (!universityId) {
      setAcademicYears([])
      return
    }
    let cancelled = false
    void listAcademicYearsForReadmissionWithProcFallback(universityId, Number(collegeId ?? 0), 0, 0).then((rows) => {
      if (!cancelled) setAcademicYears(rows)
    })
    return () => {
      cancelled = true
    }
  }, [universityId, collegeId])

  useEffect(() => {
    if (!universityId) {
      setCourses([])
      return
    }
    let cancelled = false
    void listCoursesByUniversity(universityId).then((rows) => {
      if (!cancelled) setCourses(rows)
    })
    return () => {
      cancelled = true
    }
  }, [universityId])

  useEffect(() => {
    const cid = Number(courseId ?? 0)
    if (!cid) {
      setCourseGroups([])
      setBatches([])
      setRegulations([])
      return
    }
    let cancelled = false
    void Promise.all([listCourseGroups(cid), listBatchesByCourse(cid), listRegulationsByCourse(cid)]).then(
      ([groups, batchRows, regRows]) => {
        if (cancelled) return
        setCourseGroups(groups)
        setBatches(batchRows)
        setRegulations(regRows)
      },
    )
    return () => {
      cancelled = true
    }
  }, [courseId])

  useEffect(() => {
    const cid = Number(courseId ?? 0)
    if (!cid) {
      setCourseYears([])
      return
    }
    let cancelled = false
    void listCourseYearsByCourse(cid).then((rows) => {
      if (!cancelled) setCourseYears(rows)
    })
    return () => {
      cancelled = true
    }
  }, [courseId])

  function onCollegeChange(value: string | null) {
    setCollegeId(value)
    if (!hydratedRef.current) return
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setRegulationId(null)
    setBatchId(null)
  }

  function onCourseChange(value: string | null) {
    setCourseId(value)
    if (!hydratedRef.current) return
    setCourseGroupId(null)
    setCourseYearId(null)
    setRegulationId(null)
    setBatchId(null)
  }

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1)
      return
    }
    router.push('/admin-student-information-system/students-list')
  }

  function goNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1)
  }

  if (loading) {
    return (
      <PageContainer className="pb-8">
        <p className="text-sm text-slate-600 px-1 py-6">Loading student…</p>
      </PageContainer>
    )
  }

  if (!student) {
    return (
      <PageContainer className="pb-8">
        <p className="text-sm text-slate-700 px-1 py-6">Student not found.</p>
        <Link
          href="/admin-student-information-system/students-list"
          className="text-[13px] text-[#45b3a2] hover:underline px-1"
        >
          Back to Students Search
        </Link>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="pb-8">
      <nav className="mb-3 flex flex-wrap items-center gap-1 text-[12px] text-slate-500">
        <Link href="/dashboard" className="inline-flex items-center hover:text-slate-700">
          <Home className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <span>/</span>
        <span>Student</span>
        <span>/</span>
        <span className="text-slate-800">Edit Student</span>
      </nav>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-[#1976d2] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="border-b border-slate-200 px-2 pt-3">
          <div className="flex flex-wrap">
            {STEPS.map((step, index) => {
              const active = index === stepIndex
              const done = index < stepIndex
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`flex min-w-[120px] flex-1 flex-col items-center gap-1 border-b-2 px-3 pb-3 pt-1 text-center transition-colors ${
                    active ? 'border-[#1976d2] text-[#1976d2]' : done ? 'border-transparent text-slate-600' : 'border-transparent text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                      active ? 'bg-[#1976d2] text-white' : done ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[11px] font-medium leading-tight">{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t-4 border-[#1976d2] p-5 md:p-6">
          {activeStep.id === 'office' ? (
            <OfficeUseStep
              collegeId={collegeId}
              academicYearId={academicYearId}
              courseId={courseId}
              courseGroupId={courseGroupId}
              courseYearId={courseYearId}
              quotaId={quotaId}
              regulationId={regulationId}
              batchId={batchId}
              studentTypeId={studentTypeId}
              applicationNumber={applicationNumber}
              refApplicationNo={refApplicationNo}
              receiptNo={receiptNo}
              admissionDate={admissionDate}
              registrationDate={registrationDate}
              isLateral={isLateral}
              colleges={colleges}
              academicYears={academicYears}
              courses={courses}
              courseGroups={courseGroups}
              courseYears={courseYears}
              regulations={regulations}
              batches={batches}
              quotas={quotas}
              studentTypes={studentTypes}
              onCollegeChange={onCollegeChange}
              onAcademicYearChange={setAcademicYearId}
              onCourseChange={onCourseChange}
              onCourseGroupChange={setCourseGroupId}
              onCourseYearChange={setCourseYearId}
              onQuotaChange={setQuotaId}
              onRegulationChange={setRegulationId}
              onBatchChange={setBatchId}
              onStudentTypeChange={setStudentTypeId}
              onApplicationNumberChange={setApplicationNumber}
              onRefApplicationNoChange={setRefApplicationNo}
              onReceiptNoChange={setReceiptNo}
              onAdmissionDateChange={setAdmissionDate}
              onRegistrationDateChange={setRegistrationDate}
              onIsLateralChange={setIsLateral}
            />
          ) : (
            <PlaceholderStep step={activeStep.label} studentName={txt(student, ['firstName', 'studentName'])} />
          )}

          <div className="mt-8 flex justify-end gap-2">
            <Button type="button" variant="outline" className="min-w-[88px] bg-[#fdd835] hover:bg-[#fbc02d] border-[#fdd835] text-slate-900" onClick={goBack}>
              Back
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button type="button" className="min-w-[88px] bg-[#0d47a1] hover:bg-[#1565c0]" onClick={goNext}>
                Next
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}

type OfficeUseStepProps = {
  collegeId: string | null
  academicYearId: string | null
  courseId: string | null
  courseGroupId: string | null
  courseYearId: string | null
  quotaId: string | null
  regulationId: string | null
  batchId: string | null
  studentTypeId: string | null
  applicationNumber: string
  refApplicationNo: string
  receiptNo: string
  admissionDate: Date | null
  registrationDate: Date | null
  isLateral: boolean
  colleges: AnyRow[]
  academicYears: AnyRow[]
  courses: AnyRow[]
  courseGroups: AnyRow[]
  courseYears: AnyRow[]
  regulations: AnyRow[]
  batches: AnyRow[]
  quotas: AnyRow[]
  studentTypes: AnyRow[]
  onCollegeChange: (v: string | null) => void
  onAcademicYearChange: (v: string | null) => void
  onCourseChange: (v: string | null) => void
  onCourseGroupChange: (v: string | null) => void
  onCourseYearChange: (v: string | null) => void
  onQuotaChange: (v: string | null) => void
  onRegulationChange: (v: string | null) => void
  onBatchChange: (v: string | null) => void
  onStudentTypeChange: (v: string | null) => void
  onApplicationNumberChange: (v: string) => void
  onRefApplicationNoChange: (v: string) => void
  onReceiptNoChange: (v: string) => void
  onAdmissionDateChange: (v: Date | null) => void
  onRegistrationDateChange: (v: Date | null) => void
  onIsLateralChange: (v: boolean) => void
}

function OfficeUseStep(props: OfficeUseStepProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[#1976d2]">
        <Computer className="h-5 w-5" aria-hidden />
        <h2 className="text-[15px] font-semibold">For Office Use Only</h2>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-slate-800 mb-3">
          Select Class Hierarchy <span className="text-red-600">*</span>
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="College"
            required
            value={props.collegeId}
            onChange={props.onCollegeChange}
            options={selectOptions(props.colleges, ['collegeId', 'fk_college_id'], ['collegeCode', 'collegeName'])}
            searchable
          />
          <Select
            label="Academic Year"
            required
            value={props.academicYearId}
            onChange={props.onAcademicYearChange}
            options={selectOptions(props.academicYears, ['academicYearId', 'fk_academic_year_id'], ['academicYear', 'academic_year'])}
            searchable
          />
          <Select
            label="Course"
            required
            value={props.courseId}
            onChange={props.onCourseChange}
            options={selectOptions(props.courses, ['courseId', 'fk_course_id'], ['courseCode', 'courseName'])}
            searchable
            disabled={!props.collegeId}
          />
          <Select
            label="Course Group"
            required
            value={props.courseGroupId}
            onChange={props.onCourseGroupChange}
            options={selectOptions(props.courseGroups, ['courseGroupId', 'fk_course_group_id'], ['groupCode', 'groupName'])}
            searchable
            disabled={!props.courseId}
          />
          <Select
            label="Course Year"
            required
            value={props.courseYearId}
            onChange={props.onCourseYearChange}
            options={selectOptions(props.courseYears, ['courseYearId', 'fk_course_year_id'], ['courseYearName', 'course_year_name'])}
            searchable
            disabled={!props.courseId}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Quota"
          value={props.quotaId}
          onChange={props.onQuotaChange}
          options={selectOptions(props.quotas, ['generalDetailId', 'fk_general_detail_id'], ['generalDetailDisplayName', 'displayName'])}
          searchable
          clearable
        />
        <Select
          label="Regulation"
          value={props.regulationId}
          onChange={props.onRegulationChange}
          options={selectOptions(props.regulations, ['regulationId', 'fk_regulation_id'], ['regulationName', 'regulationCode'])}
          searchable
          clearable
          disabled={!props.courseId}
        />
        <Select
          label="Batch"
          value={props.batchId}
          onChange={props.onBatchChange}
          options={selectOptions(props.batches, ['batchId', 'fk_batch_id'], ['batchName', 'batch_code'])}
          searchable
          clearable
          disabled={!props.courseId}
        />
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Application Number</Label>
          <Input value={props.applicationNumber} onChange={(e) => props.onApplicationNumberChange(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Reference Application Number</Label>
          <Input value={props.refApplicationNo} onChange={(e) => props.onRefApplicationNoChange(e.target.value)} className="h-9" />
        </div>
        <DatePicker label="Admission Date" value={props.admissionDate} onChange={props.onAdmissionDateChange} />
        <DatePicker label="Date Of Registration" value={props.registrationDate} onChange={props.onRegistrationDateChange} />
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-slate-700">Receipt Number</Label>
          <Input value={props.receiptNo} onChange={(e) => props.onReceiptNoChange(e.target.value)} className="h-9" />
        </div>
        <Select
          label="Student Types"
          value={props.studentTypeId}
          onChange={props.onStudentTypeChange}
          options={selectOptions(props.studentTypes, ['generalDetailId', 'fk_general_detail_id'], ['generalDetailDisplayName', 'displayName'])}
          searchable
          clearable
        />
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
            <Checkbox checked={props.isLateral} onCheckedChange={(v) => props.onIsLateralChange(v === true)} />
            Is Lateral
          </label>
        </div>
      </div>
    </div>
  )
}

function PlaceholderStep({ step, studentName }: { step: string; studentName: string }) {
  return (
    <div className="py-8 text-center text-slate-600">
      <p className="text-[15px] font-semibold text-slate-800">{step}</p>
      <p className="mt-2 text-[13px]">
        {studentName ? `Editing ${studentName} — ` : ''}
        this step will be migrated in a follow-up. Use Office Use to update class hierarchy for now.
      </p>
    </div>
  )
}
