/**
 * Types for the Revaluation Fee Setup (ExamFeeStructure) entity.
 *
 * Angular source: exam-re-valuation-fee-setup.component.ts / exam-re-valuation-fee-setup-modal.component.ts
 * Spring Boot entity name: ExamFeeStructure
 * Primary key: examFeeStructureId
 *
 * Note: ExamFeeStructure is a general-purpose exam fee container.
 * In the context of revaluation setup, it stores the revaluation fee amounts
 * (regular re-check fee, supply re-check fee) for a given exam.
 */

// ─── Entity ───────────────────────────────────────────────────────────────────

/**
 * ExamFeeStructure record from Spring Boot.
 * Used here as the Revaluation Fee Setup record.
 */
export interface RevaluationFee {
  /** Primary key */
  examFeeStructureId?: number
  /** Display name / label (e.g. "Nov 2024 Reval Fee") */
  examFeeStructureName: string
  /** FK: ExamMaster */
  examId?: number
  /** Exam name (denormalised) */
  examName?: string
  /** FK: College (used for college-level fee override) */
  collegeId?: number
  /** College name (denormalised) */
  collegeName?: string
  /** Fee collection window start (ISO string) */
  collectionStartDate?: string
  /** Fee collection window end (ISO string) */
  collectionEndDate?: string
  /** Regular exam re-check fee */
  regFee?: number
  /** Supplementary exam re-check fee */
  supplyFee?: number
  /** Active/inactive flag */
  isActive: boolean
  /** Reason for deactivation */
  reason?: string
  createdDt?: string
  updatedDt?: string
}

// ─── Form values ──────────────────────────────────────────────────────────────

export interface RevaluationFeeFormValues {
  examFeeStructureName: string
  examId: number | ''
  collectionStartDate: string
  collectionEndDate: string
  regFee: number | ''
  supplyFee: number | ''
  isActive: boolean
  reason: string
}
