'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { resolveOrganizationId } from '@/lib/user-context'
import {
  createStudentApplicationForm,
  getAdmissionCollegeFilters,
  getStudentApplicationFormById,
  listBatchesByCourse,
  listCastes,
  listCitiesByDistrict,
  listCountries,
  listDistrictsByState,
  listDocumentRepositoriesForApplication,
  listGeneralDetailsByCode,
  listStatesByCountry,
  listStudentRegulationsByCourse,
  listSubCastesByCasteId,
  listWorkflowStagesForStdAppForm,
  popStudentFeeStructure,
  popStudentUserAccounts,
  updateStudentApplicationForm,
  uploadStudentApplicationFormPhotos,
  uploadUpdatedStudentApplicationFormPhotos,
} from '@/services'
import { AppOfficeUseStep } from './AppOfficeUseStep'
import { AppPersonalInfoStep } from './AppPersonalInfoStep'
import { AppEducationStep } from './AppEducationStep'
import { AppActivitiesStep } from './AppActivitiesStep'
import { AppCertificatesStep } from './AppCertificatesStep'
import { ApplicationFormStepper } from './ApplicationFormStepper'
import { TermsStep } from './TermsStep'
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  type FilterRow,
} from '../../_lib/admission-filters'
import {
  APP_STEPS,
  GM_EDIT_CODES,
  addressesMatch,
  asAcademicYearRows,
  asCollegeRows,
  asCourseGroupRows,
  asCourseRows,
  asCourseYearRows,
  buildLangStatus,
  emptyActivityRow,
  emptyEducationRow,
  ensureArray,
  initLanguageFlags,
  mergeStudentDocuments,
  num,
  parseDate,
  photoSrc,
  toIsoDate,
  txt,
  validateOfficeStep,
  validatePersonalStep,
  type AnyRow,
  type AppStepId,
  type StudentDocumentRow,
} from './application-form-utils'

type PhotoFiles = {
  student?: File
  father?: File
  mother?: File
}

export interface ApplicationFormProps {
  mode?: 'add' | 'edit'
}

function readStorage(key: string): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

function previewFile(file: File, setUrl: (url: string) => void) {
  setUrl(URL.createObjectURL(file))
}

function coerceDates(row: AnyRow): AnyRow {
  return {
    ...row,
    dob: parseDate(row.dob),
    adminssionDate: parseDate(row.adminssionDate),
    dateOfRegistration: parseDate(row.dateOfRegistration),
    dateOfIssue: parseDate(row.dateOfIssue),
    dateOfExpiry: parseDate(row.dateOfExpiry),
  }
}

