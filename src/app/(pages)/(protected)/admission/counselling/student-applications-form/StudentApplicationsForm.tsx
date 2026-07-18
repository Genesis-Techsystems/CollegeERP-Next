'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  School,
  Trash2,
  User,
} from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { toDateOnlyISO } from '@/common/generic-functions'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ADMISSION_API, STUDENT_API } from '@/config/constants/api'
import { GM_CODES } from '@/config/constants/ui'
import { useSessionContext } from '@/context/SessionContext'
import { cn } from '@/lib/utils'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  listActiveCollegesForGeneralSettings,
  listCastes,
  listCitiesByDistrict,
  listCollegeWiseCourses,
  listCountries,
  listDistrictsByState,
  listGeneralDetailsByCode,
  listStatesByCountry,
  listSubCastesByCasteId,
  listWorkflowStages,
  postDetailsEnvelope,
  uploadFile,
} from '@/services'
import type { WorkflowStage } from '@/types/workflow-stage'

const PHONE_REGEX = /^[6-9]\d{9}$/
const ALPHA_REGEX = /^[a-zA-Z0-9\s]+$/
const AADHAR_REGEX = /^\d{12}$/
const DEFAULT_PHOTO = '/assets/images/avatars/default_Student.png'
const DEFAULT_MOTHER_PHOTO = '/assets/images/avatars/female_icon.png'

const STEPS = [
  { id: 'personal', label: 'Personal Info', progress: 40 },
  { id: 'education', label: 'Educational Record', progress: 60 },
] as const

type StepId = (typeof STEPS)[number]['id']

type AnyRow = Record<string, unknown>

type EducationRow = {
  nameOfInstitution: string
  board: string
  address: string
  majorSubjects: string
  medium: string
  gradeClassSecured: string
  yearOfCompletion: string
  precentage: string
  isHighestQualification: string
  isActive: boolean
}

type CreateAppResult = {
  studentAppId?: number
  applicationNo?: string
  admissionNumber?: string
  admissionId?: number | null
  studentAppDocCollectionDTO?: Array<{
    appDocCollId?: string | number
    documentRepositoryId?: number
    isSoftCopy?: boolean
    path?: File | null
  }>
}

const optionalId = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}, z.number().optional())

const requiredId = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}, z.number({ error: 'Required' }).min(1, 'Required'))

function calcAge(date: Date | null | undefined): number {
  if (!date || Number.isNaN(date.getTime())) return 0
  const today = new Date()
  let years = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) years -= 1
  return years
}

function emptyEducation(): EducationRow {
  return {
    nameOfInstitution: '',
    board: '',
    address: '',
    majorSubjects: '',
    medium: '',
    gradeClassSecured: '',
    yearOfCompletion: '',
    precentage: '',
    isHighestQualification: '',
    isActive: true,
  }
}

function gdOptions(rows: AnyRow[]): SelectOption[] {
  return rows.map((r) => ({
    value: String(r.generalDetailId ?? ''),
    label: String(
      r.generalDetailDisplayName ?? r.generalDetailName ?? r.generalDetailCode ?? r.generalDetailId ?? '',
    ),
  }))
}

