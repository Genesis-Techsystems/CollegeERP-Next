import { ADMISSION_API, NEXT_API, STUDENT_API, UNIVERSITY_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { GM_CODES } from '@/config/constants/ui'
import type { ApiResponse } from '@/types/api'
import type {
  AdmissionAllotmentDetailRow,
  AdmissionAllotmentPayload,
  AdmissionAllotmentRow,
  CasteQuotaPayload,
  CasteQuotaRow,
  CollegeCounsellingPayload,
  CollegeCounsellingRow,
  FeePaidApplicationRow,
  StudentApplicationFormRow,
  StudentEnquiryPayload,
  StudentEnquiryRow,
  UnivStdApplicationRow,
} from '@/types/admission'
import { AppError, parseApiError } from '@/lib/errors'
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
  getAllRecords,
  postDetails,
  putDetails,
  uploadFile,
} from './crud'
import { getFeeMasterCollegeFilters } from './fee-masters'

export { getFeeMasterCollegeFilters as getAdmissionCollegeFilters }

type AnyRow = Record<string, unknown>

export type AdmissionUnivFilters = {
  filtersData: AnyRow[]
  academicData: AnyRow[]
  /** `clg_filters_batches` group from `s_get_univwisedetails_bycode` — used for batch dropdowns. */
  batchesData: AnyRow[]
}

function splitUnivProcGroups(groups: AnyRow[][]): AdmissionUnivFilters {
  let filtersData: AnyRow[] = []
  let academicData: AnyRow[] = []
  let batchesData: AnyRow[] = []

  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue
    const first = group[0] ?? {}
    if (first.flag === 'clg_filters') filtersData = group
    if (first.clg_filters_ay === 'clg_filters_ay') academicData = group
    if (
      first.clg_filters_batches === 'clg_filters_batches' ||
      first.flag === 'clg_filters_batches'
    ) {
      batchesData = group
    }
  }

  if (filtersData.length === 0) {
    const clgGroup = groups.find(
      (g) => Array.isArray(g) && g.length > 0 && String(g[0]?.flag ?? '') === 'clg_filters',
    )
    if (clgGroup?.length) filtersData = clgGroup
  }

  if (batchesData.length === 0) {
    const batchGroup = groups.find((g) => {
      if (!Array.isArray(g) || g.length === 0) return false
      return g.some(
        (r) =>
          Number(r?.fk_batch_id ?? r?.batchId ?? 0) > 0 &&
          String(r?.batch_name ?? r?.batchName ?? '').trim() !== '',
      )
    })
    if (batchGroup?.length) batchesData = batchGroup
  }

  return { filtersData, academicData, batchesData }
}

/** Univ-wise proc filters including the batches array (Angular admission-allotment modal). */
export async function getAdmissionUnivFilters(
  orgId: number,
  employeeId: number,
): Promise<AdmissionUnivFilters> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_univwisedetails_bycode', {
    in_flag: 'clg_filters',
    in_org_id: orgId || 0,
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_loginuser_empid: employeeId || 0,
    in_loginuser_roleid: 0,
    in_subject: '',
    in_employee: '',
    in_gm_codes: '',
  })

  const groups = Array.isArray(data?.result) ? data.result : []
  return splitUnivProcGroups(groups)
}

export async function listStudentApplicationForms(params: {
  collegeId: number
  academicYearId: number
  courseId: number
}): Promise<StudentApplicationFormRow[]> {
  // Angular: domain/list/StudentApplication?query=College.collegeId==..and.
  // AcademicYear.academicYearId==..and.Course.courseId==.. (the trailing
  // `&status==true` is a separate ignored URL param, not part of the query).
  const query = buildQuery({
    'College.collegeId': params.collegeId,
    'AcademicYear.academicYearId': params.academicYearId,
    'Course.courseId': params.courseId,
  })
  const rows = await domainList<StudentApplicationFormRow>(
    ADMISSION_API.STUDENT_APPLICATION,
    query,
  )
  return rows.sort((a, b) => Number(b.studentAppId ?? 0) - Number(a.studentAppId ?? 0))
}

export async function listStudentEnquiries(filters?: {
  organizationId?: number
  collegeId?: number
  courseId?: number
}): Promise<StudentEnquiryRow[]> {
  if (filters?.organizationId && filters.collegeId && filters.courseId) {
    // Angular: Organization.organizationId==&College.collegeId==&Course.courseId== (no isActive)
    const query = buildQuery({
      'Organization.organizationId': filters.organizationId,
      'College.collegeId': filters.collegeId,
      'Course.courseId': filters.courseId,
    })
    return domainList<StudentEnquiryRow>(ADMISSION_API.STUDENT_ENQUIRY, query)
  }
  return domainList<StudentEnquiryRow>(ADMISSION_API.STUDENT_ENQUIRY)
}

