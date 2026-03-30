/**
 * Types for the Exam Max Marks Setup (ExamMarkssetup) entity.
 *
 * Angular source: marks-setup.component.ts / marks-setup-modal.component.ts
 * Spring Boot entity name: ExamMarkssetup  (note lowercase 's')
 * Submit endpoint: POST exammarkssetup  (accepts an array)
 */

// ─── Reference types (from filter data) ────────────────────────────────────

/** Row returned from s_get_collegewisedetails_bycode with clg_filters_regulation flag */
export interface RegulationFilterRow {
  fk_regulation_id: number
  regulation_code: string
  fk_university_id: number
  fk_course_id: number
}

// ─── ExamMarkssetup entity ──────────────────────────────────────────────────

/**
 * A single marks-setup row from Spring Boot ExamMarkssetup entity.
 * One row per subject category (e.g. Theory, Practical, Elective).
 */
export interface ExamMarksSetup {
  /** Primary key */
  markssetupId?: number
  /** Display name, e.g. "Theory Marks Setup" */
  marksSetupName: string
  /** FK: GeneralDetail for subject category (subjectCategory GM code) */
  subjectCategoryCatDetId?: number
  /** FK: same field used in marks setup modal */
  subjectTypeCatId?: number
  /** Internal assessment max marks */
  internalMarks: number
  /** External (theory/practical) max marks */
  externalMarks: number
  /** Internal pass percentage */
  passPercentage: number
  /** External pass percentage */
  externalPassPercentage: number
  /** Final internal marks percentage (computed/stored) */
  finalIntPercentage?: number
  /** Final external marks percentage (computed/stored) */
  finalExtPercentage?: number
  /** Whether this setup is for disabled students */
  isForDisabled?: boolean
  /** FK: Regulation (numeric ID) */
  regulationId?: number
  /** FK: University (numeric ID) */
  universityId?: number
  /** FK: Course (numeric ID) */
  courseId?: number
  /** Active/inactive flag */
  isActive: boolean
  /** Reason for deactivation */
  reason?: string
  /** Display name of the subject category (from GeneralDetail) */
  generalDetailCode?: string
  /** Display name of the subject category */
  generalDetailName?: string
}

// ─── Form values ─────────────────────────────────────────────────────────────

export interface ExamMarksSetupFormValues {
  marksSetupName: string
  subjectTypeCatId: number | null
  internalMarks: number
  externalMarks: number
  passPercentage: number
  externalPassPercentage: number
  isForDisabled: boolean
  isActive: boolean
  reason: string
}
