import { buildQuery, domainCreate, domainList, domainUpdate } from '@/services/crud'

type AnyRow = Record<string, any>

/**
 * Program Outcome category general-detail options.
 *
 * Angular: `crudService.listDetailsByTwoIds('GeneralDetail', 'PRGNMOUTCMS', 'true',
 * 'GeneralMaster.generalMasterCode', 'isActive')`
 * → GET domain/list/GeneralDetail?query=GeneralMaster.generalMasterCode==PRGNMOUTCMS.and.isActive==true
 *
 * The generalDetailId of the chosen row becomes `prgoutcomeCatdetId` in the create payload.
 */
export async function listProgramOutcomeCategoryDetails(): Promise<AnyRow[]> {
  const variants = [
    buildQuery({ 'GeneralMaster.generalMasterCode': 'PRGNMOUTCMS', isActive: true }),
    buildQuery({ 'generalMaster.generalMasterCode': 'PRGNMOUTCMS', isActive: true }),
    buildQuery({ generalMasterCode: 'PRGNMOUTCMS', isActive: true }),
  ]
  for (const query of variants) {
    try {
      const rows = await domainList<AnyRow>('GeneralDetail', query)
      if (Array.isArray(rows) && rows.length > 0) return rows
    } catch {
      // try next query shape
    }
  }
  return []
}

export interface ProgramOutcomePayload {
  prgoutcomeCatdetId: number
  collegeId: number
  academicYearId: number
  code: string
  description: string
  credits?: number | string | null
  isActive: boolean
  reason?: string
}

/**
 * Create a Program Outcome.
 *
 * Angular: `crudService.addDetails('CmProgramOutcome', details)`
 * → POST domain/create/CmProgramOutcome
 */
export async function createProgramOutcome(payload: ProgramOutcomePayload): Promise<AnyRow> {
  return domainCreate<AnyRow>('CmProgramOutcome', payload)
}

/**
 * Update a Program Outcome.
 *
 * Angular: `crudService.updateDetails('CmProgramOutcome', details, id, 'programOutcomeId')`
 * → PUT domain/update/CmProgramOutcome?query=programOutcomeId==id
 */
export async function updateProgramOutcome(
  programOutcomeId: number,
  payload: ProgramOutcomePayload,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>('CmProgramOutcome', 'programOutcomeId', programOutcomeId, payload)
}