export async function createStudentEnquiry(payload: StudentEnquiryPayload): Promise<void> {
  await domainCreate(ADMISSION_API.STUDENT_ENQUIRY, payload)
}

export async function updateStudentEnquiry(
  enquiryId: number,
  payload: StudentEnquiryPayload,
): Promise<void> {
  await domainUpdate(ADMISSION_API.STUDENT_ENQUIRY, ENTITIES.STUDENT_ENQUIRY.pk, enquiryId, payload)
}

export async function getStudentEnquiryById(enquiryId: number): Promise<StudentEnquiryRow | null> {
  if (!enquiryId) return null
  const queries = [
    buildQuery({ enquiryId, isActive: true }),
    buildQuery({ 'StudentEnquiry.enquiryId': enquiryId, isActive: true }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<StudentEnquiryRow>(ADMISSION_API.STUDENT_ENQUIRY, query)
      if (rows[0]) return rows[0]
    } catch {
      // try next query shape
    }
  }
  return null
}

export async function listQualificationsByOrganization(organizationId: number) {
  if (!organizationId) return []
  return domainList<Record<string, unknown>>(
    'Qualification',
    buildQuery({ 'Organization.organizationId': organizationId, isActive: true }),
  )
}

export async function listQualificationGroupsByQualification(qualificationId: number) {
  if (!qualificationId) return []
  return domainList<Record<string, unknown>>(
    'QualificationGroup',
    buildQuery({ 'Qualification.qualificationId': qualificationId, isActive: true }),
  )
}

export async function listCasteQuotas(): Promise<CasteQuotaRow[]> {
  return domainList<CasteQuotaRow>(UNIVERSITY_API.CASTE_QUOTA)
}

export async function createCasteQuota(payload: CasteQuotaPayload): Promise<void> {
  await domainCreate(UNIVERSITY_API.CASTE_QUOTA, payload)
}

export async function updateCasteQuota(payload: CasteQuotaPayload): Promise<void> {
  const id = payload.casteQuotaId
  if (!id) throw new AppError('VALIDATION', 'casteQuotaId is required for update')
  await domainUpdate(UNIVERSITY_API.CASTE_QUOTA, ENTITIES.CASTE_QUOTA.pk, id, payload)
}

export async function listCollegeCounselling(params: {
  collegeId: number
  batchId: number
  courseGroupId: number
}): Promise<CollegeCounsellingRow[]> {
  // Angular `listDetailsByThreeIdsEqul`: College.collegeId, batch.batchId, CourseGroup.courseGroupId, order(createdDt=DESC) — no isActive filter
  const query = buildQuery(
    {
      'College.collegeId': params.collegeId,
      'batch.batchId': params.batchId,
      'CourseGroup.courseGroupId': params.courseGroupId,
    },
    { field: 'createdDt', direction: 'DESC' },
  )
  return domainList<CollegeCounsellingRow>(UNIVERSITY_API.COLLEGE_COUNSELLING, query)
}

export async function createCollegeCounselling(payload: CollegeCounsellingPayload): Promise<void> {
  await domainCreate(UNIVERSITY_API.COLLEGE_COUNSELLING, payload)
}

export async function updateCollegeCounselling(payload: CollegeCounsellingPayload): Promise<void> {
  const id = payload.univCollegeCounsellingId
  if (!id) throw new AppError('VALIDATION', 'univCollegeCounsellingId is required for update')
  await domainUpdate(
    UNIVERSITY_API.COLLEGE_COUNSELLING,
    ENTITIES.UNIV_COLLEGE_COUNSELLING.pk,
    id,
    payload,
  )
}

export async function listUnivStdApplications(): Promise<UnivStdApplicationRow[]> {
  const query = buildQuery({ isActive: true }, { field: 'sortOrder', direction: 'ASC' })
  return domainList<UnivStdApplicationRow>(UNIVERSITY_API.STD_APPLICATIONS, query)
}

