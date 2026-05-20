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

export async function listColleges(): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function listActiveCollegesForGeneralSettings(): Promise<College[]> {
  return domainList<College>(ENTITIES.COLLEGE.name, buildQuery({ isActive: true }))
}

export async function createCollege(data: Omit<College, 'collegeId'>): Promise<College> {
  return domainCreate<College>(ENTITIES.COLLEGE.name, data)
}

export async function updateCollege(
  collegeId: number,
  data: Partial<Omit<College, 'collegeId'>>,
): Promise<College> {
  return domainUpdate<College>(ENTITIES.COLLEGE.name, ENTITIES.COLLEGE.pk, collegeId, data)
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
