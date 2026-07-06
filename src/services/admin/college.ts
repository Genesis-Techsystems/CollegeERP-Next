import { SETUP_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import { GM_CODES } from '@/config/constants/ui'
import type { College } from '@/types/college'
import type { SelectOption } from '@/common/components/select'
import { buildQuery, domainCreate, domainList, domainUpdate, uploadFile } from '../crud'

type GeneralDetail = {
  generalDetailId: number
  name: string
}

type CollegeWriteInput = Partial<Omit<College, 'collegeId'>> & Record<string, unknown>

function asString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function asNullableString(value: unknown): string | null {
  const text = asString(value).trim()
  return text.length > 0 ? text : null
}

function asNullableNumber(value: unknown): number | null {
  if (value == null || String(value).trim() === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Match Angular college create/update payload shape. */
function buildAngularCollegePayload(
  data: CollegeWriteInput,
  collegeId?: number,
  existing?: College,
): Record<string, unknown> {
  const isActive = data.isActive !== false
  const reason = isActive
    ? null
    : asNullableString(data.reason) ?? asNullableString(existing?.reason)

  const payload: Record<string, unknown> = {
    organizationId: data.organizationId ?? existing?.organizationId,
    universityId: data.universityId ?? existing?.universityId,
    countryId: data.countryId ?? existing?.countryId ?? null,
    stateId: data.stateId ?? existing?.stateId ?? null,
    districtId: data.districtId ?? existing?.districtId,
    cityId: data.cityId ?? existing?.cityId ?? null,
    campusId: data.campusId ?? existing?.campusId,
    collegeName: asString(data.collegeName),
    collegeShortName: asNullableString(data.collegeShortName),
    collegeCode: asString(data.collegeCode),
    sortOrder: data.sortOrder != null ? Number(data.sortOrder) : (existing?.sortOrder ?? 1),
    affiliatedTo: data.affiliatedTo ?? existing?.affiliatedTo,
    printPrefix: asNullableString(data.printPrefix),
    address: asString(data.address),
    mandal: asString(data.mandal),
    pincode: asString(data.pincode),
    collegeType: asNullableNumber(data.collegeType),
    approvedBy: asNullableString(data.approvedBy),
    logo: existing?.logo ?? null,
    mobileNumber: asNullableString(data.mobileNumber),
    landlineNumber: asNullableString(data.landlineNumber),
    fax: asNullableString(data.fax),
    email: asNullableString(data.email),
    facebookUrl: asNullableString(data.facebookUrl),
    googleUrl: asNullableString(data.googleUrl),
    linkedinUrl: asNullableString(data.linkedinUrl),
    isActive,
    reason,
    isUniversity: data.isUniversity ?? existing?.isUniversity ?? false,
    upload: null,
  }

  if (collegeId != null) {
    payload.collegeId = collegeId
    payload.orgCode = existing?.orgCode ?? data.orgCode ?? null
  }

  return payload
}

export async function listColleges(): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCollegesForGeneralSettings(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

/** Single college lookup — used by the sidebar header for the dynamic college logo. */
export async function getCollegeById(collegeId: number): Promise<College | null> {
  const rows = await domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({ [ENTITIES.COLLEGE.pk]: collegeId }),
  )
  return rows[0] ?? null
}

export async function createCollege(data: Omit<College, 'collegeId'>): Promise<College> {
  const payload = buildAngularCollegePayload(data)
  return domainCreate<College>(ENTITIES.COLLEGE.name, payload)
}

export async function updateCollege(
  collegeId: number,
  data: Partial<Omit<College, 'collegeId'>>,
  existing?: College,
): Promise<College> {
  const payload = buildAngularCollegePayload(data, collegeId, existing)
  return domainUpdate<College>(ENTITIES.COLLEGE.name, ENTITIES.COLLEGE.pk, collegeId, payload)
}

export async function uploadCollegeLogo(
  collegeId: number,
  universityId: number,
  collegeCode: string,
  file: File,
): Promise<void> {
  const formData = new FormData()
  formData.append('collegeId', String(collegeId))
  formData.append('universityId', String(universityId))
  formData.append('collegeCode', collegeCode)
  formData.append('collegeLogo', file, file.name)
  await uploadFile(SETUP_API.COLLEGE_LOGO_UPLOAD, formData)
}

async function listGeneralDetailsByCode(code: string): Promise<GeneralDetail[]> {
  return domainList<GeneralDetail>(
    ENTITIES.GENERAL_DETAIL.name,
    buildQuery({ 'GeneralMaster.generalMasterCode': code, isActive: true }),
  )
}

export async function listAffiliations(): Promise<SelectOption[]> {
  const rows = await listGeneralDetailsByCode(GM_CODES.AFFILIATION)
  return rows.map((row) => ({
    value: String(row.generalDetailId),
    label: row.name,
  }))
}

export async function listCollegeTypes(): Promise<SelectOption[]> {
  const rows = await listGeneralDetailsByCode(GM_CODES.COLLEGE_TYPE)
  return rows.map((row) => ({
    value: String(row.generalDetailId),
    label: row.name,
  }))
}
