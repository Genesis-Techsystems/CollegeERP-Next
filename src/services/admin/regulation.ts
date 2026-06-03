import { GM_CODES } from '@/config/constants/ui'
import { ENTITIES } from '@/config/constants/entities'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

type AnyRow = Record<string, any>

export async function listRegulationsAdmin(): Promise<AnyRow[]> {
  return domainList<AnyRow>(ENTITIES.REGULATION.name, buildQuery({}, { field: 'createdDt', direction: 'DESC' }))
}

export async function createRegulation(data: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>(ENTITIES.REGULATION.name, data)
}

export async function updateRegulation(regulationId: number, data: Record<string, unknown>): Promise<AnyRow> {
  return domainUpdate<AnyRow>(ENTITIES.REGULATION.name, ENTITIES.REGULATION.pk, regulationId, {
    regulationId,
    ...data,
  })
}

export async function listInternalExamMarkTypes(): Promise<AnyRow[]> {
  const queries = [
    buildQuery({
      'GeneralMaster.generalMasterCode': GM_CODES.INTERNAL_EXAM_MARKS_TYPE,
      isActive: true,
    }),
    buildQuery({
      'generalMaster.generalMasterCode': GM_CODES.INTERNAL_EXAM_MARKS_TYPE,
      isActive: true,
    }),
    buildQuery({ generalMasterCode: GM_CODES.INTERNAL_EXAM_MARKS_TYPE, isActive: true }),
  ]

  for (const query of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.GENERAL_DETAIL.name, query)
      if (rows.length > 0) return rows
    } catch {
      // Try next query shape.
    }
  }
  return []
}

