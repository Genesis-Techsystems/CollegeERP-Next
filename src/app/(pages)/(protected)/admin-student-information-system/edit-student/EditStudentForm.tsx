'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  listAcademicYearsForReadmission,
  listBatchesByCourse,
  listCastes,
  listCountries,
  listCoursesForUniversityCascade,
  listCourseGroupsForCourseCascade,
  listCitiesByDistrict,
  listDistrictsByState,
  listDocumentRepositoriesForStudentByCollege,
  listGeneralDetailsByCode,
  listStatesByCountry,
  listStudentCourseYearsByCourse,
  listStudentRegulationsByCourse,
  listSubCastesByCasteId,
  listActiveCollegesForGeneralSettings,
  resolveUniversityIdForReadmission,
  saveStudentDetail,
  uploadStudentDetailFiles,
  uploadStudentSignatureFile,
} from '@/services'
import { EditStudentStepper } from './EditStudentStepper'
import { OfficeUseStep } from './OfficeUseStep'
import { PersonalInfoStep } from './PersonalInfoStep'
import { EducationStep } from './EducationStep'
import { ActivitiesStep } from './ActivitiesStep'
import { CertificatesStep } from './CertificatesStep'
import {
  EDIT_STEPS,
  GM_EDIT_CODES,
  addressesMatch,
  buildLangStatus,
  ensureArray,
  initLanguageFlags,
  mergeStudentDocuments,
  num,
  photoSrc,
  toIsoDate,
  type AnyRow,
  type EditStepId,
  type StudentDocumentRow,
} from './edit-student-utils'

export interface EditStudentFormProps {
  initialData: AnyRow
  check: number
}

type PhotoFiles = {
  student?: File
  father?: File
  mother?: File
  signature?: File
}

function readStorage(key: string): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

