import { ENTITIES } from '@/config/constants/entities'
import type { Organization } from '@/types/organization'
import type { Qualification } from '@/types/qualification'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listQualifications(): Promise<Qualification[]> {
  return domainList<Qualification>(
    ENTITIES.QUALIFICATION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createQualification(
  data: Omit<Qualification, 'qualificationId'>,
): Promise<Qualification> {
  return domainCreate<Qualification>(ENTITIES.QUALIFICATION.name, data)
}

export async function updateQualification(
  qualificationId: number,
  data: Partial<Omit<Qualification, 'qualificationId'>>,
): Promise<Qualification> {
  return domainUpdate<Qualification>(
    ENTITIES.QUALIFICATION.name,
    ENTITIES.QUALIFICATION.pk,
    qualificationId,
    { qualificationId, ...data },
  )
}

export async function listActiveOrganizationsForQualifications(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}
