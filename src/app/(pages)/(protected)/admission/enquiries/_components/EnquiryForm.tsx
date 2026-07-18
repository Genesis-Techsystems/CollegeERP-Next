'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { usePageNavLabel } from '@/common/components/breadcrumb'
import { DatePicker } from '@/common/components/date-picker'
import { FormField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { GM_CODES } from '@/config/constants/ui'
import { toDateOnlyISO } from '@/common/generic-functions'
import {
  createStudentEnquiry,
  getStudentEnquiryById,
  listCollegesByOrganization,
  listCountries,
  listCoursesByUniversity,
  listDistrictsByState,
  listGeneralDetailsByMaster,
  listOrganizations,
  listQualificationGroupsByQualification,
  listQualificationsByOrganization,
  listStatesByCountry,
  updateStudentEnquiry,
} from '@/services'
import type { StudentEnquiryPayload, StudentEnquiryRow } from '@/types/admission'
import type { GeneralDetail } from '@/types/exam-master'
import { toastError, toastSuccess } from '@/lib/toast'

const PHONE_REGEX = /^[6-9]\d{9}$/
const ALPHA_REGEX = /^[a-zA-Z0-9\s]+$/

function toOptionalNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  const n = Number(value)
  return Number.isNaN(n) ? undefined : n
}

const optionalId = z.preprocess(toOptionalNumber, z.number().optional())
const optionalNumber = z.preprocess(toOptionalNumber, z.number().optional())

/** Required select id — avoids Zod's raw "expected number, received undefined". */
function requiredId(message: string) {
  return z.preprocess(
    toOptionalNumber,
    z.number({ error: message }).min(1, message),
  )
}

const schema = z.object({
  mobileNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number'),
  modeofenquiryId: requiredId('Mode of enquiry is required'),
  organizationId: requiredId('Organization is required'),
  collegeId: requiredId('College is required'),
  courseId: requiredId('Course is required'),
  studentName: z
    .string()
    .min(1, 'Candidate name is required')
    .regex(ALPHA_REGEX, 'Use letters and numbers only'),
  enquiryDate: z.date().nullable().optional(),
  knowaboutusId: optionalId,
  sourceofenquiry: z.string().optional(),
  counseledBy: z.string().optional(),
  remarks: z.string().optional(),
  returnDate: z.date().nullable().optional(),
  countryId: optionalId,
  stateId: optionalId,
  districtId: optionalId,
  resultstatus: z.string().optional(),
  enquirystatusId: optionalId,
  qualificationId: optionalId,
  qualificationGroupId: optionalId,
  genderId: optionalId,
  percentage: optionalNumber,
  emcetrank: optionalNumber,
  mobileNumber1: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_REGEX.test(v), 'Enter a valid 10-digit mobile number'),
  parentname: z.string().optional(),
  parentmobile: z
    .string()
    .optional()
    .refine((v) => !v || PHONE_REGEX.test(v), 'Enter a valid 10-digit mobile number'),
  emailid: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
})

type FormValues = z.infer<typeof schema>

function gdOptions(rows: GeneralDetail[]): SelectOption[] {
  return rows.map((g) => ({
    value: String(g.generalDetailId),
    label: String(
      g.generalDetailDisplayName ?? g.generalDetailName ?? g.generalDetailCode ?? g.generalDetailId,
    ),
  }))
}

function parseApiDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function pickNum(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = row[key]
    if (v != null && v !== '') {
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return undefined
}

function pickText(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = row[key]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

interface EnquiryFormProps {
  mode: 'add' | 'edit'
  enquiryId?: number
  initialOrgId?: number
  initialCollegeId?: number
  initialCourseId?: number
}

export function EnquiryForm({
  mode,
  enquiryId,
  initialOrgId,
  initialCollegeId,
  initialCourseId,
}: Readonly<EnquiryFormProps>) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const navLabel = usePageNavLabel()
  const pageTitle = navLabel ?? (isEdit ? 'Edit Enquiry Form' : 'Add Enquiry Form')
  const today = useMemo(() => new Date(), [])

  const [loading, setLoading] = useState(isEdit)
  const [colleges, setColleges] = useState<Record<string, unknown>[]>([])
  const [courses, setCourses] = useState<Record<string, unknown>[]>([])
  const [qualifications, setQualifications] = useState<Record<string, unknown>[]>([])
  const [qualificationGroups, setQualificationGroups] = useState<Record<string, unknown>[]>([])
  const [states, setStates] = useState<Record<string, unknown>[]>([])
  const [districts, setDistricts] = useState<Record<string, unknown>[]>([])

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([])
  const [modeOptions, setModeOptions] = useState<SelectOption[]>([])
  const [knowOptions, setKnowOptions] = useState<SelectOption[]>([])
  const [statusOptions, setStatusOptions] = useState<SelectOption[]>([])
  const [genderOptions, setGenderOptions] = useState<GeneralDetail[]>([])
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      mobileNumber: '',
      modeofenquiryId: undefined,
      organizationId: undefined,
      collegeId: undefined,
      courseId: undefined,
      studentName: '',
      enquiryDate: today,
      returnDate: today,
      genderId: 14,
      emailid: '',
    },
  })

  const organizationId = watch('organizationId')
  const collegeId = watch('collegeId')
  const countryId = watch('countryId')
  const stateId = watch('stateId')
  const qualificationId = watch('qualificationId')

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(pickNum(c, 'collegeId', 'fk_college_id') ?? ''),
        label: pickText(c, 'collegeCode', 'college_code') || String(pickNum(c, 'collegeId') ?? ''),
      })),
    [colleges],
  )

  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        value: String(pickNum(c, 'courseId', 'fk_course_id') ?? ''),
        label: pickText(c, 'courseCode', 'course_code') || String(pickNum(c, 'courseId') ?? ''),
      })),
    [courses],
  )

  const qualificationOpts = useMemo(
    () =>
      qualifications.map((q) => ({
        value: String(pickNum(q, 'qualificationId') ?? ''),
        label: pickText(q, 'qualificationCode', 'qualification_code') || String(pickNum(q, 'qualificationId') ?? ''),
      })),
    [qualifications],
  )

  const qualificationGroupOpts = useMemo(
    () =>
      qualificationGroups.map((g) => ({
        value: String(pickNum(g, 'qualificationGroupId') ?? ''),
        label:
          pickText(g, 'qualificationGroupName', 'qualification_group_name') ||
          String(pickNum(g, 'qualificationGroupId') ?? ''),
      })),
    [qualificationGroups],
  )

  const stateOptions = useMemo(
    () =>
      states.map((s) => ({
        value: String(pickNum(s, 'stateId') ?? ''),
        label: pickText(s, 'stateName', 'state_name') || String(pickNum(s, 'stateId') ?? ''),
      })),
    [states],
  )

  const districtOptions = useMemo(
    () =>
      districts.map((d) => ({
        value: String(pickNum(d, 'districtId') ?? ''),
        label: pickText(d, 'districtName', 'district_name') || String(pickNum(d, 'districtId') ?? ''),
      })),
    [districts],
  )

  // Ref keeps loadCourses identity stable — depending on `colleges` state here
  // caused an effect loop that refetched College/Course endlessly and reset courseId.
  const collegesRef = useRef<Record<string, unknown>[]>([])
  // Original row in edit mode — update payload must echo createdDt (Angular parity).
  const loadedRowRef = useRef<StudentEnquiryRow | null>(null)

  const loadColleges = useCallback(async (orgId: number) => {
    const rows = await listCollegesByOrganization(orgId)
    collegesRef.current = rows
    setColleges(rows)
    return rows
  }, [])

  const loadCourses = useCallback(async (clgId: number, collegeRows?: Record<string, unknown>[]) => {
    const list = collegeRows ?? collegesRef.current
    const college = list.find((c) => pickNum(c, 'collegeId', 'fk_college_id') === clgId)
    const universityId = pickNum(college ?? {}, 'universityId', 'fk_university_id', 'university_id')
    if (!universityId) {
      setCourses([])
      return []
    }
    const rows = await listCoursesByUniversity(universityId)
    setCourses(rows)
    return rows
  }, [])

  const loadQualifications = useCallback(async (orgId: number) => {
    const rows = await listQualificationsByOrganization(orgId)
    setQualifications(rows)
    return rows
  }, [])

  useEffect(() => {
    void Promise.all([
      listOrganizations(),
      listGeneralDetailsByMaster(GM_CODES.MODE_OF_ENQUIRY),
      listGeneralDetailsByMaster(GM_CODES.KNOW_ABOUT_US),
      listGeneralDetailsByMaster(GM_CODES.ENQUIRY_STATUS),
      listGeneralDetailsByMaster(GM_CODES.GENDER),
      listCountries(),
    ]).then(([orgs, modes, know, statuses, genders, countries]) => {
      setOrgOptions(
        orgs
          .filter((o) => o.isActive !== false)
          .map((o) => ({
            value: String(o.organizationId),
            label: o.orgCode ?? o.orgName ?? String(o.organizationId),
          })),
      )
      setModeOptions(gdOptions(modes))
      setKnowOptions(gdOptions(know))
      setStatusOptions(gdOptions(statuses))
      setGenderOptions(genders)
      setCountryOptions(
        countries.map((c) => ({
          value: String(c.countryId),
          label: c.countryName ?? String(c.countryId),
        })),
      )
      const defaultGender = genders.find((g) => g.generalDetailId === 14)?.generalDetailId ?? genders[0]?.generalDetailId
      if (!isEdit && defaultGender) {
        setValue('genderId', defaultGender)
      }
    })
  }, [isEdit, setValue])

  useEffect(() => {
    if (!isEdit || !enquiryId) return
    setLoading(true)
    void getStudentEnquiryById(enquiryId)
      .then(async (row) => {
        if (!row) {
          toastError(new Error('Enquiry not found'))
          return
        }
        loadedRowRef.current = row
        const orgId = row.organizationId
        const clgId = row.collegeId
        let collegeRows: Record<string, unknown>[] = []
        if (orgId) {
          collegeRows = await loadColleges(orgId)
          await loadQualifications(orgId)
        }
        if (clgId && orgId) {
          await loadCourses(clgId, collegeRows)
        }
        if (row.qualificationId) {
          const groups = await listQualificationGroupsByQualification(row.qualificationId)
          setQualificationGroups(groups)
        }
        if (row.countryId) {
          const st = await listStatesByCountry(row.countryId)
          setStates(st as unknown as Record<string, unknown>[])
        }
        if (row.stateId) {
          const dist = await listDistrictsByState(row.stateId)
          setDistricts(dist as unknown as Record<string, unknown>[])
        }
        reset({
          mobileNumber: row.mobileNumber ?? '',
          modeofenquiryId: row.modeofenquiryId,
          organizationId: row.organizationId,
          collegeId: row.collegeId,
          courseId: row.courseId,
          studentName: row.studentName ?? '',
          enquiryDate: parseApiDate(row.enquiryDate) ?? today,
          knowaboutusId: row.knowaboutusId,
          sourceofenquiry: row.sourceofenquiry ?? '',
          counseledBy: row.counseledBy ?? '',
          remarks: row.remarks ?? '',
          returnDate: parseApiDate(row.returnDate) ?? today,
          countryId: row.countryId,
          stateId: row.stateId,
          districtId: row.districtId,
          resultstatus: row.resultstatus ?? '',
          enquirystatusId: row.enquirystatusId,
          qualificationId: row.qualificationId,
          qualificationGroupId: row.qualificationGroupId,
          genderId: row.genderId,
          percentage: row.percentage,
          emcetrank: row.emcetrank,
          mobileNumber1: row.mobileNumber1 ?? '',
          parentname: row.parentname ?? '',
          parentmobile: row.parentmobile ?? '',
          emailid: row.emailid ?? '',
        })
      })
      .catch((err) => toastError(err))
      .finally(() => setLoading(false))
  }, [isEdit, enquiryId, loadColleges, loadCourses, loadQualifications, reset, today])

  useEffect(() => {
    if (isEdit || !initialOrgId) return
    setValue('organizationId', initialOrgId)
    void loadColleges(initialOrgId).then((collegeRows) => {
      void loadQualifications(initialOrgId)
      if (initialCollegeId) {
        setValue('collegeId', initialCollegeId)
        void loadCourses(initialCollegeId, collegeRows).then(() => {
          if (initialCourseId) setValue('courseId', initialCourseId)
        })
      }
    })
  }, [
    isEdit,
    initialOrgId,
    initialCollegeId,
    initialCourseId,
    loadColleges,
    loadCourses,
    loadQualifications,
    setValue,
  ])

  // Track previous values so cascades only clear children on a real change
  // (not on mount / URL-param prefill, which was wiping the selected course).
  const prevOrgIdRef = useRef<number | undefined>(undefined)
  const prevCollegeIdRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const prev = prevOrgIdRef.current
    prevOrgIdRef.current = organizationId
    if (!organizationId) {
      setColleges([])
      return
    }
    if (prev === organizationId) return
    // First value came from the edit load / URL-param prefill effect, which
    // already fetched colleges + qualifications — don't fetch (or clear) again.
    if (prev === undefined && (isEdit || organizationId === initialOrgId)) return
    if (!isEdit && prev !== undefined) {
      setValue('collegeId', undefined as unknown as number)
      setValue('courseId', undefined as unknown as number)
    }
    void loadColleges(organizationId)
    void loadQualifications(organizationId)
  }, [organizationId, isEdit, initialOrgId, loadColleges, loadQualifications, setValue])

  useEffect(() => {
    const prev = prevCollegeIdRef.current
    prevCollegeIdRef.current = collegeId
    if (!collegeId) {
      setCourses([])
      return
    }
    if (prev === collegeId) return
    // First value came from the edit load / URL-param prefill effect — courses
    // are already being fetched there with the right college rows.
    if (prev === undefined && (isEdit || collegeId === initialCollegeId)) return
    if (!isEdit && prev !== undefined) {
      setValue('courseId', undefined as unknown as number)
    }
    void loadCourses(collegeId)
  }, [collegeId, isEdit, initialCollegeId, loadCourses, setValue])

  useEffect(() => {
    if (!countryId) {
      setStates([])
      return
    }
    setValue('stateId', undefined)
    setValue('districtId', undefined)
    void listStatesByCountry(countryId).then((rows) => setStates(rows as unknown as Record<string, unknown>[]))
  }, [countryId, setValue])

  useEffect(() => {
    if (!stateId) {
      setDistricts([])
      return
    }
    setValue('districtId', undefined)
    void listDistrictsByState(stateId).then((rows) => setDistricts(rows as unknown as Record<string, unknown>[]))
  }, [stateId, setValue])

  useEffect(() => {
    if (!qualificationId) {
      setQualificationGroups([])
      return
    }
    setValue('qualificationGroupId', undefined)
    void listQualificationGroupsByQualification(qualificationId).then(setQualificationGroups)
  }, [qualificationId, setValue])

  function buildPayload(data: FormValues): StudentEnquiryPayload {
    // Angular sends the full row with explicit nulls (undefined fields get
    // stripped from JSON and Spring rejects the partial entity with a 422).
    return {
      mobileNumber: data.mobileNumber,
      modeofenquiryId: data.modeofenquiryId,
      organizationId: data.organizationId,
      collegeId: data.collegeId,
      courseId: data.courseId,
      studentName: data.studentName,
      enquiryDate: data.enquiryDate ? toDateOnlyISO(data.enquiryDate) : null,
      knowaboutusId: data.knowaboutusId ?? null,
      sourceofenquiry: data.sourceofenquiry?.trim() || null,
      counseledBy: data.counseledBy?.trim() || null,
      remarks: data.remarks?.trim() || null,
      returnDate: data.returnDate ? toDateOnlyISO(data.returnDate) : null,
      countryId: data.countryId ?? null,
      stateId: data.stateId ?? null,
      districtId: data.districtId ?? null,
      resultstatus: data.resultstatus || null,
      enquirystatusId: data.enquirystatusId ?? null,
      qualificationId: data.qualificationId ?? null,
      qualificationGroupId: data.qualificationGroupId ?? null,
      genderId: data.genderId ?? null,
      percentage: data.percentage ?? null,
      emcetrank: data.emcetrank ?? null,
      mobileNumber1: data.mobileNumber1?.trim() || null,
      parentname: data.parentname?.trim() || null,
      parentmobile: data.parentmobile?.trim() || null,
      emailid: data.emailid.trim(),
      isActive: true,
      ...(isEdit
        ? {
            enquiryId,
            createdDt: loadedRowRef.current?.createdDt,
            updatedDt: new Date().toISOString(),
          }
        : { createdDt: new Date().toISOString() }),
    }
  }

  function navigateBack(orgId?: number, clgId?: number, crsId?: number) {
    const params = new URLSearchParams()
    if (orgId) params.set('organizationId', String(orgId))
    if (clgId) params.set('collegeId', String(clgId))
    if (crsId) params.set('courseId', String(crsId))
    const q = params.toString()
    router.push(q ? `/admission/enquiries/enquiry-list?${q}` : '/admission/enquiries/enquiry-list')
  }

  async function onSubmit(data: FormValues) {
    const payload = buildPayload(data)
    try {
      if (isEdit && enquiryId) {
        await updateStudentEnquiry(enquiryId, payload)
        toastSuccess('Enquiry updated')
      } else {
        await createStudentEnquiry(payload)
        toastSuccess('Enquiry created')
      }
      navigateBack(data.organizationId, data.collegeId, data.courseId)
    } catch (err) {
      toastError(err, `Failed to ${isEdit ? 'update' : 'create'} enquiry`)
    }
  }

  const resultStatusOptions: SelectOption[] = [
    { value: 'P', label: 'Pass' },
    { value: 'F', label: 'Fail/WithHeld' },
  ]

  const fieldClass = 'space-y-1.5'
  const inputClass = 'h-9'

  return (
    <PageContainer className="space-y-4">
      {/* Same card chrome as the enquiry list table card (1rem radius); the
          heading stays black — data-no-page-name blocks the injected blue bar. */}
      <div className="app-data-table-card" data-no-page-name>
        <div className="border-b border-border px-4 py-3 md:px-5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {pageTitle}
          </h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit(onSubmit)()
          }}
          className="space-y-5 p-4 md:p-5"
        >
          <fieldset disabled={loading || isSubmitting} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Phone No." required htmlFor="enquiry-phone" error={errors.mobileNumber?.message}>
                <Input id="enquiry-phone" className={inputClass} maxLength={10} placeholder="Enter phone number" {...register('mobileNumber')} />
              </FormField>
              <Controller
                name="modeofenquiryId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Mode Of Enquiry"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={modeOptions}
                    placeholder="Select mode of enquiry"
                    error={errors.modeofenquiryId?.message}
                  />
                )}
              />
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Organization"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={orgOptions}
                    searchable
                    placeholder="Select organization"
                    error={errors.organizationId?.message}
                  />
                )}
              />
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="College"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={collegeOptions}
                    searchable
                    placeholder="Select college"
                    disabled={!organizationId}
                    error={errors.collegeId?.message}
                  />
                )}
              />
              <Controller
                name="courseId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Course"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={courseOptions}
                    searchable
                    placeholder="Select course"
                    disabled={!collegeId}
                    error={errors.courseId?.message}
                  />
                )}
              />
              <FormField label="Candidate Name" required htmlFor="enquiry-candidate" error={errors.studentName?.message}>
                <Input id="enquiry-candidate" className={inputClass} placeholder="Enter candidate name" {...register('studentName')} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Controller
                name="enquiryDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Enquiry Date"
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="knowaboutusId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="How did you know about us?"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={knowOptions}
                    clearable
                    placeholder="Select option"
                  />
                )}
              />
              <FormField label="Source Group" htmlFor="enquiry-source">
                <Input id="enquiry-source" className={inputClass} placeholder="Enter source group" {...register('sourceofenquiry')} />
              </FormField>
              <FormField label="Counselled By" htmlFor="enquiry-counselled">
                <Input id="enquiry-counselled" className={inputClass} placeholder="Enter counselor name" {...register('counseledBy')} />
              </FormField>
              <FormField label="Remarks" htmlFor="enquiry-remarks">
                <Input id="enquiry-remarks" className={inputClass} placeholder="Enter remarks" {...register('remarks')} />
              </FormField>
              <Controller
                name="returnDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Candidate Return Date"
                    value={field.value ?? null}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Country"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={countryOptions}
                    searchable
                    clearable
                    placeholder="Select country"
                  />
                )}
              />
              <Controller
                name="stateId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="State"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={stateOptions}
                    searchable
                    clearable
                    placeholder="Select state"
                    disabled={!countryId}
                  />
                )}
              />
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="District"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={districtOptions}
                    searchable
                    clearable
                    placeholder="Select district"
                    disabled={!stateId}
                  />
                )}
              />
              <Controller
                name="resultstatus"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Result Status"
                    value={field.value ?? null}
                    onChange={field.onChange}
                    options={resultStatusOptions}
                    clearable
                    placeholder="Select"
                  />
                )}
              />
              <Controller
                name="enquirystatusId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Enquiry Status"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={statusOptions}
                    clearable
                    placeholder="Select status"
                  />
                )}
              />
              <Controller
                name="qualificationId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Qualification"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={qualificationOpts}
                    searchable
                    clearable
                    placeholder="Select qualification"
                    disabled={!organizationId}
                  />
                )}
              />
              <Controller
                name="qualificationGroupId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Qualification Group"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={qualificationGroupOpts}
                    searchable
                    clearable
                    placeholder="Select group"
                    disabled={!qualificationId}
                  />
                )}
              />
              <div className={`${fieldClass} sm:col-span-2 lg:col-span-1`}>
                <Label className="mb-2 block text-sm font-medium">Gender</Label>
                <Controller
                  name="genderId"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                      className="flex flex-wrap gap-4 pt-1"
                    >
                      {genderOptions.map((g) => (
                        <div key={g.generalDetailId} className="flex items-center gap-1.5">
                          <RadioGroupItem
                            value={String(g.generalDetailId)}
                            id={`gender-${g.generalDetailId}`}
                          />
                          <Label htmlFor={`gender-${g.generalDetailId}`} className="text-sm font-normal">
                            {(g as GeneralDetail & { generalDetailDisplayName?: string })
                              .generalDetailDisplayName ?? g.generalDetailName ?? g.generalDetailCode}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
              </div>
              <FormField label="Percentage (%)" htmlFor="enquiry-percentage">
                <Input id="enquiry-percentage" type="number" maxLength={5} className={inputClass} placeholder="Enter percentage" {...register('percentage')} />
              </FormField>
              <FormField label="Eamcet Rank" htmlFor="enquiry-eamcet">
                <Input id="enquiry-eamcet" type="number" className={inputClass} placeholder="Enter EAMCET rank" {...register('emcetrank')} />
              </FormField>
              <FormField label="Alt. Ph. No." htmlFor="enquiry-alt-phone" error={errors.mobileNumber1?.message}>
                <Input id="enquiry-alt-phone" className={inputClass} maxLength={10} placeholder="Enter alternate phone" {...register('mobileNumber1')} />
              </FormField>
              <FormField label="Parent / Guardian Name" htmlFor="enquiry-parent">
                <Input id="enquiry-parent" className={inputClass} placeholder="Enter parent / guardian name" {...register('parentname')} />
              </FormField>
              <FormField label="Parent Ph. No." htmlFor="enquiry-parent-phone" error={errors.parentmobile?.message}>
                <Input id="enquiry-parent-phone" className={inputClass} maxLength={10} placeholder="Enter parent phone" {...register('parentmobile')} />
              </FormField>
              <FormField label="Email Id" required htmlFor="enquiry-email" error={errors.emailid?.message}>
                <Input id="enquiry-email" type="email" className={inputClass} placeholder="Enter email address" {...register('emailid')} />
              </FormField>
            </div>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => navigateBack(organizationId, collegeId, watch('courseId'))}
            >
              Back
            </Button>
            <Button type="submit" className="h-9" disabled={loading || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Details'}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
