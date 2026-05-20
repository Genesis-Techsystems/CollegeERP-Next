/**
 * Invigilator Remuneration service — client-side only.
 *
 * Entity: ExamInvigilationRemuneration
 * Primary key: examInvgRemunerationId
 * Angular CRUD URL constant: examInvigilationRemunerationUrl = 'ExamInvigilationRemuneration'
 */

import { buildQuery, domainList, domainCreate, domainUpdate, domainSoftDelete } from '@/services/crud'
import { INVIG_REMUNERATION_API } from '@/config/constants/api'
import type { InvigilatorRemuneration, InvigilatorRemunerationFormValues } from '@/types/invigilator-remuneration'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List all invigilator remuneration records.
 *
 * @returns array of InvigilatorRemuneration records ordered by examInvgRemunerationId DESC
 * @throws AppError on failure
 */
export async function getInvigilatorRemunerations(): Promise<InvigilatorRemuneration[]> {
  return domainList<InvigilatorRemuneration>(
    INVIG_REMUNERATION_API.ENTITY,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

/**
 * List invigilator remuneration records filtered by college.
 *
 * @param collegeId - college to filter by
 * @returns array of InvigilatorRemuneration records
 * @throws AppError on failure
 */
export async function getInvigilatorRemunerationsByCollege(collegeId: number): Promise<InvigilatorRemuneration[]> {
  return domainList<InvigilatorRemuneration>(
    INVIG_REMUNERATION_API.ENTITY,
    buildQuery({ collegeId }, { field: 'createdDt', direction: 'DESC' }),
  )
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new invigilator remuneration record.
 *
 * @param data - form values from InvigilatorRemunerationModal
 * @returns the created record with server-assigned examInvgRemunerationId
 * @throws AppError on failure
 */
export async function createInvigilatorRemuneration(
  data: InvigilatorRemunerationFormValues,
): Promise<InvigilatorRemuneration> {
  return domainCreate<InvigilatorRemuneration>(INVIG_REMUNERATION_API.ENTITY, data)
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing invigilator remuneration record.
 *
 * @param id - examInvgRemunerationId of the record to update
 * @param data - updated form values
 * @returns the updated record
 * @throws AppError on failure
 */
export async function updateInvigilatorRemuneration(
  id: number,
  data: InvigilatorRemunerationFormValues,
): Promise<InvigilatorRemuneration> {
  return domainUpdate<InvigilatorRemuneration>(INVIG_REMUNERATION_API.ENTITY, INVIG_REMUNERATION_API.PK, id, data)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete an invigilator remuneration record (sets isActive: false).
 *
 * @param id - examInvgRemunerationId of the record to delete
 * @throws AppError on failure
 */
export async function deleteInvigilatorRemuneration(id: number): Promise<void> {
  return domainSoftDelete(INVIG_REMUNERATION_API.ENTITY, INVIG_REMUNERATION_API.PK, id)
}