export function EditStudentForm({ initialData, check }: EditStudentFormProps) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState<EditStepId>('office')
  const [data, setData] = useState<AnyRow>(() => initLanguageFlags(initialData))
  const [documents, setDocuments] = useState<StudentDocumentRow[]>([])
  const [sameAsPermanent, setSameAsPermanent] = useState(() => addressesMatch(initialData))
  const [submitting, setSubmitting] = useState(false)
  const [removedEducation, setRemovedEducation] = useState<AnyRow[]>([])
  const [removedActivities, setRemovedActivities] = useState<AnyRow[]>([])
  const photoFiles = useRef<PhotoFiles>({})

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

  const [studentPhotoUrl, setStudentPhotoUrl] = useState(() => photoSrc(initialData.studentPhotoPath))
  const [fatherPhotoUrl, setFatherPhotoUrl] = useState(() => photoSrc(initialData.fatherPhotoPath))
  const [motherPhotoUrl, setMotherPhotoUrl] = useState(() => photoSrc(initialData.motherPhotoPath))
  const [signaturePhotoUrl, setSignaturePhotoUrl] = useState(() => photoSrc(initialData.studentSignaturePath))

  const progress = useMemo(() => EDIT_STEPS.find((s) => s.id === activeStep)?.progress ?? 20, [activeStep])
  const stepIndex = EDIT_STEPS.findIndex((s) => s.id === activeStep)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === EDIT_STEPS.length - 1

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

  const loadDocuments = useCallback(async (collegeId: number) => {
    const repos = await listDocumentRepositoriesForStudentByCollege(collegeId)
    setDocuments(mergeStudentDocuments(repos, ensureArray(initialData.studentDocumentCollections)))
  }, [initialData.studentDocumentCollections])

  const loadCollegeCascade = useCallback(async (collegeId: number, courseId?: number, courseGroupId?: number) => {
    const univ = await resolveUniversityIdForReadmission({ collegeId }, 0)
    const [ays, crs] = await Promise.all([
      listAcademicYearsForReadmission(univ, collegeId),
      univ ? listCoursesForUniversityCascade(univ) : Promise.resolve([] as AnyRow[]),
    ])
    setAcademicYears(ays)
    setCourses(crs)
    await loadDocuments(collegeId)
    if (courseId) {
      const [cgs, bts, regs] = await Promise.all([
        listCourseGroupsForCourseCascade(courseId),
        listBatchesByCourse(courseId),
        listStudentRegulationsByCourse(courseId),
      ])
      setCourseGroups(cgs)
      setBatches(bts)
      setRegulations(regs)
      if (courseGroupId || data.courseGroupId) {
        const cy = await listStudentCourseYearsByCourse(courseId)
        setCourseYears(cy)
      }
    }
  }, [data.courseGroupId, loadDocuments])

  useEffect(() => {
    void (async () => {
      try {
        const [clg, casteRows, countryRows] = await Promise.all([
          listActiveCollegesForGeneralSettings(),
          listCastes(),
          listCountries(),
        ])
        setColleges(clg as AnyRow[])
        setCastes(casteRows as AnyRow[])
        setCountries(countryRows as AnyRow[])
        await loadGm()
        const collegeId = num(initialData, ['collegeId', 'fk_college_id'])
        if (collegeId) {
          await loadCollegeCascade(collegeId, num(initialData, ['courseId']), num(initialData, ['courseGroupId']))
        }
        const casteId = num(initialData, ['casteId'])
        if (casteId) setSubCastes(await listSubCastesByCasteId(casteId))
        if (initialData.presentCountryId) setPresentStates(await listStatesByCountry(Number(initialData.presentCountryId)))
        if (initialData.presentStateId) setPresentDistricts(await listDistrictsByState(Number(initialData.presentStateId)))
        if (initialData.presentDistrictId) setPresentCities(await listCitiesByDistrict(Number(initialData.presentDistrictId)))
        if (initialData.permanentCountryId) setPermStates(await listStatesByCountry(Number(initialData.permanentCountryId)))
        if (initialData.permanentStateId) setPermDistricts(await listDistrictsByState(Number(initialData.permanentStateId)))
        if (initialData.permanentDistrictId) setPermCities(await listCitiesByDistrict(Number(initialData.permanentDistrictId)))
      } catch (e) {
        toastError(e, 'Failed to load form options')
      }
    })()
  }, [initialData, loadCollegeCascade, loadGm])

  async function onCollegeChange(collegeId: number | null) {
    patchData({ collegeId, courseId: null, courseGroupId: null, courseYearId: null })
    setCourses([])
    setCourseGroups([])
    setCourseYears([])
    setBatches([])
    setRegulations([])
    if (!collegeId) return
    await loadCollegeCascade(collegeId)
  }

  async function onCourseChange(courseId: number | null) {
    patchData({ courseId, courseGroupId: null, courseYearId: null })
    setCourseGroups([])
    setCourseYears([])
    if (!courseId) return
    const [cgs, bts, regs] = await Promise.all([
      listCourseGroupsForCourseCascade(courseId),
      listBatchesByCourse(courseId),
      listStudentRegulationsByCourse(courseId),
    ])
    setCourseGroups(cgs)
    setBatches(bts)
    setRegulations(regs)
  }

  async function onCourseGroupChange(courseGroupId: number | null) {
    patchData({ courseGroupId, courseYearId: null })
    setCourseYears([])
    const courseId = num(data, ['courseId'])
    if (!courseId) return
    setCourseYears(await listStudentCourseYearsByCourse(courseId))
  }

  async function onCasteChange(casteId: number | null) {
    patchData({ casteId, subCasteId: null })
    setSubCastes(casteId ? await listSubCastesByCasteId(casteId) : [])
  }

  async function onPresentCountryChange(countryId: number | null) {
    patchData({ presentCountryId: countryId, presentStateId: null, presentDistrictId: null, presentCityId: null })
    setPresentStates(countryId ? await listStatesByCountry(countryId) : [])
    setPresentDistricts([])
    setPresentCities([])
  }

  async function onPresentStateChange(stateId: number | null) {
    patchData({ presentStateId: stateId, presentDistrictId: null, presentCityId: null })
    setPresentDistricts(stateId ? await listDistrictsByState(stateId) : [])
    setPresentCities([])
  }

  async function onPresentDistrictChange(districtId: number | null) {
    patchData({ presentDistrictId: districtId, presentCityId: null })
    setPresentCities(districtId ? await listCitiesByDistrict(districtId) : [])
  }

  async function onPermCountryChange(countryId: number | null) {
    patchData({ permanentCountryId: countryId, permanentStateId: null, permanentDistrictId: null, permanentCityId: null })
    setPermStates(countryId ? await listStatesByCountry(countryId) : [])
    setPermDistricts([])
    setPermCities([])
  }

  async function onPermStateChange(stateId: number | null) {
    patchData({ permanentStateId: stateId, permanentDistrictId: null, permanentCityId: null })
    setPermDistricts(stateId ? await listDistrictsByState(stateId) : [])
    setPermCities([])
  }

  async function onPermDistrictChange(districtId: number | null) {
    patchData({ permanentDistrictId: districtId, permanentCityId: null })
    setPermCities(districtId ? await listCitiesByDistrict(districtId) : [])
  }

  function onSameAsPermanentChange(checked: boolean) {
    setSameAsPermanent(checked)
    if (!checked) return
    patchData({
      presentAddress: data.permanentAddress,
      presentCountryId: data.permanentCountryId,
      presentStateId: data.permanentStateId,
      presentDistrictId: data.permanentDistrictId,
      presentCityId: data.permanentCityId,
      presentStreetName: data.permanentStreet,
      presentMandal: data.permanentMandal,
      presentPincode: data.permanentPincode,
    })
    void (async () => {
      if (data.permanentCountryId) setPresentStates(await listStatesByCountry(Number(data.permanentCountryId)))
      if (data.permanentStateId) setPresentDistricts(await listDistrictsByState(Number(data.permanentStateId)))
      if (data.permanentDistrictId) setPresentCities(await listCitiesByDistrict(Number(data.permanentDistrictId)))
    })()
  }

  function previewFile(file: File, setter: (url: string) => void) {
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }

  function goBackToList() {
    const params = new URLSearchParams()
    params.set('check', String(check))
    if (check === 1) {
      if (data.collegeId) params.set('collegeId', String(data.collegeId))
      if (data.academicYearId) params.set('academicYearId', String(data.academicYearId))
      if (data.rollNumber) params.set('rollNumber', String(data.rollNumber))
      if (data.studentId) params.set('studentId', String(data.studentId))
    } else if (check === 2) {
      if (data.collegeId) params.set('collegeId', String(data.collegeId))
      if (data.academicYearId) params.set('academicYearId', String(data.academicYearId))
      if (data.courseId) params.set('courseId', String(data.courseId))
      if (data.courseGroupId) params.set('courseGroupId', String(data.courseGroupId))
      if (data.courseYearId) params.set('courseYearId', String(data.courseYearId))
      if (data.groupSectionId) params.set('groupSectionId', String(data.groupSectionId))
    }
    router.push(`/admin-student-information-system/students-list?${params.toString()}`)
  }

  function buildPayload(): Record<string, unknown> {
    const quotaRow = quotas.find((q) => num(q, ['generalDetailId']) === num(data, ['quotaId']))
    const education = [...ensureArray(data.studentEducationDetails), ...removedEducation]
    const activities = [...ensureArray(data.studentActivitiesDetails), ...removedActivities]

    const mainDocuments: StudentDocumentRow[] = []
    for (const doc of documents) {
      const flagged = doc.isHardCopy || doc.isSoftCopy || doc.isOriginal || doc.isVerified
      if (flagged || doc.stdDocCollId) {
        const row = { ...doc, docRepId: doc.documentRepositoryId, isActive: true }
        if (!doc.path && !doc.filePath && doc.isSoftCopy) row.isSoftCopy = false
        mainDocuments.push(row)
      }
    }

    return {
      ...data,
      adminssionDate: toIsoDate(data.adminssionDate instanceof Date ? data.adminssionDate : data.adminssionDate ? new Date(data.adminssionDate) : null),
      dateOfRegistration: toIsoDate(data.dateOfRegistration instanceof Date ? data.dateOfRegistration : data.dateOfRegistration ? new Date(data.dateOfRegistration) : null),
      dateOfBirth: toIsoDate(data.dateOfBirth instanceof Date ? data.dateOfBirth : data.dateOfBirth ? new Date(data.dateOfBirth) : null),
      dateOfIssue: toIsoDate(data.dateOfIssue instanceof Date ? data.dateOfIssue : data.dateOfIssue ? new Date(data.dateOfIssue) : null),
      dateOfExpiry: toIsoDate(data.dateOfExpiry instanceof Date ? data.dateOfExpiry : data.dateOfExpiry ? new Date(data.dateOfExpiry) : null),
      quotaCode: quotaRow?.generalDetailCode ?? data.quotaCode,
      studentPhotoPath: data.studentPhotoPath,
      fatherPhotoPath: data.fatherPhotoPath,
      motherPhotoPath: data.motherPhotoPath,
      studentSignaturePath: data.studentSignaturePath,
      organizationId: Number(readStorage('organizationId') || data.organizationId || 0),
      isActive: true,
      studentEducationDetails: education,
      studentActivitiesDetails: activities,
      studentDocumentCollections: mainDocuments,
      langStatus1: buildLangStatus(Boolean(data.speak1), Boolean(data.read1), Boolean(data.write1), data.language1Id),
      langStatus2: buildLangStatus(Boolean(data.speak2), Boolean(data.read2), Boolean(data.write2), data.language2Id),
      langStatus3: buildLangStatus(Boolean(data.speak3), Boolean(data.read3), Boolean(data.write3), data.language3Id),
    }
  }

  async function handleSubmit() {
    if (!data.firstName?.trim() || !data.mobile?.trim() || !data.dateOfBirth) {
      toastError(new Error('Please complete required personal fields (name, mobile, date of birth).'), 'Validation')
      setActiveStep('personal')
      return
    }
    setSubmitting(true)
    try {
      const payload = buildPayload()
      const result = (await saveStudentDetail(payload)) as AnyRow
      const collections = ensureArray<AnyRow>(result?.studentDocumentCollections ?? result?.data?.studentDocumentCollections)

      const formData = new FormData()
      formData.append('orgCode', readStorage('orgCode'))
      formData.append('collegeCode', readStorage('collegeCode'))
      formData.append('studentId', String(data.studentId))
      formData.append('studentAadharFileName', '')
      formData.append('studentPancardFileName', '')
      formData.append('spousePhotoFileName', '')
      formData.append('studentPhotoFileName', String(data.studentPhotoPath ?? ''))
      formData.append('fatherPhotoFileName', String(data.fatherPhotoPath ?? ''))
      formData.append('motherPhotoFileName', String(data.motherPhotoPath ?? ''))

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

      for (const coll of collections) {
        const repId = num(coll, ['docRepId', 'documentRepositoryId'])
        const local = documents.find((d) => d.documentRepositoryId === repId)
        if (coll.isSoftCopy && local?.path) {
          formData.append(String(coll.stdDocCollId), local.path, local.path.name)
          hasFiles = true
        }
      }

      if (hasFiles) await uploadStudentDetailFiles(formData)

      if (photoFiles.current.signature) {
        const sig = new FormData()
        sig.append('file', photoFiles.current.signature, photoFiles.current.signature.name)
        sig.append('hallticketNumber', String(data.rollNumber ?? data.hallticketNumber ?? ''))
        await uploadStudentSignatureFile(sig)
      }

      toastSuccess('Student details saved successfully.')
      goBackToList()
    } catch (e) {
      toastError(e, 'Failed to save student details')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <EditStudentStepper activeStep={activeStep} progress={progress} onStepClick={setActiveStep} />

      <div className="app-card overflow-hidden p-4" data-no-page-name>
        {activeStep === 'office' && (
          <OfficeUseStep
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
            onCollegeChange={onCollegeChange}
            onCourseChange={onCourseChange}
            onCourseGroupChange={onCourseGroupChange}
          />
        )}
        {activeStep === 'personal' && (
          <PersonalInfoStep
            data={data}
            onChange={patchData}
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
            sameAsPermanent={sameAsPermanent}
            onSameAsPermanentChange={onSameAsPermanentChange}
            onCasteChange={onCasteChange}
            onPresentCountryChange={onPresentCountryChange}
            onPresentStateChange={onPresentStateChange}
            onPresentDistrictChange={onPresentDistrictChange}
            onPermCountryChange={onPermCountryChange}
            onPermStateChange={onPermStateChange}
            onPermDistrictChange={onPermDistrictChange}
            studentPhotoUrl={studentPhotoUrl}
            fatherPhotoUrl={fatherPhotoUrl}
            motherPhotoUrl={motherPhotoUrl}
            signaturePhotoUrl={signaturePhotoUrl}
            onStudentPhoto={(f) => { photoFiles.current.student = f; previewFile(f, setStudentPhotoUrl) }}
            onFatherPhoto={(f) => { photoFiles.current.father = f; previewFile(f, setFatherPhotoUrl) }}
            onMotherPhoto={(f) => { photoFiles.current.mother = f; previewFile(f, setMotherPhotoUrl) }}
            onSignaturePhoto={(f) => { photoFiles.current.signature = f; previewFile(f, setSignaturePhotoUrl) }}
          />
        )}
        {activeStep === 'education' && (
          <EducationStep
            data={data}
            onChange={patchData}
            languages={languages}
            onAddEducation={() => patchData({
              studentEducationDetails: [
                ...ensureArray(data.studentEducationDetails),
                { nameOfInstitution: '', board: '', address: '', majorSubjects: '', medium: '', gradeClassSecured: '', yearOfCompletion: '', precentage: '', studentId: data.studentId, isActive: true },
              ],
            })}
            onRemoveEducation={(index, item) => {
              const next = ensureArray(data.studentEducationDetails).filter((_, i) => i !== index)
              if (item.appEducationId) setRemovedEducation((prev) => [...prev, { ...item, isActive: false }])
              patchData({ studentEducationDetails: next })
            }}
          />
        )}
        {activeStep === 'activities' && (
          <ActivitiesStep
            data={data}
            onChange={patchData}
            onAddActivity={() => patchData({
              studentActivitiesDetails: [
                ...ensureArray(data.studentActivitiesDetails),
                { particulars: '', level: '', sponsoredBy: '', studentId: data.studentId, isActive: true },
              ],
            })}
            onRemoveActivity={(index, item) => {
              const next = ensureArray(data.studentActivitiesDetails).filter((_, i) => i !== index)
              if (item.studentAppActivityId) setRemovedActivities((prev) => [...prev, { ...item, isActive: false }])
              patchData({ studentActivitiesDetails: next })
            }}
          />
        )}
        {activeStep === 'certificates' && (
          <CertificatesStep
            documents={documents}
            onChange={(index, patch) => setDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))}
          />
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={isFirst ? goBackToList : () => setActiveStep(EDIT_STEPS[stepIndex - 1].id)}>
            {isFirst ? 'Back' : <><ChevronLeft className="mr-1 h-4 w-4" />Back</>}
          </Button>
          {isLast ? (
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Submit'}
            </Button>
          ) : (
            <Button type="button" onClick={() => setActiveStep(EDIT_STEPS[stepIndex + 1].id)}>
              Next<ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