export async function updateUnivStdApplication(formData: FormData): Promise<void> {
  const res = await fetch(`/api/proxy/${ADMISSION_API.UPDATE_UNIV_STUDENT_APPLICATION}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw parseApiError(res, body)
  }
  const body = (await res.json()) as ApiResponse<unknown>
  if (!body.success) throw new AppError('API_ERROR', body.message ?? 'Update failed')
}

export async function searchUnivStdApplications(q: string): Promise<UnivStdApplicationRow[]> {
  if (q.trim().length < 4) return []
  const query = buildQuery({ q: q.trim() })
  return domainList<UnivStdApplicationRow>(ADMISSION_API.STD_APPLICATIONS_SEARCH, query)
}

export async function listFeePaidApplications(params: {
  universityId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  applicationNo?: string
}): Promise<FeePaidApplicationRow[]> {
  const data = await getAllRecords<{ result?: FeePaidApplicationRow[] }>(
    's_get_std_application_fee_paid_list',
    {
      in_university_id: params.universityId || 0,
      in_clg_id: params.collegeId || 0,
      in_course_id: params.courseId || 0,
      in_course_group_id: params.courseGroupId || 0,
      in_application_no: params.applicationNo ?? '',
    },
  )
  return Array.isArray(data?.result) ? data.result : []
}

export async function listAdmissionAllotments(collegeId: number): Promise<AdmissionAllotmentRow[]> {
  // Include inactive rows so Status can show Inactive in the grid.
  const query = buildQuery({ 'college.collegeId': collegeId })
  return domainList<AdmissionAllotmentRow>(UNIVERSITY_API.ADMISSION_ALLOTMENT, query)
}

type AllotmentDetailApiRow = Record<string, unknown> & {
  univAdmission_Allotment?: AdmissionAllotmentRow
  univAdmissionAllotment_Details?: AdmissionAllotmentDetailRow
}

/** Angular `getUnivAdmissionAllotmentAndDetails` — flattened consolidate rows. */
export async function listAdmissionAllotmentConsolidate(
  collegeId: number,
): Promise<AdmissionAllotmentDetailRow[]> {
  const data = await fetchDetails<AllotmentDetailApiRow[] | AllotmentDetailApiRow>(
    UNIVERSITY_API.GET_ADMISSION_ALLOTMENT_DETAILS,
    { collegeId: String(collegeId) },
  )
  const rows = Array.isArray(data) ? data : data ? [data] : []
  return rows.map((item) => {
    const header = item.univAdmission_Allotment ?? {}
    const detail = item.univAdmissionAllotment_Details ?? {}
    return {
      ...header,
      ...detail,
      collegeCode: header.collegeCode ?? detail.collegeCode,
      courseCode: header.courseCode ?? detail.courseCode,
      courseGroupCode: header.courseGroupCode ?? detail.courseGroupCode,
      batchName: header.batchName ?? detail.batchName,
      quotaCatdetCode: detail.quotaCatdetCode,
      quotaCatdetName: detail.quotaCatdetName ?? detail.quotaCatdetCode,
    } as AdmissionAllotmentDetailRow
  })
}

export async function createAdmissionAllotment(payload: AdmissionAllotmentPayload): Promise<void> {
  await domainCreate(UNIVERSITY_API.ADMISSION_ALLOTMENT, payload)
}

export async function updateAdmissionAllotment(
  id: number,
  payload: AdmissionAllotmentPayload,
): Promise<void> {
  await domainUpdate(
    UNIVERSITY_API.ADMISSION_ALLOTMENT,
    ENTITIES.UNIV_ADMISSION_ALLOTMENT.pk,
    id,
    payload,
  )
}

/** List details for an allotment (active and inactive). */
export async function listAdmissionAllotmentDetails(
  univAdmissionAllotmentId: number,
): Promise<AdmissionAllotmentDetailRow[]> {
  const query = buildQuery({
    'UnivAdmissionAllotment.univAdmissionAllotmentId': univAdmissionAllotmentId,
  })
  return domainList<AdmissionAllotmentDetailRow>(
    UNIVERSITY_API.ADMISSION_ALLOTMENT_DETAILS,
    query,
  )
}

export async function createAdmissionAllotmentDetail(
  payload: Record<string, unknown>,
): Promise<void> {
  await domainCreate(UNIVERSITY_API.ADMISSION_ALLOTMENT_DETAILS, payload)
}

export async function updateAdmissionAllotmentDetail(
  id: number,
  payload: Record<string, unknown>,
): Promise<void> {
  await domainUpdate(
    UNIVERSITY_API.ADMISSION_ALLOTMENT_DETAILS,
    ENTITIES.UNIV_ADMISSION_ALLOTMENT_DETAILS.pk,
    id,
    payload,
  )
}

/** Opens admission report PDF in a new tab (Angular `studentadmissionreport/{admissionNumber}`). */
export function openAdmissionReport(admissionNumber: string): void {
  const url = `/api/proxy/${ADMISSION_API.STUDENT_ADMISSION_REPORT}/${encodeURIComponent(admissionNumber)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function downloadAdmissionReport(
  admissionNumber: string,
  fileName: string,
): Promise<void> {
  const res = await fetch(
    `/api/proxy/${ADMISSION_API.STUDENT_ADMISSION_REPORT}/${encodeURIComponent(admissionNumber)}`,
    { credentials: 'include' },
  )
  if (!res.ok) throw parseApiError(res, await res.json().catch(() => null))
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'admission-report.pdf'
  a.click()
  URL.revokeObjectURL(url)
}

/** Angular `POST studentapplicationform` — create new admission application. */
export async function createStudentApplicationForm(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return postDetails<AnyRow>(ADMISSION_API.STUDENT_APPLICATION_FORM, payload)
}

/** Angular `PUT studentapplicationform` — update existing application. */
export async function updateStudentApplicationForm(
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return putDetails<AnyRow>(ADMISSION_API.STUDENT_APPLICATION_FORM, payload)
}

/**
 * Angular `GET studentapplicationform/{applicationNumber}/{collegeId}`.
 * Response `data` is an array — return the first row.
 */
export async function getStudentApplicationFormById(
  applicationNumber: string,
  collegeId: number,
): Promise<AnyRow | null> {
  if (!applicationNumber || !collegeId) return null
  const url = NEXT_API.PROXY(
    `${ADMISSION_API.STUDENT_APPLICATION_FORM}/${encodeURIComponent(applicationNumber)}/${collegeId}`,
  )
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' })
  if (!res.ok) {
    throw parseApiError(res, await res.json().catch(() => null))
  }
  const body = (await res.json()) as ApiResponse<AnyRow[] | AnyRow>
  if (!body.success) {
    throw new AppError(
      'API_ERROR',
      body.message ?? 'Failed to load student application form',
    )
  }
  const data = body.data
  if (Array.isArray(data)) return (data[0] as AnyRow) ?? null
  return (data as AnyRow) ?? null
}

/** Angular `POST studentapplicationformphotos` — photos + soft-copy docs after create. */
export async function uploadStudentApplicationFormPhotos(
  formData: FormData,
): Promise<void> {
  await uploadFile(STUDENT_API.UPLOAD_PHOTOS, formData)
}

/** Angular `POST updatestudentapplicationformphotos` — after update. */
export async function uploadUpdatedStudentApplicationFormPhotos(
  formData: FormData,
): Promise<void> {
  await uploadFile(STUDENT_API.UPDATE_PHOTOS, formData)
}

/** Angular post-save: `s_pop_user_accounts` for the created/updated student. */
export async function popStudentUserAccounts(studentId: number): Promise<void> {
  if (!studentId) return
  await getAllRecords('s_pop_user_accounts', {
    in_flag: 'student',
    in_university_id: 0,
    in_college_id: 0,
    in_std_id: studentId,
  })
}

/** Angular post-save: `s_pop_student_fee_Structure` for the student. */
export async function popStudentFeeStructure(studentId: number): Promise<void> {
  if (!studentId) return
  await getAllRecords('s_pop_student_fee_Structure', {
    in_flag: 'batch_fee_load_std',
    in_structure_ids: '',
    in_course_group_ids: '',
    in_student_ids: studentId,
  })
}

/**
 * Angular DocumentRepository filter for application form:
 * College.collegeId + Course.courseId + isForStudent + isActive.
 */
export async function listDocumentRepositoriesForApplication(params: {
  collegeId: number
  courseId: number
}): Promise<AnyRow[]> {
  const { collegeId, courseId } = params
  if (!collegeId || !courseId) return []
  const queries = [
    buildQuery({
      'College.collegeId': collegeId,
      'Course.courseId': courseId,
      isForStudent: true,
      isActive: true,
    }),
    buildQuery({
      collegeId,
      courseId,
      isForStudent: true,
      isActive: true,
    }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('DocumentRepository', query)
      if (rows.length > 0) return rows
    } catch {
      // next shape
    }
  }
  return []
}

/**
 * Angular WorkflowStage for StdAppForm:
 * isActive + wfForCode==StdAppForm + College.collegeId.
 */
export async function listWorkflowStagesForStdAppForm(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return []
  const queries = [
    buildQuery({
      isActive: true,
      wfForCode: GM_CODES.STD_APP_WF,
      'College.collegeId': collegeId,
    }),
    buildQuery({
      isActive: true,
      wfForCode: GM_CODES.STD_APP_WF,
      collegeId,
    }),
  ]
  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>('WorkflowStage', query)
      if (rows.length > 0) return rows
    } catch {
      // next shape
    }
  }
  return []
}
