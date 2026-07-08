import { ENTITIES } from '@/config/constants/entities'
import type { Organization } from '@/types/organization'
import type { Qualification } from '@/types/qualification'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listQualifications(): Promise<Qualification[]> {
  const [quals, orgs] = await Promise.all([
    domainList<Qualification>(
      ENTITIES.QUALIFICATION.name,
      buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
    ),
    domainList<Organization>(
      ENTITIES.ORGANIZATION.name,
      buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
    ),
  ])

  const orgById = new Map<number, Organization>(orgs.map((o) => [o.organizationId, o]))
  return quals.map((q) => {
    const org = orgById.get(q.organizationId)
    if (!org) return q
    return {
      ...q,
      orgCode: q.orgCode ?? org.orgCode,
      orgName: q.orgName ?? org.orgName,
    }
  })
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
