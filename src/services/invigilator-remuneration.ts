import { buildQuery, domainCreate, domainList, domainUpdate } from '@/services/crud'
import { INVIG_REMUNERATION_API } from '@/config/constants/api'

type AnyRow = Record<string, any>

export async function listInvigilatorRemunerations(): Promise<AnyRow[]> {
  return domainList<AnyRow>(INVIG_REMUNERATION_API.ENTITY)
}

export async function createInvigilatorRemuneration(payload: AnyRow): Promise<AnyRow> {
  return domainCreate<AnyRow>(INVIG_REMUNERATION_API.ENTITY, payload)
}

export async function updateInvigilatorRemuneration(id: number, payload: AnyRow): Promise<AnyRow> {
  const entity = INVIG_REMUNERATION_API.ENTITY
  const pks = [
    INVIG_REMUNERATION_API.PK,
    'examInvigilationRemunerationId',
    'invigilatorRemunerationId',
    'id',
  ]
  let lastError: unknown = null
  for (const pk of pks) {
    try {
      return await domainUpdate<AnyRow>(entity, pk, id, payload)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError ?? new Error('Unable to update invigilator remuneration')
}

export async function listActiveColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

export async function listInvigilatorDesignationTypes(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'GeneralDetail',
    buildQuery({ 'GeneralMaster.generalMasterCode': INVIG_REMUNERATION_API.INVIG_DESG_GM_CODE, isActive: true }),
  )
}

