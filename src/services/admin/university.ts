import { SETUP_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import type { University } from '@/types/university'
import {
  angularTitleActiveReason,
  asNullableString,
  asString,
} from '../angular-payload'
import { buildQuery, domainCreate, domainList, domainUpdate, uploadFile } from '../crud'

type UniversityWriteInput = Partial<Omit<University, 'universityId'>> & Record<string, unknown>

function buildAngularUniversityPayload(
  data: UniversityWriteInput,
  universityId?: number,
  existing?: University,
): Record<string, unknown> {
  const isActive = data.isActive !== false

  const payload: Record<string, unknown> = {
    universityName: asString(data.universityName),
    universityCode: asString(data.universityCode),
    universityShortName: asNullableString(data.universityShortName),
    printPrefix: asNullableString(data.printPrefix),
    address: asString(data.address),
    mandal: asString(data.mandal),
    pinCode: asString(data.pinCode ?? data.pincode),
    countryId: data.countryId ?? existing?.countryId ?? null,
    stateId: data.stateId ?? existing?.stateId ?? null,
    districtId: data.districtId ?? existing?.districtId,
    cityId: data.cityId ?? existing?.cityId ?? null,
    mobileNumber: asNullableString(data.mobileNumber),
    landlineNumber: asNullableString(data.landlineNumber),
    fax: asNullableString(data.fax),
    email: asNullableString(data.email),
    googleUrl: asNullableString(data.googleUrl),
    facebookUrl: asNullableString(data.facebookUrl),
    linkedinUrl: asNullableString(data.linkedinUrl),
    reportLine1: asNullableString(data.reportLine1),
    reportLine2: asNullableString(data.reportLine2),
    reportLine3: asNullableString(data.reportLine3),
    isActive,
    reason: angularTitleActiveReason(isActive, data.reason, existing?.reason),
    upload: null,
  }

  if (universityId != null) {
    payload.universityId = universityId
  }
  if (existing?.logoFileName) {
    payload.logoFileName = existing.logoFileName
  }

  return payload
}

export async function listUniversities(): Promise<University[]> {
  return domainList<University>(
    ENTITIES.UNIVERSITIES.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveUniversities(): Promise<University[]> {
  return domainList<University>(ENTITIES.UNIVERSITIES.name, buildQuery({ isActive: true }))
}

export async function createUniversity(data: Omit<University, 'universityId'>): Promise<University> {
  const payload = buildAngularUniversityPayload(data)
  return domainCreate<University>(ENTITIES.UNIVERSITIES.name, payload)
}

export async function updateUniversity(
  universityId: number,
  data: Partial<Omit<University, 'universityId'>>,
  existing?: University,
): Promise<University> {
  const payload = buildAngularUniversityPayload(data, universityId, existing)
  return domainUpdate<University>(ENTITIES.UNIVERSITIES.name, ENTITIES.UNIVERSITIES.pk, universityId, payload)
}

export async function uploadUniversityLogo(
  universityId: number,
  universityCode: string,
  file: File,
): Promise<void> {
  const formData = new FormData()
  formData.append('universityId', String(universityId))
  formData.append('universityCode', universityCode)
  formData.append('logoFileName', file, file.name)
  await uploadFile(SETUP_API.UNIVERSITY_LOGO_UPLOAD, formData)
}
