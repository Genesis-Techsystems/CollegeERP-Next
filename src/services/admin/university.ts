import { SETUP_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import type { University } from '@/types/university'
import { buildQuery, domainCreate, domainList, domainUpdate, uploadFile } from '../crud'

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
  return domainCreate<University>(ENTITIES.UNIVERSITIES.name, data)
}

export async function updateUniversity(
  universityId: number,
  data: Partial<Omit<University, 'universityId'>>,
): Promise<University> {
  return domainUpdate<University>(ENTITIES.UNIVERSITIES.name, ENTITIES.UNIVERSITIES.pk, universityId, data)
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
