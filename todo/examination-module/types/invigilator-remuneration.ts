/**
 * Types for the Exam Invigilator Remuneration entity.
 *
 * Angular source: invigilator-remuneration.component.ts / invigilator-remuneration-modal.component.ts
 * Angular model:  app/main/models/invigilatorRemuneration.ts (ExamInvgRemuneration)
 * Spring Boot entity name: ExamInvigilationRemuneration
 * Primary key: examInvgRemunerationId
 */

// ─── Entity ───────────────────────────────────────────────────────────────────

/**
 * ExamInvigilationRemuneration record from Spring Boot.
 * Mirrors the Angular ExamInvgRemuneration interface.
 */
export interface InvigilatorRemuneration {
  /** Primary key */
  examInvgRemunerationId: number
  /** Pay amount for this designation */
  amount: number
  /** Effective from date (ISO string) */
  fromDate: string
  /** Effective to date (ISO string) */
  toDate: string
  /** FK: College */
  collegeId: number
  /** College code (denormalised) */
  collegeCode?: string
  /** College name (denormalised) */
  collegeName?: string
  /** FK: GeneralDetail for invigilator designation type (GM code: INVLATRDISG) */
  invgdesignationCatId?: number
  /** Display name for the designation (denormalised) */
  invgdesignationCatDisplayName?: string
  /** Short code for the designation (denormalised) */
  invgdesignationCatCode?: string
  /** Optional reason for deactivation */
  reason?: string
  /** Active/inactive flag */
  isActive: boolean
  createdDt?: string
  updatedDt?: string
  createdUser?: number
  updatedUser?: number
}

// ─── Form values ──────────────────────────────────────────────────────────────

export interface InvigilatorRemunerationFormValues {
  collegeId: string
  invgdesignationCatId: number | ''
  amount: number | ''
  fromDate: string
  toDate: string
  isActive: boolean
  reason: string
}
