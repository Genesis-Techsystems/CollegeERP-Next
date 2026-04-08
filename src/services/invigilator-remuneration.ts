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
  return domainUpdate<AnyRow>(INVIG_REMUNERATION_API.ENTITY, INVIG_REMUNERATION_API.PK, id, payload)
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