function pickNum(row: AnyRow, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = row[key]
    if (v != null && v !== '') {
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return undefined
}

function pickText(row: AnyRow, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

const schema = z.object({
  collegeId: requiredId,
  courseId: requiredId,
  applicationNo: z.string().min(1, 'Application number is required'),
  dateOfRegistration: z.date({ error: 'Date of registration is required' }),
  isEligibleforreservation: z.boolean(),
  titleId: optionalId,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  middleName: z.string().optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  genderCatDetId: optionalId,
  dateOfBirth: z
    .date({ error: 'Date of birth is required' })
    .refine((d) => calcAge(d) >= 15, 'Age should be more than 15 years'),
  age: z.number().optional(),
  sscNo: z
    .string()
    .min(1, 'SSC number is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  disabilityCatdetId: optionalId,
  entranceCatdetId: requiredId,
  entranceRank: z
    .string()
    .min(1, 'Qualified rank is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  entranceHtNo: z
    .string()
    .min(1, 'Hall ticket number is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  identificationMarks: z.string().min(1, 'Identification marks are required'),
  mobile: z.string().min(1, 'Mobile is required').regex(PHONE_REGEX, 'Enter a valid 10-digit mobile'),
  stdEmailId: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
  nationalityCatdetId: optionalId,
  religionCatdetId: optionalId,
  casteId: requiredId,
  subCasteId: optionalId,
  aadharCardNo: z
    .string()
    .min(1, 'Aadhar number is required')
    .regex(AADHAR_REGEX, 'Enter a valid 12-digit Aadhar number'),
  fatherName: z
    .string()
    .min(1, 'Father name is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  fatherOccupation: z.string().optional(),
  fatherQualification: z.string().optional(),
  fathersIncomePa: z.string().min(1, 'Father annual income is required'),
  fatherMobileNo: z
    .string()
    .min(1, 'Father mobile is required')
    .regex(PHONE_REGEX, 'Enter a valid 10-digit mobile'),
  fatherEmailId: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
  fatherAddress: z.string().optional(),
  isgovtempFather: z.boolean(),
  spouseName: z.string().optional(),
  spouseIncomePa: z.string().optional(),
  spouseMobileNo: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_REGEX.test(v), 'Enter a valid 10-digit mobile'),
  spouseEmailId: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
  spouseAddress: z.string().optional(),
  isgovtempSpouse: z.boolean().optional(),
  motherName: z
    .string()
    .optional()
    .refine((v) => !v || ALPHA_REGEX.test(v), 'Use letters and numbers only'),
  motherOccupation: z.string().optional(),
  motherQualification: z.string().optional(),
  motherIncomePa: z.string().optional(),
  motherMobileNo: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_REGEX.test(v), 'Enter a valid 10-digit mobile'),
  motherEmailId: z
    .string()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
  motherAddress: z.string().optional(),
  isgovtempMother: z.boolean(),
  permanentAddress: z.string().min(1, 'Permanent address is required'),
  permanentMandal: z.string().optional(),
  permanentPincode: z.string().optional(),
  permanentStreet: z.string().optional(),
  presentAddress: z.string().optional(),
  presentMandal: z.string().optional(),
  presentPincode: z.string().optional(),
  presentStreetName: z.string().optional(),
  presentCountryId: optionalId,
  presentStateId: optionalId,
  districtPresentId: optionalId,
  cityPresentId: requiredId,
  permanentCountryId: optionalId,
  permanentStateId: optionalId,
  districtPermanentId: optionalId,
  cityPermenentId: requiredId,
  toAppWorkflowStatusId: requiredId,
  statusComments: z.string().optional(),
  isActive: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

const PERSONAL_FIELDS: (keyof FormValues)[] = [
  'collegeId',
  'courseId',
  'applicationNo',
  'dateOfRegistration',
  'firstName',
  'lastName',
  'dateOfBirth',
  'sscNo',
  'entranceCatdetId',
  'entranceRank',
  'entranceHtNo',
  'identificationMarks',
  'mobile',
  'stdEmailId',
  'casteId',
  'aadharCardNo',
  'fatherName',
  'fathersIncomePa',
  'fatherMobileNo',
  'fatherEmailId',
  'motherName',
  'motherMobileNo',
  'motherEmailId',
  'spouseMobileNo',
  'spouseEmailId',
  'permanentAddress',
  'cityPermenentId',
  'cityPresentId',
]

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof User
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 bg-sky-50/60 px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span>{title}</span>
      </div>
      {action}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function PhotoUpload({
  src,
  fallback,
  label,
  onFile,
}: {
  src: string
  fallback: string
  label: string
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <button
        type="button"
        className="rounded border border-sky-200 bg-white p-0.5 shadow-sm"
        onClick={() => inputRef.current?.click()}
      >
        <img
          src={src || fallback}
          alt=""
          className="h-20 w-20 cursor-pointer rounded object-cover"
          onError={(e) => {
            const img = e.currentTarget
            if (img.src !== fallback) img.src = fallback
          }}
        />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />
    </div>
  )
}

export function StudentApplicationsForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()
  const today = useMemo(() => new Date(), [])

  const [step, setStep] = useState<StepId>('personal')
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const [educationList, setEducationList] = useState<EducationRow[]>([emptyEducation()])
  const [mastersLoaded, setMastersLoaded] = useState(false)

  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [titles, setTitles] = useState<AnyRow[]>([])
  const [genders, setGenders] = useState<AnyRow[]>([])
  const [qualifyingExamTypes, setQualifyingExamTypes] = useState<AnyRow[]>([])
  const [nationalities, setNationalities] = useState<AnyRow[]>([])
  const [religions, setReligions] = useState<AnyRow[]>([])
  const [disabilities, setDisabilities] = useState<AnyRow[]>([])
  const [castes, setCastes] = useState<AnyRow[]>([])
  const [subCastes, setSubCastes] = useState<AnyRow[]>([])
  const [countries, setCountries] = useState<AnyRow[]>([])
  const [presentStates, setPresentStates] = useState<AnyRow[]>([])
  const [presentDistricts, setPresentDistricts] = useState<AnyRow[]>([])
  const [presentCities, setPresentCities] = useState<AnyRow[]>([])
  const [permStates, setPermStates] = useState<AnyRow[]>([])
  const [permDistricts, setPermDistricts] = useState<AnyRow[]>([])
  const [permCities, setPermCities] = useState<AnyRow[]>([])
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([])

  const studentPhotoRef = useRef<File | null>(null)
  const fatherPhotoRef = useRef<File | null>(null)
  const motherPhotoRef = useRef<File | null>(null)
  const [studentPhotoUrl, setStudentPhotoUrl] = useState('')
  const [fatherPhotoUrl, setFatherPhotoUrl] = useState('')
  const [motherPhotoUrl, setMotherPhotoUrl] = useState('')

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      dateOfRegistration: today,
      dateOfBirth: today,
      age: calcAge(today),
      isEligibleforreservation: false,
      isgovtempFather: false,
      isgovtempMother: false,
      isgovtempSpouse: false,
      isActive: true,
      firstName: '',
      middleName: '',
      lastName: '',
      applicationNo: '',
      sscNo: '',
      entranceRank: '',
      entranceHtNo: '',
      identificationMarks: '',
      mobile: '',
      stdEmailId: '',
      aadharCardNo: '',
      fatherName: '',
      fathersIncomePa: '',
      fatherMobileNo: '',
      permanentAddress: '',
    },
  })

  const collegeId = watch('collegeId')
  const courseId = watch('courseId')
  const casteId = watch('casteId')
  const dateOfBirth = watch('dateOfBirth')
  const permanentCountryId = watch('permanentCountryId')
  const permanentStateId = watch('permanentStateId')
  const districtPermanentId = watch('districtPermanentId')
  const presentCountryId = watch('presentCountryId')
  const presentStateId = watch('presentStateId')
  const districtPresentId = watch('districtPresentId')

  const progress = STEPS.find((s) => s.id === step)?.progress ?? 40

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(pickNum(c, 'collegeId') ?? ''),
        label: pickText(c, 'collegeCode', 'collegeName') || String(pickNum(c, 'collegeId') ?? ''),
      })),
    [colleges],
  )

  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(pickNum(c, 'courseId') ?? ''),
        label: pickText(c, 'courseCode', 'courseName') || String(pickNum(c, 'courseId') ?? ''),
      })),
    [courses],
  )

  const casteOptions = useMemo(
    () =>
      castes.map((c) => ({
        value: String(pickNum(c, 'casteId') ?? ''),
        label: pickText(c, 'caste', 'casteName') || String(pickNum(c, 'casteId') ?? ''),
      })),
    [castes],
  )

  const subCasteOptions = useMemo(
    () =>
      subCastes.map((c) => ({
        value: String(pickNum(c, 'subCasteId') ?? ''),
        label: pickText(c, 'subCaste', 'subCasteName') || String(pickNum(c, 'subCasteId') ?? ''),
      })),
    [subCastes],
  )

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: String(pickNum(c, 'countryId') ?? ''),
        label: pickText(c, 'countryName') || String(pickNum(c, 'countryId') ?? ''),
      })),
    [countries],
  )

  const workflowOptions = useMemo(
    () =>
      workflowStages.map((w) => ({
        value: String(w.workflowStageId),
        label: w.wfName || String(w.workflowStageId),
      })),
    [workflowStages],
  )

  const loadMasters = useCallback(async () => {
    if (mastersLoaded) return
    try {
      const [
        countryRows,
        genderRows,
        qualifyRows,
        nationalityRows,
        religionRows,
        titleRows,
        disabilityRows,
        casteRows,
      ] = await Promise.all([
        listCountries(),
        listGeneralDetailsByCode(GM_CODES.GENDER),
        listGeneralDetailsByCode(GM_CODES.QUALIFY_EXAM_TYPE),
        listGeneralDetailsByCode(GM_CODES.NATIONALITY),
        listGeneralDetailsByCode(GM_CODES.RELIGION),
        listGeneralDetailsByCode(GM_CODES.TITLE),
        listGeneralDetailsByCode(GM_CODES.DISABILITY),
        listCastes(),
      ])
      setCountries(countryRows as unknown as AnyRow[])
      setGenders(genderRows)
      setQualifyingExamTypes(qualifyRows)
      setNationalities(nationalityRows)
      setReligions(religionRows)
      setTitles(titleRows)
      setDisabilities(disabilityRows)
      setCastes(
        (casteRows as unknown as AnyRow[]).filter((c) => c.isActive !== false),
      )
      setMastersLoaded(true)
    } catch (err) {
      toastError(err)
    }
  }, [mastersLoaded])

  const loadCoursesAndWorkflow = useCallback(async (id: number) => {
    setCourses([])
    setWorkflowStages([])
    if (!id) return
    try {
      const [courseRows, stages] = await Promise.all([
        listCollegeWiseCourses(id),
        listWorkflowStages(),
      ])
      setCourses(courseRows)
      setWorkflowStages(
        stages.filter(
          (s) =>
            s.isActive &&
            s.wfForCode === GM_CODES.STD_APP_WF &&
            Number(s.collegeId) === id,
        ),
      )
    } catch (err) {
      toastError(err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await listActiveCollegesForGeneralSettings()
        if (cancelled) return
        setColleges(rows as unknown as AnyRow[])
        const qCollege = Number(searchParams.get('collegeId') || 0)
        const firstId =
          qCollege ||
          pickNum(rows[0] as unknown as AnyRow, 'collegeId') ||
          0
        if (firstId) {
          setValue('collegeId', firstId)
          await loadCoursesAndWorkflow(firstId)
        }
        const qCourse = Number(searchParams.get('courseId') || 0)
        if (qCourse) setValue('courseId', qCourse)
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadCoursesAndWorkflow, searchParams, setValue])

  useEffect(() => {
    setValue('age', calcAge(dateOfBirth))
  }, [dateOfBirth, setValue])

  useEffect(() => {
    if (courseId) void loadMasters()
  }, [courseId, loadMasters])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setSubCastes([])
      if (!casteId) return
      try {
        const rows = await listSubCastesByCasteId(casteId)
        if (!cancelled) setSubCastes(rows)
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [casteId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPermStates([])
      setPermDistricts([])
      setPermCities([])
      if (!permanentCountryId) return
      try {
        const rows = await listStatesByCountry(permanentCountryId)
        if (!cancelled) setPermStates(rows as unknown as AnyRow[])
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [permanentCountryId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPermDistricts([])
      setPermCities([])
      if (!permanentStateId) return
      try {
        const rows = await listDistrictsByState(permanentStateId)
        if (!cancelled) setPermDistricts(rows as unknown as AnyRow[])
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [permanentStateId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPermCities([])
      if (!districtPermanentId) return
      try {
        const rows = await listCitiesByDistrict(districtPermanentId)
        if (!cancelled) setPermCities(rows as unknown as AnyRow[])
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [districtPermanentId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPresentStates([])
      setPresentDistricts([])
      setPresentCities([])
      if (!presentCountryId) return
      try {
        const rows = await listStatesByCountry(presentCountryId)
        if (!cancelled) setPresentStates(rows as unknown as AnyRow[])
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [presentCountryId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPresentDistricts([])
      setPresentCities([])
      if (!presentStateId) return
      try {
        const rows = await listDistrictsByState(presentStateId)
        if (!cancelled) setPresentDistricts(rows as unknown as AnyRow[])
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [presentStateId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPresentCities([])
      if (!districtPresentId) return
      try {
        const rows = await listCitiesByDistrict(districtPresentId)
        if (!cancelled) setPresentCities(rows as unknown as AnyRow[])
      } catch (err) {
        toastError(err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [districtPresentId])

  const onCollegeChange = async (value: string | null) => {
    const id = value ? Number(value) : undefined
    setValue('collegeId', id as number)
    setValue('courseId', undefined as unknown as number)
    setValue('toAppWorkflowStatusId', undefined as unknown as number)
    if (id) await loadCoursesAndWorkflow(id)
  }

  const onCourseChange = async (value: string | null) => {
    const id = value ? Number(value) : undefined
    setValue('courseId', id as number)
    if (id) await loadMasters()
  }

  const toggleSameAddress = () => {
    const next = !sameAsPermanent
    setSameAsPermanent(next)
    if (next) {
      const v = getValues()
      void loadMasters()
      setValue('presentAddress', v.permanentAddress ?? '')
      setValue('presentCountryId', v.permanentCountryId)
      setValue('presentStateId', v.permanentStateId)
      setValue('districtPresentId', v.districtPermanentId)
      setValue('cityPresentId', v.cityPermenentId)
      setValue('presentStreetName', v.permanentStreet ?? '')
      setValue('presentMandal', v.permanentMandal ?? '')
      setValue('presentPincode', v.permanentPincode ?? '')
    } else {
      setValue('presentAddress', '')
      setValue('presentCountryId', undefined)
      setValue('presentStateId', undefined)
      setValue('districtPresentId', undefined)
      setValue('cityPresentId', undefined as unknown as number)
      setValue('presentStreetName', '')
      setValue('presentMandal', '')
      setValue('presentPincode', '')
    }
  }

  const goNext = async () => {
    const ok = await trigger(PERSONAL_FIELDS)
    if (!ok) {
      toastInfo('Please fill required personal details')
      return
    }
    setStep('education')
  }

  const goBack = () => {
    const qCollege = searchParams.get('collegeId')
    const qAy = searchParams.get('academicYearId')
    const qCourse = searchParams.get('courseId')
    if (qCollege || qAy || qCourse) {
      const qs = new URLSearchParams()
      if (qCollege) qs.set('collegeId', qCollege)
      if (qAy) qs.set('academicYearId', qAy)
      if (qCourse) qs.set('courseId', qCourse)
      router.push(`/admission/counselling/student-applications?${qs.toString()}`)
      return
    }
    router.back()
  }

  const onSubmit = async (values: FormValues) => {
    try {
      const organizationId =
        user?.organizationId ??
        (typeof window !== 'undefined'
          ? Number(window.localStorage.getItem('organizationId') || 0)
          : 0)
      const orgCode =
        user?.organizationCode ??
        (typeof window !== 'undefined' ? window.localStorage.getItem('orgCode') ?? '' : '')
      const selectedCollege = colleges.find(
        (c) => pickNum(c, 'collegeId') === values.collegeId,
      )
      const collegeCode =
        user?.collegeCode ||
        pickText(selectedCollege ?? {}, 'collegeCode') ||
        (typeof window !== 'undefined' ? window.localStorage.getItem('collegeCode') ?? '' : '')

      const payload: Record<string, unknown> = {
        ...values,
        titleCatDetId: values.titleId,
        dateOfRegistration: toDateOnlyISO(values.dateOfRegistration),
        dateOfBirth: toDateOnlyISO(values.dateOfBirth),
        isActive: true,
        organizationId: organizationId || undefined,
        univStdAppEducationDTOS: educationList.filter((e) => e.isActive),
      }
      delete payload.age

      const result = await postDetailsEnvelope<CreateAppResult>(
        ADMISSION_API.UNIV_STUDENT_APPLICATION,
        payload,
      )

      if (result.statusCode !== 200) {
        toastError(result.message || 'Failed to save application')
        return
      }
      if (!result.success) {
        toastInfo(result.message || 'Application not saved')
        return
      }

      const data = result.data
      if (data?.studentAppId) {
        toastSuccess(result.message || 'Application saved')

        const formData = new FormData()
        formData.append('orgCode', orgCode)
        formData.append('collegeCode', collegeCode)
        formData.append('applicationId', String(data.studentAppId))
        formData.append('applicationNo', String(data.applicationNo ?? values.applicationNo))
        formData.append('admissionNumber', String(data.admissionNumber ?? ''))
        if (data.admissionId != null) {
          formData.append('admissionId', String(data.admissionId))
        }

        let hasFile = false
        if (studentPhotoRef.current) {
          formData.append('studentPhoto', studentPhotoRef.current, studentPhotoRef.current.name)
          hasFile = true
        }
        if (fatherPhotoRef.current) {
          formData.append('fatherPhoto', fatherPhotoRef.current, fatherPhotoRef.current.name)
          hasFile = true
        }
        if (motherPhotoRef.current) {
          formData.append('motherPhoto', motherPhotoRef.current, motherPhotoRef.current.name)
          hasFile = true
        }

        if (hasFile) {
          await uploadFile(STUDENT_API.UPLOAD_PHOTOS, formData)
          toastSuccess('Photos uploaded')
        }
      } else {
        toastSuccess(result.message || 'Application saved')
      }

      const qs = new URLSearchParams()
      if (values.collegeId) qs.set('collegeId', String(values.collegeId))
      if (values.courseId) qs.set('courseId', String(values.courseId))
      const ay = searchParams.get('academicYearId')
      if (ay) qs.set('academicYearId', ay)
      router.push(
        `/admission/counselling/student-applications${qs.toString() ? `?${qs}` : ''}`,
      )
    } catch (err) {
      toastError(err)
    }
  }

  const stateOptions = (rows: AnyRow[]) =>
    rows.map((r) => ({
      value: String(pickNum(r, 'stateId') ?? ''),
      label: pickText(r, 'stateName') || String(pickNum(r, 'stateId') ?? ''),
    }))

  const districtOptions = (rows: AnyRow[]) =>
    rows.map((r) => ({
      value: String(pickNum(r, 'districtId') ?? ''),
      label: pickText(r, 'districtName') || String(pickNum(r, 'districtId') ?? ''),
    }))

  const cityOptions = (rows: AnyRow[]) =>
    rows.map((r) => ({
      value: String(pickNum(r, 'cityId') ?? ''),
      label: pickText(r, 'cityName') || String(pickNum(r, 'cityId') ?? ''),
    }))

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="College *">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ''}
              onChange={(v) => void onCollegeChange(v)}
              options={collegeOptions}
              placeholder="College"
              searchable
            />
          )}
        />
        <FieldError message={errors.collegeId?.message} />
      </GlobalFilterField>
      <GlobalFilterField label="Course *">
        <Controller
          name="courseId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : ''}
              onChange={(v) => void onCourseChange(v)}
              options={courseOptions}
              placeholder="Course"
              searchable
            />
          )}
        />
        <FieldError message={errors.courseId?.message} />
      </GlobalFilterField>
      <GlobalFilterField label="Application Number *">
        <Input {...register('applicationNo')} />
        <FieldError message={errors.applicationNo?.message} />
      </GlobalFilterField>
      <GlobalFilterField label="Date Of Registration">
        <Controller
          name="dateOfRegistration"
          control={control}
          render={({ field }) => (
            <DatePicker
              value={field.value ?? null}
              onChange={(d) => field.onChange(d ?? today)}
              maxDate={today}
            />
          )}
        />
      </GlobalFilterField>
      <GlobalFilterField label=" ">
        <Controller
          name="isEligibleforreservation"
          control={control}
          render={({ field }) => (
            <label className="flex h-9 items-center gap-2 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(c) => field.onChange(c === true)}
              />
              Is Eligible For Reservation
            </label>
          )}
        />
      </GlobalFilterField>
      <GlobalFilterField label=" ">
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={goBack}>
          Back
        </Button>
      </GlobalFilterField>
    </GlobalFilterBarRow>
  )

  const stepper = (
    <div className="mb-4 overflow-hidden rounded-md border border-[#dbe8f6] bg-[#f6fbff]">
      <div className="h-[3px] w-full bg-[#d7e6f5]">
        <div
          className="h-full bg-[#2f8fd4] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 py-2 sm:px-4">
        {STEPS.map((s, index) => {
          const activeIndex = STEPS.findIndex((x) => x.id === step)
          const isActive = s.id === step
          const isDone = index < activeIndex
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (index < activeIndex) setStep(s.id)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[12px] font-medium',
                isActive && 'font-semibold text-[#1f3f66]',
                !isActive && isDone && 'text-[#2f8fd4]',
                !isActive && !isDone && 'text-[#6b7c93]',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                  isActive && 'bg-[#2f8fd4] text-white',
                  !isActive && isDone && 'bg-[#8fc9f0] text-[#0f4d7d]',
                  !isActive && !isDone && 'bg-[#d6e7f5] text-[#6b7c93]',
                )}
              >
                {index + 1}
              </span>
              {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FilteredListPage
        title="Student Applications Form"
        filters={filters}
        filtersDefaultOpen
        body={
          <div className="space-y-5">
            {stepper}
            {step === 'personal' ? (
          <div className="space-y-5">
            <SectionHeader icon={User} title="Personal Information" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Title</Label>
                <Controller
                  name="titleId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={gdOptions(titles)}
                      placeholder="Title"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>First Name *</Label>
                <Input {...register('firstName')} placeholder="as per Previous Degree" />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input {...register('middleName')} />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input {...register('lastName')} />
                <FieldError message={errors.lastName?.message} />
              </div>
              <div>
                <Label>Date Of Birth *</Label>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value ?? null}
                      onChange={(d) => field.onChange(d ?? today)}
                      maxDate={today}
                    />
                  )}
                />
                <FieldError message={errors.dateOfBirth?.message} />
              </div>
              <div>
                <Label>Age</Label>
                <Input value={String(watch('age') ?? '')} readOnly />
              </div>
              <div className="sm:col-span-2">
                <Label>Gender</Label>
                <Controller
                  name="genderCatDetId"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      className="mt-2 flex flex-wrap gap-4"
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    >
                      {genders.map((g) => (
                        <div key={String(g.generalDetailId)} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={String(g.generalDetailId)}
                            id={`gender-${g.generalDetailId}`}
                          />
                          <Label htmlFor={`gender-${g.generalDetailId}`} className="font-normal">
                            {String(g.generalDetailDisplayName ?? '')}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Identification Marks *</Label>
                <Input {...register('identificationMarks')} />
                <FieldError message={errors.identificationMarks?.message} />
              </div>
              <div className="flex items-end justify-center">
                <PhotoUpload
                  label="Student Photo"
                  src={studentPhotoUrl}
                  fallback={DEFAULT_PHOTO}
                  onFile={(file) => {
                    studentPhotoRef.current = file
                    setStudentPhotoUrl(URL.createObjectURL(file))
                  }}
                />
              </div>
              <div>
                <Label>SSC Number *</Label>
                <Input {...register('sscNo')} />
                <FieldError message={errors.sscNo?.message} />
              </div>
              <div>
                <Label>Qualified Exam Type *</Label>
                <Controller
                  name="entranceCatdetId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={gdOptions(qualifyingExamTypes)}
                      placeholder="Qualified Exam Type"
                      clearable
                    />
                  )}
                />
                <FieldError message={errors.entranceCatdetId?.message} />
              </div>
              <div>
                <Label>Qualified Rank *</Label>
                <Input {...register('entranceRank')} />
                <FieldError message={errors.entranceRank?.message} />
              </div>
              <div>
                <Label>Qualified HallTicket Number *</Label>
                <Input {...register('entranceHtNo')} />
                <FieldError message={errors.entranceHtNo?.message} />
              </div>
              <div>
                <Label>Student Mobile *</Label>
                <Input {...register('mobile')} maxLength={10} />
                <FieldError message={errors.mobile?.message} />
              </div>
              <div>
                <Label>Student Email ID</Label>
                <Input {...register('stdEmailId')} />
                <FieldError message={errors.stdEmailId?.message} />
              </div>
              <div>
                <Label>Nationality</Label>
                <Controller
                  name="nationalityCatdetId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={gdOptions(nationalities)}
                      placeholder="Nationality"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>Religion</Label>
                <Controller
                  name="religionCatdetId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={gdOptions(religions)}
                      placeholder="Religion"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>Caste *</Label>
                <Controller
                  name="casteId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('subCasteId', undefined)
                      }}
                      options={casteOptions}
                      placeholder="Caste"
                    />
                  )}
                />
                <FieldError message={errors.casteId?.message} />
              </div>
              <div>
                <Label>Sub Caste</Label>
                <Controller
                  name="subCasteId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={subCasteOptions}
                      placeholder="Sub Caste"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>Disability</Label>
                <Controller
                  name="disabilityCatdetId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={gdOptions(disabilities)}
                      placeholder="Disability"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>Aadhar Card Number *</Label>
                <Input {...register('aadharCardNo')} maxLength={12} />
                <FieldError message={errors.aadharCardNo?.message} />
              </div>
            </div>

            <SectionHeader icon={User} title="Parent Details" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Father Name *</Label>
                <Input {...register('fatherName')} />
                <FieldError message={errors.fatherName?.message} />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input {...register('fatherOccupation')} />
              </div>
              <div>
                <Label>Qualification</Label>
                <Input {...register('fatherQualification')} />
              </div>
              <div className="flex items-end justify-center">
                <PhotoUpload
                  label="Father Photo"
                  src={fatherPhotoUrl}
                  fallback={DEFAULT_PHOTO}
                  onFile={(file) => {
                    fatherPhotoRef.current = file
                    setFatherPhotoUrl(URL.createObjectURL(file))
                  }}
                />
              </div>
              <div>
                <Label>Annual Income *</Label>
                <Input type="number" {...register('fathersIncomePa')} />
                <FieldError message={errors.fathersIncomePa?.message} />
              </div>
              <div>
                <Label>Mobile Number *</Label>
                <Input {...register('fatherMobileNo')} maxLength={10} />
                <FieldError message={errors.fatherMobileNo?.message} />
              </div>
              <div>
                <Label>Email ID</Label>
                <Input {...register('fatherEmailId')} />
                <FieldError message={errors.fatherEmailId?.message} />
              </div>
              <div>
                <Label>Address</Label>
                <Input {...register('fatherAddress')} />
              </div>
              <div className="flex items-end pb-2">
                <Controller
                  name="isgovtempFather"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                      IsGovtEmp
                    </label>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Mother Name</Label>
                <Input {...register('motherName')} />
                <FieldError message={errors.motherName?.message} />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input {...register('motherOccupation')} />
              </div>
              <div>
                <Label>Qualification</Label>
                <Input {...register('motherQualification')} />
              </div>
              <div className="flex items-end justify-center">
                <PhotoUpload
                  label="Mother Photo"
                  src={motherPhotoUrl}
                  fallback={DEFAULT_MOTHER_PHOTO}
                  onFile={(file) => {
                    motherPhotoRef.current = file
                    setMotherPhotoUrl(URL.createObjectURL(file))
                  }}
                />
              </div>
              <div>
                <Label>Annual Income</Label>
                <Input type="number" {...register('motherIncomePa')} />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input {...register('motherMobileNo')} maxLength={10} />
                <FieldError message={errors.motherMobileNo?.message} />
              </div>
              <div>
                <Label>Email ID</Label>
                <Input {...register('motherEmailId')} />
                <FieldError message={errors.motherEmailId?.message} />
              </div>
              <div>
                <Label>Address</Label>
                <Input {...register('motherAddress')} />
              </div>
              <div className="flex items-end pb-2">
                <Controller
                  name="isgovtempMother"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                      IsGovtEmp
                    </label>
                  )}
                />
              </div>
            </div>

            <SectionHeader icon={User} title="Spouse Details" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Spouse Name</Label>
                <Input {...register('spouseName')} />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input {...register('spouseMobileNo')} maxLength={10} />
                <FieldError message={errors.spouseMobileNo?.message} />
              </div>
              <div>
                <Label>Email ID</Label>
                <Input {...register('spouseEmailId')} />
                <FieldError message={errors.spouseEmailId?.message} />
              </div>
              <div>
                <Label>Annual Income</Label>
                <Input {...register('spouseIncomePa')} />
              </div>
              <div>
                <Label>Address</Label>
                <Input {...register('spouseAddress')} />
              </div>
              <div className="flex items-end pb-2">
                <Controller
                  name="isgovtempSpouse"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                      IsGovtEmp
                    </label>
                  )}
                />
              </div>
            </div>

            <SectionHeader icon={MapPin} title="Permanent Address" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <Label>Address Line 1 *</Label>
                <Input {...register('permanentAddress')} />
                <FieldError message={errors.permanentAddress?.message} />
              </div>
              <div>
                <Label>Country</Label>
                <Controller
                  name="permanentCountryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('permanentStateId', undefined)
                        setValue('districtPermanentId', undefined)
                        setValue('cityPermenentId', undefined as unknown as number)
                      }}
                      options={countryOptions}
                      placeholder="Country"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>State</Label>
                <Controller
                  name="permanentStateId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('districtPermanentId', undefined)
                        setValue('cityPermenentId', undefined as unknown as number)
                      }}
                      options={stateOptions(permStates)}
                      placeholder="State"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>District</Label>
                <Controller
                  name="districtPermanentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('cityPermenentId', undefined as unknown as number)
                      }}
                      options={districtOptions(permDistricts)}
                      placeholder="District"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>City *</Label>
                <Controller
                  name="cityPermenentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={cityOptions(permCities)}
                      placeholder="City"
                    />
                  )}
                />
                <FieldError message={errors.cityPermenentId?.message} />
              </div>
              <div>
                <Label>Street</Label>
                <Input {...register('permanentStreet')} />
              </div>
              <div>
                <Label>Mandal</Label>
                <Input {...register('permanentMandal')} />
              </div>
              <div>
                <Label>Pin Code</Label>
                <Input type="number" {...register('permanentPincode')} />
              </div>
            </div>

            <SectionHeader
              icon={MapPin}
              title="Present Address"
              action={
                <label className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox checked={sameAsPermanent} onCheckedChange={() => toggleSameAddress()} />
                  Same As Permanent Address
                </label>
              }
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <Label>Address Line 1</Label>
                <Input {...register('presentAddress')} />
              </div>
              <div>
                <Label>Country</Label>
                <Controller
                  name="presentCountryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('presentStateId', undefined)
                        setValue('districtPresentId', undefined)
                        setValue('cityPresentId', undefined as unknown as number)
                      }}
                      options={countryOptions}
                      placeholder="Country"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>State</Label>
                <Controller
                  name="presentStateId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('districtPresentId', undefined)
                        setValue('cityPresentId', undefined as unknown as number)
                      }}
                      options={stateOptions(presentStates)}
                      placeholder="State"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>District</Label>
                <Controller
                  name="districtPresentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => {
                        field.onChange(v ? Number(v) : undefined)
                        setValue('cityPresentId', undefined as unknown as number)
                      }}
                      options={districtOptions(presentDistricts)}
                      placeholder="District"
                      clearable
                    />
                  )}
                />
              </div>
              <div>
                <Label>City *</Label>
                <Controller
                  name="cityPresentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      options={cityOptions(presentCities)}
                      placeholder="City"
                    />
                  )}
                />
                <FieldError message={errors.cityPresentId?.message} />
              </div>
              <div>
                <Label>Street</Label>
                <Input {...register('presentStreetName')} />
              </div>
              <div>
                <Label>Mandal</Label>
                <Input {...register('presentMandal')} />
              </div>
              <div>
                <Label>Pin Code</Label>
                <Input type="number" {...register('presentPincode')} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={() => void goNext()}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <SectionHeader icon={School} title="Educational Record" />
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-xs">
                <thead className="bg-sky-50/80 text-left text-muted-foreground">
                  <tr>
                    {[
                      'Institution Name',
                      'Board',
                      'Medium',
                      'Address',
                      'Major Subjects',
                      'Grade',
                      'Year Of Completion',
                      'Percentage',
                      'Actions',
                    ].map((h) => (
                      <th key={h} className="border-b border-border px-2 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {educationList.map((row, index) =>
                    row.isActive ? (
                      <tr key={index} className="border-b border-border/60">
                        {(
                          [
                            'nameOfInstitution',
                            'board',
                            'medium',
                            'address',
                            'majorSubjects',
                            'gradeClassSecured',
                            'yearOfCompletion',
                            'precentage',
                          ] as const
                        ).map((field) => (
                          <td key={field} className="px-1 py-1">
                            <Input
                              className="h-8 text-xs"
                              value={row[field]}
                              type={field === 'precentage' ? 'number' : 'text'}
                              onChange={(e) => {
                                const next = [...educationList]
                                next[index] = { ...next[index], [field]: e.target.value }
                                setEducationList(next)
                              }}
                            />
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-2 py-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEducationList((prev) => [...prev, emptyEducation()])}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          {index > 0 ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() =>
                                setEducationList((prev) => prev.filter((_, i) => i !== index))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            </div>

            <SectionHeader icon={School} title="Workflow Stages" />
            <div className="max-w-xs">
              <Label>Workflow Stage *</Label>
              <Controller
                name="toAppWorkflowStatusId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={workflowOptions}
                    placeholder="Workflow Stage"
                  />
                )}
              />
              <FieldError message={errors.toAppWorkflowStatusId?.message} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('personal')}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
            )}
          </div>
        }
      />
    </form>
  )
}
