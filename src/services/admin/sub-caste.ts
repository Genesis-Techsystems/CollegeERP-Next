import { ENTITIES } from '@/config/constants/entities'
import type { Caste } from '@/types/caste'
import type { SubCaste } from '@/types/sub-caste'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listSubCastes(): Promise<SubCaste[]> {
  return domainList<SubCaste>(
    ENTITIES.SUB_CASTE.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createSubCaste(data: Omit<SubCaste, 'subCasteId'>): Promise<SubCaste> {
  return domainCreate<SubCaste>(ENTITIES.SUB_CASTE.name, data)
}

export async function updateSubCaste(
  subCasteId: number,
  data: Partial<Omit<SubCaste, 'subCasteId'>>,
): Promise<SubCaste> {
  return domainUpdate<SubCaste>(ENTITIES.SUB_CASTE.name, ENTITIES.SUB_CASTE.pk, subCasteId, {
    subCasteId,
    ...data,
  })
}

export async function listActiveCastesForSubCastes(): Promise<Caste[]> {
  return domainList<Caste>(ENTITIES.CASTE.name, buildQuery({ isActive: true }))
}
