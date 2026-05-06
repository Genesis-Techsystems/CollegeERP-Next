import { ENTITIES } from '@/config/constants/entities'
import type { Designation } from '@/types/designation'
import type { Organization } from '@/types/organization'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listDesignations(): Promise<Designation[]> {
  return domainList<Designation>(
    ENTITIES.DESIGNATION.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createDesignation(data: Omit<Designation, 'designationId'>): Promise<Designation> {
  return domainCreate<Designation>(ENTITIES.DESIGNATION.name, data)
}

export async function updateDesignation(
  designationId: number,
  data: Partial<Omit<Designation, 'designationId'>>,
): Promise<Designation> {
  return domainUpdate<Designation>(ENTITIES.DESIGNATION.name, ENTITIES.DESIGNATION.pk, designationId, {
    designationId,
    ...data,
  })
}

export async function listActiveOrganizationsForDesignations(): Promise<Organization[]> {
  return domainList<Organization>(ENTITIES.ORGANIZATION.name, buildQuery({ isActive: true }))
}
