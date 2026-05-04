import { ENTITIES } from '@/config/constants/entities'
import type { Caste } from '@/types/caste'
import type { Organization } from '@/types/organization'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listCastes(): Promise<Caste[]> {
  return domainList<Caste>(
    ENTITIES.CASTE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createCaste(data: Omit<Caste, 'casteId'>): Promise<Caste> {
  return domainCreate<Caste>(ENTITIES.CASTE.name, data)
}

export async function updateCaste(
  casteId: number,
  data: Partial<Omit<Caste, 'casteId'>>,
): Promise<Caste> {
  return domainUpdate<Caste>(ENTITIES.CASTE.name, ENTITIES.CASTE.pk, casteId, {
    casteId,
    ...data,
  })
}

export async function listActiveOrganizationsForCastes(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}