export function ApplicationForm({ mode = 'add' }: ApplicationFormProps) {
  const isEdit = mode === 'edit'
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const orgId = resolveOrganizationId(user) || Number(readStorage('organizationId')) || 0
  const { employeeId: empId, isResolving: empResolving } = useLoginEmployeeId(user, sessionLoading)

  const applicationNumberParam = searchParams.get('applicationNumber') ?? ''
  const initialCollegeId = Number(searchParams.get('collegeId') ?? 0) || null
  const initialAcademicYearId = Number(searchParams.get('academicYearId') ?? 0) || null
  const initialCourseId = Number(searchParams.get('courseId') ?? 0) || null

  const today = useMemo(() => new Date(), [])
  const [activeStep, setActiveStep] = useState<AppStepId>('office')
  const [pageLoading, setPageLoading] = useState(isEdit)
  const [data, setData] = useState<AnyRow>(() => ({
    admissionType: 1,
    univAppId: '',
    collegeId: initialCollegeId,
    academicYearId: initialAcademicYearId,
    courseId: initialCourseId,
    courseGroupId: null,
    courseYearId: null,
    quotaId: null,
    regulationId: null,
    batchId: null,
    studentTypeId: null,
    dateOfRegistration: today,
    adminssionDate: today,
    receiptNo: '',
    isLateral: false,
    isCurrentYear: true,
    refApplicationNo: '',
    isActive: true,
    genderId: 14,
    isLocal: 1,
    studentEducationDetails: [emptyEducationRow()],
    studentActivitiesDetails: [emptyActivityRow()],
    hobbies: '',
    interests: '',
    speak1: false,
    read1: false,
    write1: false,
    speak2: false,
    read2: false,
    write2: false,
    speak3: false,
    read3: false,
    write3: false,
  }))
  const [documents, setDocuments] = useState<StudentDocumentRow[]>([])
  const [sameAsPermanent, setSameAsPermanent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [workflowStageId, setWorkflowStageId] = useState<number | null>(null)
  const [workflowError, setWorkflowError] = useState('')
  const [showOfficeErrors, setShowOfficeErrors] = useState(false)
  const [showPersonalErrors, setShowPersonalErrors] = useState(false)
  const photoFiles = useRef<PhotoFiles>({})
  const originalWorkflowStatusId = useRef<number | null>(null)

  const [filtersData, setFiltersData] = useState<FilterRow[]>([])
  const [academicData, setAcademicData] = useState<FilterRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [batches, setBatches] = useState<AnyRow[]>([])
  const [regulations, setRegulations] = useState<AnyRow[]>([])
  const [quotas, setQuotas] = useState<AnyRow[]>([])
  const [studentTypes, setStudentTypes] = useState<AnyRow[]>([])
  const [titles, setTitles] = useState<AnyRow[]>([])
  const [genders, setGenders] = useState<AnyRow[]>([])
  const [qualifyingExamTypes, setQualifyingExamTypes] = useState<AnyRow[]>([])
  const [nationalities, setNationalities] = useState<AnyRow[]>([])
  const [religions, setReligions] = useState<AnyRow[]>([])
  const [castes, setCastes] = useState<AnyRow[]>([])
  const [subCastes, setSubCastes] = useState<AnyRow[]>([])
  const [disabilities, setDisabilities] = useState<AnyRow[]>([])
  const [bloodGroups, setBloodGroups] = useState<AnyRow[]>([])
  const [languages, setLanguages] = useState<AnyRow[]>([])
  const [countries, setCountries] = useState<AnyRow[]>([])
  const [presentStates, setPresentStates] = useState<AnyRow[]>([])
  const [presentDistricts, setPresentDistricts] = useState<AnyRow[]>([])
  const [presentCities, setPresentCities] = useState<AnyRow[]>([])
  const [permStates, setPermStates] = useState<AnyRow[]>([])
  const [permDistricts, setPermDistricts] = useState<AnyRow[]>([])
  const [permCities, setPermCities] = useState<AnyRow[]>([])
  const [workflowStages, setWorkflowStages] = useState<AnyRow[]>([])

  const [studentPhotoUrl, setStudentPhotoUrl] = useState(() => photoSrc(null))
  const [fatherPhotoUrl, setFatherPhotoUrl] = useState(() => photoSrc(null))
  const [motherPhotoUrl, setMotherPhotoUrl] = useState(() => photoSrc(null))

  const progress = useMemo(
    () => APP_STEPS.find((s) => s.id === activeStep)?.progress ?? 20,
    [activeStep],
  )
  // Recomputed on every change so messages clear as soon as the field is fixed.
  const officeErrors = useMemo(() => validateOfficeStep(data), [data])
  const personalErrors = useMemo(() => validatePersonalStep(data), [data])
  const stepIndex = APP_STEPS.findIndex((s) => s.id === activeStep)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === APP_STEPS.length - 1

  const patchData = useCallback((patch: Partial<AnyRow>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadGm = useCallback(async () => {
    const [q, st, t, g, qe, n, r, d, b, l] = await Promise.all([
      listGeneralDetailsByCode(GM_EDIT_CODES.quota),
      listGeneralDetailsByCode(GM_EDIT_CODES.studentType),
      listGeneralDetailsByCode(GM_EDIT_CODES.title),
      listGeneralDetailsByCode(GM_EDIT_CODES.gender),
      listGeneralDetailsByCode(GM_EDIT_CODES.qualifyExam),
      listGeneralDetailsByCode(GM_EDIT_CODES.nationality),
      listGeneralDetailsByCode(GM_EDIT_CODES.religion),
      listGeneralDetailsByCode(GM_EDIT_CODES.disability),
      listGeneralDetailsByCode(GM_EDIT_CODES.bloodGroup),
      listGeneralDetailsByCode(GM_EDIT_CODES.language),
    ])
    setQuotas(q)
    setStudentTypes(st)
    setTitles(t)
    setGenders(g)
    setQualifyingExamTypes(qe)
    setNationalities(n)
    setReligions(r)
    setDisabilities(d)
    setBloodGroups(b)
    setLanguages(l)
  }, [])

  const loadCourseExtras = useCallback(
    async (collegeId: number, courseId: number, existingDocs?: AnyRow[]) => {
      const [bts, regs, repos, stages] = await Promise.all([
        listBatchesByCourse(courseId),
        listStudentRegulationsByCourse(courseId),
        listDocumentRepositoriesForApplication({ collegeId, courseId }),
        listWorkflowStagesForStdAppForm(collegeId),
      ])
      setBatches(bts as AnyRow[])
      setRegulations(regs)
      setDocuments(mergeStudentDocuments(repos, existingDocs ?? []))
      setWorkflowStages(stages)
    },
    [],
  )

  const applyCollegeCascade = useCallback(
    (collegeId: number | null, filters: FilterRow[], ayRows: FilterRow[], preferAyId?: number | null) => {
      if (!collegeId) {
        setAcademicYears([])
        setCourses([])
        setCourseGroups([])
        setCourseYears([])
        return { academicYearId: null as number | null, courseId: null as number | null }
      }
      const ays = asAcademicYearRows(filterAcademicYears(ayRows, collegeId, filters))
      setAcademicYears(ays)
      const academicYearId =
        preferAyId && ays.some((r) => num(r, ['academicYearId']) === preferAyId)
          ? preferAyId
          : num(ays[0], ['academicYearId']) || null
      return { academicYearId, courseId: null as number | null }
    },
    [],
  )

  const applyAcademicYearCascade = useCallback(
    (collegeId: number | null, filters: FilterRow[], preferCourseId?: number | null) => {
      if (!collegeId) {
        setCourses([])
        setCourseGroups([])
        setCourseYears([])
        return null as number | null
      }
      const crs = asCourseRows(filterCourses(filters, collegeId))
      setCourses(crs)
      const courseId =
        preferCourseId && crs.some((r) => num(r, ['courseId']) === preferCourseId)
          ? preferCourseId
          : num(crs[0], ['courseId']) || null
      return courseId
    },
    [],
  )

  const applyCourseCascade = useCallback(
    (
      collegeId: number | null,
      courseId: number | null,
      filters: FilterRow[],
      preferCourseGroupId?: number | null,
    ) => {
      if (!collegeId || !courseId) {
        setCourseGroups([])
        setCourseYears([])
        return null as number | null
      }
      const groups = asCourseGroupRows(filterCourseGroups(filters, collegeId, courseId))
      setCourseGroups(groups)
      return preferCourseGroupId &&
        groups.some((r) => num(r, ['courseGroupId']) === preferCourseGroupId)
        ? preferCourseGroupId
        : num(groups[0], ['courseGroupId']) || null
    },
    [],
  )

  const applyCourseGroupCascade = useCallback(
    (
      collegeId: number | null,
      courseId: number | null,
      courseGroupId: number | null,
      filters: FilterRow[],
      preferCourseYearId?: number | null,
    ) => {
      if (!collegeId || !courseId || !courseGroupId) {
        setCourseYears([])
        return null as number | null
      }
      const years = asCourseYearRows(filterCourseYears(filters, collegeId, courseId, courseGroupId))
      setCourseYears(years)
      return preferCourseYearId &&
        years.some((r) => num(r, ['courseYearId']) === preferCourseYearId)
        ? preferCourseYearId
        : num(years[0], ['courseYearId']) || null
    },
    [],
  )

  const hydrateGeoAndCaste = useCallback(async (row: AnyRow) => {
    const casteId = num(row, ['casteId'])
    if (casteId) {
      setSubCastes(await listSubCastesByCasteId(casteId))
    }

    const presentCountryId = num(row, ['presentCountryId'])
    const presentStateId = num(row, ['presentStateId'])
    const presentDistrictId = num(row, ['presentDistrictId'])
    if (presentCountryId) {
      setPresentStates((await listStatesByCountry(presentCountryId)) as unknown as AnyRow[])
    }
    if (presentStateId) {
      setPresentDistricts((await listDistrictsByState(presentStateId)) as unknown as AnyRow[])
    }
    if (presentDistrictId) {
      setPresentCities((await listCitiesByDistrict(presentDistrictId)) as unknown as AnyRow[])
    }

    const permanentCountryId = num(row, ['permanentCountryId'])
    const permanentStateId = num(row, ['permanentStateId'])
    const permanentDistrictId = num(row, ['permanentDistrictId'])
    if (permanentCountryId) {
      setPermStates((await listStatesByCountry(permanentCountryId)) as unknown as AnyRow[])
    }
    if (permanentStateId) {
      setPermDistricts((await listDistrictsByState(permanentStateId)) as unknown as AnyRow[])
    }
    if (permanentDistrictId) {
      setPermCities((await listCitiesByDistrict(permanentDistrictId)) as unknown as AnyRow[])
    }
  }, [])

  useEffect(() => {
    if (sessionLoading || empResolving || !orgId || !empId) return
    let cancelled = false
    void (async () => {
      try {
        if (isEdit) {
          setPageLoading(true)
          if (!applicationNumberParam || !initialCollegeId) {
            toastError(new Error('Missing application number or college for edit.'))
            router.push('/admission/application-form/application-list')
            return
          }
        }

        const [bundle, casteRows, countryRows, , existing] = await Promise.all([
          getAdmissionCollegeFilters(orgId, empId),
          listCastes(),
          listCountries(),
          loadGm(),
          isEdit
            ? getStudentApplicationFormById(applicationNumberParam, initialCollegeId!)
            : Promise.resolve(null),
        ])

        if (cancelled) return

        const filters = (bundle.filtersData ?? []) as FilterRow[]
        const ayData = (bundle.academicData ?? []) as FilterRow[]
        setFiltersData(filters)
        setAcademicData(ayData)
        setCastes(casteRows as unknown as AnyRow[])
        setCountries(countryRows as unknown as AnyRow[])

        const clgRows = asCollegeRows(filterColleges(filters))
        setColleges(clgRows)

        if (isEdit) {
          if (!existing) {
            toastError(new Error('Application form not found.'))
            router.push('/admission/application-form/application-list')
            return
          }

          const collegeId = num(existing, ['collegeId']) || initialCollegeId
          const preferAy = num(existing, ['academicYearId']) || null
          const preferCourse = num(existing, ['courseId']) || null
          const preferGroup = num(existing, ['courseGroupId']) || null
          const preferYear = num(existing, ['courseYearId']) || null

          applyCollegeCascade(collegeId, filters, ayData, preferAy)
          applyAcademicYearCascade(collegeId, filters, preferCourse)
          const courseGroupId = applyCourseCascade(collegeId, preferCourse, filters, preferGroup)
          applyCourseGroupCascade(collegeId, preferCourse, courseGroupId, filters, preferYear)

          if (collegeId && preferCourse) {
            await loadCourseExtras(
              collegeId,
              preferCourse,
              ensureArray<AnyRow>(existing.stdAppDocCollections),
            )
          }

          await hydrateGeoAndCaste(existing)

          const flagged = initLanguageFlags(coerceDates(existing))
          const educations = ensureArray<AnyRow>(existing.stdAppEducations)
          const activities = ensureArray<AnyRow>(existing.stdAppActivities)
          const wfId =
            num(existing, ['toAppWorkflowStatusId', 'currentWorkflowStatusId']) || null
          originalWorkflowStatusId.current =
            num(existing, ['currentWorkflowStatusId']) || wfId

          setData({
            ...flagged,
            studentEducationDetails: educations.length ? educations : [emptyEducationRow()],
            studentActivitiesDetails: activities.length ? activities : [emptyActivityRow()],
            collegeId,
            academicYearId: preferAy,
            courseId: preferCourse,
            courseGroupId: preferGroup ?? courseGroupId,
            courseYearId: preferYear,
          })
          setWorkflowStageId(wfId)
          setSameAsPermanent(addressesMatch(flagged))
          setStudentPhotoUrl(photoSrc(txt(existing, ['studentPhotoPath']) || null))
          setFatherPhotoUrl(photoSrc(txt(existing, ['fatherPhotoPath']) || null))
          setMotherPhotoUrl(photoSrc(txt(existing, ['motherPhotoPath']) || null))
          if (!cancelled) setPageLoading(false)
          return
        }

        const collegeId =
          initialCollegeId && clgRows.some((r) => num(r, ['collegeId']) === initialCollegeId)
            ? initialCollegeId
            : num(clgRows[0], ['collegeId']) || null

        const { academicYearId } = applyCollegeCascade(
          collegeId,
          filters,
          ayData,
          initialAcademicYearId,
        )
        const courseId = applyAcademicYearCascade(collegeId, filters, initialCourseId)
        const courseGroupId = applyCourseCascade(collegeId, courseId, filters)
        const courseYearId = applyCourseGroupCascade(collegeId, courseId, courseGroupId, filters)

        patchData({
          collegeId,
          academicYearId,
          courseId,
          courseGroupId,
          courseYearId,
        })

        if (collegeId && courseId) {
          await loadCourseExtras(collegeId, courseId)
        }
      } catch (e) {
        if (!cancelled) {
          toastError(e, isEdit ? 'Failed to load application form' : 'Failed to load application form options')
          if (isEdit) setPageLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Initial mount only — cascade handlers refresh options on user change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, empResolving, orgId, empId])

  async function onCollegeChange(collegeId: number | null) {
    const { academicYearId } = applyCollegeCascade(collegeId, filtersData, academicData)
    const courseId = applyAcademicYearCascade(collegeId, filtersData)
    const courseGroupId = applyCourseCascade(collegeId, courseId, filtersData)
    const courseYearId = applyCourseGroupCascade(collegeId, courseId, courseGroupId, filtersData)
    patchData({
      collegeId,
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      regulationId: null,
      batchId: null,
    })
    setBatches([])
    setRegulations([])
    setDocuments([])
    setWorkflowStages([])
    setWorkflowStageId(null)
    if (collegeId && courseId) await loadCourseExtras(collegeId, courseId)
  }

  async function onAcademicYearChange(academicYearId: number | null) {
    const collegeId = num(data, ['collegeId']) || null
    const courseId = applyAcademicYearCascade(collegeId, filtersData)
    const courseGroupId = applyCourseCascade(collegeId, courseId, filtersData)
    const courseYearId = applyCourseGroupCascade(collegeId, courseId, courseGroupId, filtersData)
    patchData({
      academicYearId,
      courseId,
      courseGroupId,
      courseYearId,
      regulationId: null,
      batchId: null,
    })
    setBatches([])
    setRegulations([])
    setDocuments([])
    setWorkflowStageId(null)
    if (collegeId && courseId) await loadCourseExtras(collegeId, courseId)
  }

  async function onCourseChange(courseId: number | null) {
    const collegeId = num(data, ['collegeId']) || null
    const courseGroupId = applyCourseCascade(collegeId, courseId, filtersData)
    const courseYearId = applyCourseGroupCascade(collegeId, courseId, courseGroupId, filtersData)
    patchData({
      courseId,
      courseGroupId,
      courseYearId,
      regulationId: null,
      batchId: null,
    })
    setBatches([])
    setRegulations([])
    setDocuments([])
    setWorkflowStageId(null)
    if (collegeId && courseId) await loadCourseExtras(collegeId, courseId)
  }

  function onCourseGroupChange(courseGroupId: number | null) {
    const collegeId = num(data, ['collegeId']) || null
    const courseId = num(data, ['courseId']) || null
    const courseYearId = applyCourseGroupCascade(collegeId, courseId, courseGroupId, filtersData)
    patchData({ courseGroupId, courseYearId })
  }

  async function onCasteChange(casteId: number | null) {
    patchData({ casteId, subCasteId: null })
    setSubCastes(casteId ? await listSubCastesByCasteId(casteId) : [])
  }

  async function onPresentCountryChange(countryId: number | null) {
    patchData({
      presentCountryId: countryId,
      presentStateId: null,
      presentDistrictId: null,
      presentCityId: null,
    })
    setPresentStates(countryId ? ((await listStatesByCountry(countryId)) as unknown as AnyRow[]) : [])
    setPresentDistricts([])
    setPresentCities([])
  }

  async function onPresentStateChange(stateId: number | null) {
    patchData({ presentStateId: stateId, presentDistrictId: null, presentCityId: null })
    setPresentDistricts(stateId ? ((await listDistrictsByState(stateId)) as unknown as AnyRow[]) : [])
    setPresentCities([])
  }

  async function onPresentDistrictChange(districtId: number | null) {
    patchData({ presentDistrictId: districtId, presentCityId: null })
    setPresentCities(districtId ? ((await listCitiesByDistrict(districtId)) as unknown as AnyRow[]) : [])
  }

  async function onPermCountryChange(countryId: number | null) {
    patchData({
      permanentCountryId: countryId,
      permanentStateId: null,
      permanentDistrictId: null,
      permanentCityId: null,
    })
    setPermStates(countryId ? ((await listStatesByCountry(countryId)) as unknown as AnyRow[]) : [])
    setPermDistricts([])
    setPermCities([])
  }

  async function onPermStateChange(stateId: number | null) {
    patchData({ permanentStateId: stateId, permanentDistrictId: null, permanentCityId: null })
    setPermDistricts(stateId ? ((await listDistrictsByState(stateId)) as unknown as AnyRow[]) : [])
    setPermCities([])
  }

  async function onPermDistrictChange(districtId: number | null) {
    patchData({ permanentDistrictId: districtId, permanentCityId: null })
    setPermCities(districtId ? ((await listCitiesByDistrict(districtId)) as unknown as AnyRow[]) : [])
  }

  function onSameAsPermanentChange(checked: boolean) {
    setSameAsPermanent(checked)
    if (!checked) return
    patchData({
      presentCountryId: data.permanentCountryId,
      presentStateId: data.permanentStateId,
      presentDistrictId: data.permanentDistrictId,
      presentCityId: data.permanentCityId,
      presentAddress: data.permanentAddress,
      presentMandal: data.permanentMandal,
      presentPincode: data.permanentPincode,
      presentStreetName: data.permanentStreet,
    })
    void (async () => {
      if (data.permanentCountryId) {
        setPresentStates((await listStatesByCountry(Number(data.permanentCountryId))) as unknown as AnyRow[])
      }
      if (data.permanentStateId) {
        setPresentDistricts((await listDistrictsByState(Number(data.permanentStateId))) as unknown as AnyRow[])
      }
      if (data.permanentDistrictId) {
        setPresentCities((await listCitiesByDistrict(Number(data.permanentDistrictId))) as unknown as AnyRow[])
      }
    })()
  }

  function goBackToList() {
    const params = new URLSearchParams()
    const collegeId = num(data, ['collegeId'])
    const academicYearId = num(data, ['academicYearId'])
    const courseId = num(data, ['courseId'])
    if (collegeId) params.set('collegeId', String(collegeId))
    if (academicYearId) params.set('academicYearId', String(academicYearId))
    if (courseId) params.set('courseId', String(courseId))
    const q = params.toString()
    router.push(
      q
        ? `/admission/application-form/application-list?${q}`
        : '/admission/application-form/application-list',
    )
  }

  function goNext() {
    if (activeStep === 'office' && Object.keys(officeErrors).length > 0) {
      setShowOfficeErrors(true)
      return
    }
    if (activeStep === 'personal' && Object.keys(personalErrors).length > 0) {
      setShowPersonalErrors(true)
      return
    }
    setActiveStep(APP_STEPS[stepIndex + 1].id)
  }

  function buildDocumentPayload(): AnyRow[] {
    const mainDocuments: AnyRow[] = []
    for (const doc of documents) {
      const hasFlag = doc.isHardCopy || doc.isSoftCopy || doc.isOriginal || doc.isVerified
      if (!hasFlag && !(isEdit && doc.appDocCollId)) continue

      const hasFile = Boolean(doc.path) || Boolean(doc.filePath)
      mainDocuments.push({
        fileName: doc.fileName,
        documentRepositoryId: doc.documentRepositoryId,
        isHardCopy: doc.isHardCopy,
        isSoftCopy: doc.isSoftCopy && hasFile,
        isOriginal: doc.isOriginal,
        isVerified: doc.isVerified,
        rackNumber: doc.rackNumber || '',
        isActive: true,
        path: doc.path ?? null,
        filePath: doc.filePath ?? null,
        ...(doc.appDocCollId ? { appDocCollId: doc.appDocCollId } : {}),
      })
    }
    return mainDocuments
  }

  async function handleSubmit() {
    if (Object.keys(officeErrors).length > 0) {
      setShowOfficeErrors(true)
      setActiveStep('office')
      return
    }
    if (Object.keys(personalErrors).length > 0) {
      setShowPersonalErrors(true)
      setActiveStep('personal')
      return
    }
    if (!workflowStageId) {
      setWorkflowError('Workflow stage is required')
      setActiveStep('terms')
      return
    }
    setWorkflowError('')
    setSubmitting(true)
    try {
      const quota = quotas.find((q) => num(q, ['generalDetailId']) === num(data, ['quotaId']))
      const stage = workflowStages.find((s) => num(s, ['workflowStageId']) === workflowStageId)
      const stageName = txt(stage ?? {}, ['wfName', 'name'])
      const currentWfId = isEdit
        ? originalWorkflowStatusId.current ?? workflowStageId
        : workflowStageId
      const currentStage = workflowStages.find((s) => num(s, ['workflowStageId']) === currentWfId)
      const currentStageName = txt(currentStage ?? {}, ['wfName', 'name']) || stageName

      const mainDocuments = buildDocumentPayload()

      const payload: AnyRow = {
        ...data,
        dob: data.dob instanceof Date ? toIsoDate(data.dob) : data.dob ? toIsoDate(new Date(String(data.dob))) : null,
        dateOfIssue:
          data.dateOfIssue instanceof Date
            ? toIsoDate(data.dateOfIssue)
            : data.dateOfIssue
              ? toIsoDate(new Date(String(data.dateOfIssue)))
              : null,
        dateOfExpiry:
          data.dateOfExpiry instanceof Date
            ? toIsoDate(data.dateOfExpiry)
            : data.dateOfExpiry
              ? toIsoDate(new Date(String(data.dateOfExpiry)))
              : null,
        adminssionDate:
          data.adminssionDate instanceof Date
            ? toIsoDate(data.adminssionDate)
            : data.adminssionDate
              ? toIsoDate(new Date(String(data.adminssionDate)))
              : null,
        dateOfRegistration:
          data.dateOfRegistration instanceof Date
            ? toIsoDate(data.dateOfRegistration)
            : data.dateOfRegistration
              ? toIsoDate(new Date(String(data.dateOfRegistration)))
              : null,
        quotaCode: txt(quota ?? {}, ['generalDetailCode']),
        isActive: true,
        organizationId: orgId || Number(readStorage('organizationId')) || null,
        stdAppEducations: ensureArray(data.studentEducationDetails),
        stdAppActivities: ensureArray(data.studentActivitiesDetails),
        stdAppDocCollections: mainDocuments.map(({ path: _path, ...rest }) => rest),
        toAppWorkflowStatusId: workflowStageId,
        currentWorkflowStatusId: currentWfId,
        currentWorkflowStatusName: currentStageName,
        toAppWorkflowStatusName: stageName,
        languageId1: data.languageId1 ?? null,
        languageId2: data.languageId2 ?? null,
        languageId3: data.languageId3 ?? null,
        langStatus1: buildLangStatus(
          Boolean(data.speak1),
          Boolean(data.read1),
          Boolean(data.write1),
          num(data, ['languageId1']) || null,
        ),
        langStatus2: buildLangStatus(
          Boolean(data.speak2),
          Boolean(data.read2),
          Boolean(data.write2),
          num(data, ['languageId2']) || null,
        ),
        langStatus3: buildLangStatus(
          Boolean(data.speak3),
          Boolean(data.read3),
          Boolean(data.write3),
          num(data, ['languageId3']) || null,
        ),
      }
      delete payload.studentEducationDetails
      delete payload.studentActivitiesDetails
      delete payload.speak1
      delete payload.read1
      delete payload.write1
      delete payload.speak2
      delete payload.read2
      delete payload.write2
      delete payload.speak3
      delete payload.read3
      delete payload.write3

      if (isEdit) {
        const updated = await updateStudentApplicationForm(payload)
        const studentAppId = num(data, ['studentAppId']) || num(updated, ['studentAppId'])
        if (studentAppId) {
          const formData = new FormData()
          formData.append('orgCode', readStorage('orgCode'))
          formData.append('collegeCode', readStorage('collegeCode'))
          formData.append('applicationId', String(studentAppId))
          formData.append(
            'applicationNumber',
            String(data.applicationNumber ?? updated.applicationNumber ?? ''),
          )
          formData.append(
            'admissionNumber',
            String(updated.admissionNumber ?? data.admissionNumber ?? ''),
          )
          if (updated.admissionId != null) {
            formData.append('admissionId', String(updated.admissionId))
          }

          let hasFiles = false
          if (photoFiles.current.student) {
            formData.append('studentPhoto', photoFiles.current.student, photoFiles.current.student.name)
            hasFiles = true
          }
          if (photoFiles.current.father) {
            formData.append('fatherPhoto', photoFiles.current.father, photoFiles.current.father.name)
            hasFiles = true
          }
          if (photoFiles.current.mother) {
            formData.append('motherPhoto', photoFiles.current.mother, photoFiles.current.mother.name)
            hasFiles = true
          }

          const docCollections = ensureArray<AnyRow>(updated.studentAppDocCollectionDTO)
          for (const coll of docCollections) {
            if (!coll.isSoftCopy) continue
            const repId = num(coll, ['documentRepositoryId', 'docRepId'])
            const local = documents.find((d) => d.documentRepositoryId === repId)
            const appDocCollId = num(coll, ['appDocCollId'])
            if (local?.path && appDocCollId) {
              formData.append(String(appDocCollId), local.path, local.path.name)
              hasFiles = true
            }
          }

          if (hasFiles) {
            await uploadUpdatedStudentApplicationFormPhotos(formData)
          }
        }

        const studentId = num(updated, ['studentId'])
        if (studentId) {
          await Promise.all([
            popStudentUserAccounts(studentId),
            popStudentFeeStructure(studentId),
          ])
        }

        toastSuccess('Application updated successfully.')
        goBackToList()
        return
      }

      const created = await createStudentApplicationForm(payload)
      const studentAppId = num(created, ['studentAppId'])
      if (studentAppId) {
        const formData = new FormData()
        formData.append('orgCode', readStorage('orgCode'))
        formData.append('collegeCode', readStorage('collegeCode'))
        formData.append('applicationId', String(studentAppId))
        formData.append('applicationNumber', String(created.applicationNumber ?? ''))
        formData.append('admissionNumber', String(created.admissionNumber ?? ''))
        if (created.admissionId != null) {
          formData.append('admissionId', String(created.admissionId))
        }

        let hasFiles = false
        if (photoFiles.current.student) {
          formData.append('studentPhoto', photoFiles.current.student, photoFiles.current.student.name)
          hasFiles = true
        }
        if (photoFiles.current.father) {
          formData.append('fatherPhoto', photoFiles.current.father, photoFiles.current.father.name)
          hasFiles = true
        }
        if (photoFiles.current.mother) {
          formData.append('motherPhoto', photoFiles.current.mother, photoFiles.current.mother.name)
          hasFiles = true
        }

        const docCollections = ensureArray<AnyRow>(created.studentAppDocCollectionDTO)
        for (const coll of docCollections) {
          if (!coll.isSoftCopy) continue
          const repId = num(coll, ['documentRepositoryId', 'docRepId'])
          const local = documents.find((d) => d.documentRepositoryId === repId)
          const appDocCollId = num(coll, ['appDocCollId'])
          if (local?.path && appDocCollId) {
            formData.append(String(appDocCollId), local.path, local.path.name)
            hasFiles = true
          }
        }

        if (hasFiles) {
          await uploadStudentApplicationFormPhotos(formData)
        }
      }

      toastSuccess('Application saved successfully.')
      goBackToList()
    } catch (e) {
      toastError(e, isEdit ? 'Failed to update application' : 'Failed to save application')
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <PageContainer className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading application…
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <ApplicationFormStepper activeStep={activeStep} progress={progress} onStepClick={setActiveStep} />

      <div className="app-card overflow-hidden p-4" data-no-page-name>
        {activeStep === 'office' && (
          <AppOfficeUseStep
            data={data}
            onChange={patchData}
            colleges={colleges}
            academicYears={academicYears}
            courses={courses}
            courseGroups={courseGroups}
            courseYears={courseYears}
            quotas={quotas}
            regulations={regulations}
            batches={batches}
            studentTypes={studentTypes}
            isEdit={isEdit}
            errors={showOfficeErrors ? officeErrors : {}}
            onCollegeChange={(id) => void onCollegeChange(id)}
            onAcademicYearChange={(id) => void onAcademicYearChange(id)}
            onCourseChange={(id) => void onCourseChange(id)}
            onCourseGroupChange={onCourseGroupChange}
            onGetDetails={() =>
              toastError(new Error('Get Details is not available for this admission type yet.'))
            }
          />
        )}
        {activeStep === 'personal' && (
          <AppPersonalInfoStep
            data={data}
            onChange={patchData}
            errors={showPersonalErrors ? personalErrors : {}}
            titles={titles}
            genders={genders}
            qualifyingExamTypes={qualifyingExamTypes}
            nationalities={nationalities}
            religions={religions}
            castes={castes}
            subCastes={subCastes}
            disabilities={disabilities}
            bloodGroups={bloodGroups}
            countries={countries}
            presentStates={presentStates}
            presentDistricts={presentDistricts}
            presentCities={presentCities}
            permStates={permStates}
            permDistricts={permDistricts}
            permCities={permCities}
            sameAsPermanent={sameAsPermanent || addressesMatch(data)}
            onSameAsPermanentChange={onSameAsPermanentChange}
            onCasteChange={(id) => void onCasteChange(id)}
            onPresentCountryChange={(id) => void onPresentCountryChange(id)}
            onPresentStateChange={(id) => void onPresentStateChange(id)}
            onPresentDistrictChange={(id) => void onPresentDistrictChange(id)}
            onPermCountryChange={(id) => void onPermCountryChange(id)}
            onPermStateChange={(id) => void onPermStateChange(id)}
            onPermDistrictChange={(id) => void onPermDistrictChange(id)}
            studentPhotoUrl={studentPhotoUrl}
            fatherPhotoUrl={fatherPhotoUrl}
            motherPhotoUrl={motherPhotoUrl}
            onStudentPhoto={(f) => {
              photoFiles.current.student = f
              previewFile(f, setStudentPhotoUrl)
            }}
            onFatherPhoto={(f) => {
              photoFiles.current.father = f
              previewFile(f, setFatherPhotoUrl)
            }}
            onMotherPhoto={(f) => {
              photoFiles.current.mother = f
              previewFile(f, setMotherPhotoUrl)
            }}
          />
        )}
        {activeStep === 'education' && (
          <AppEducationStep
            data={data}
            onChange={patchData}
            languages={languages}
            onAddEducation={() =>
              patchData({
                studentEducationDetails: [
                  ...ensureArray(data.studentEducationDetails),
                  emptyEducationRow(),
                ],
              })
            }
            onRemoveEducation={(index) => {
              const next = ensureArray(data.studentEducationDetails).filter((_, i) => i !== index)
              patchData({ studentEducationDetails: next.length ? next : [emptyEducationRow()] })
            }}
          />
        )}
        {activeStep === 'activities' && (
          <AppActivitiesStep
            data={data}
            onChange={patchData}
            onAddActivity={() =>
              patchData({
                studentActivitiesDetails: [
                  ...ensureArray(data.studentActivitiesDetails),
                  emptyActivityRow(),
                ],
              })
            }
            onRemoveActivity={(index) => {
              const next = ensureArray(data.studentActivitiesDetails).filter((_, i) => i !== index)
              patchData({ studentActivitiesDetails: next.length ? next : [emptyActivityRow()] })
            }}
          />
        )}
        {activeStep === 'certificates' && (
          <AppCertificatesStep
            documents={documents}
            onChange={(index, patch) =>
              setDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
            }
          />
        )}
        {activeStep === 'terms' && (
          <TermsStep
            workflowStageId={workflowStageId}
            workflowStages={workflowStages}
            onChange={(id) => {
              setWorkflowStageId(id)
              setWorkflowError('')
            }}
            error={workflowError}
          />
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={isFirst ? goBackToList : () => setActiveStep(APP_STEPS[stepIndex - 1].id)}
          >
            {isFirst ? (
              'Back'
            ) : (
              <>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </>
            )}
          </Button>
          {isLast ? (
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Submit'
              )}
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
