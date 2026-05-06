import { ENTITIES } from '@/config/constants/entities'
import type { Qualification } from '@/types/qualification'
import type { QualificationGroup } from '@/types/qualification-group'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listQualificationGroups(): Promise<QualificationGroup[]> {
  return domainList<QualificationGroup>(
    ENTITIES.QUALIFICATION_GROUP.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createQualificationGroup(
  data: Omit<QualificationGroup, 'qualificationGroupId'>,
): Promise<QualificationGroup> {
  return domainCreate<QualificationGroup>(ENTITIES.QUALIFICATION_GROUP.name, data)
}

export async function updateQualificationGroup(
  qualificationGroupId: number,
  data: Partial<Omit<QualificationGroup, 'qualificationGroupId'>>,
): Promise<QualificationGroup> {
  return domainUpdate<QualificationGroup>(
    ENTITIES.QUALIFICATION_GROUP.name,
    ENTITIES.QUALIFICATION_GROUP.pk,
    qualificationGroupId,
    { qualificationGroupId, ...data },
  )
}

export async function listActiveQualificationsForGroups(): Promise<Qualification[]> {
  return domainList<Qualification>(ENTITIES.QUALIFICATION.name, buildQuery({ isActive: true }))
}
