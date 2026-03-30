/**
 * Revaluation Fee Setup service — client-side only.
 * All calls go through /api/proxy/ (BFF pattern). Never calls Spring Boot directly.
 *
 * Spring Boot entity: ExamFeeStructure
 * Primary key: examFeeStructureId
 * Angular CRUD URL constant: examFeeStructureCrudUrl = 'ExamFeeStructure'
 */

import { buildQuery, domainList, domainCreate, domainUpdate, domainSoftDelete } from '@/services/crud.service'
import { REVAL_FEE_API } from '@/config/constants/api'
import type { RevaluationFee, RevaluationFeeFormValues } from '@/types/revaluation-fee'

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List all revaluation fee setup records.
 *
 * @returns array of RevaluationFee records ordered by examFeeStructureId DESC
 * @throws AppError on failure
 */
export async function getRevaluationFees(): Promise<RevaluationFee[]> {
  return domainList<RevaluationFee>(
    REVAL_FEE_API.ENTITY,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

/**
 * List revaluation fee records for a specific exam.
 *
 * @param examId - the exam master ID to filter by
 * @returns array of RevaluationFee records
 * @throws AppError on failure
 */
export async function getRevaluationFeesByExam(examId: number): Promise<RevaluationFee[]> {
  return domainList<RevaluationFee>(
    REVAL_FEE_API.ENTITY,
    buildQuery({ 'examMaster.examId': examId }, { field: 'createdDt', direction: 'DESC' }),
  )
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Create a new revaluation fee setup record.
 *
 * @param data - form values from RevaluationFeeModal
 * @returns the created record with server-assigned examFeeStructureId
 * @throws AppError on failure
 */
export async function createRevaluationFee(
  data: RevaluationFeeFormValues,
): Promise<RevaluationFee> {
  return domainCreate<RevaluationFee>(REVAL_FEE_API.ENTITY, data)
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update an existing revaluation fee setup record.
 *
 * @param id - examFeeStructureId of the record to update
 * @param data - updated form values
 * @returns the updated record
 * @throws AppError on failure
 */
export async function updateRevaluationFee(
  id: number,
  data: RevaluationFeeFormValues,
): Promise<RevaluationFee> {
  return domainUpdate<RevaluationFee>(REVAL_FEE_API.ENTITY, REVAL_FEE_API.PK, id, data)
}

// ─── Soft Delete ──────────────────────────────────────────────────────────────

/**
 * Soft-delete a revaluation fee setup record (sets isActive: false).
 *
 * @param id - examFeeStructureId of the record to delete
 * @throws AppError on failure
 */
export async function deleteRevaluationFee(id: number): Promise<void> {
  return domainSoftDelete(REVAL_FEE_API.ENTITY, REVAL_FEE_API.PK, id)
}
