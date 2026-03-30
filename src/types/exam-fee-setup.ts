/**
 * Types for the Exam Fee Structure (ExamFeeStructure) entity.
 *
 * Angular source: exam-fee-structure.component.ts / exam-fee-structure-modal.component.ts
 * Spring Boot entity name: ExamFeeStructure
 * Primary key: examFeeStructureId
 */

// ─── ExamFeeStructure entity ─────────────────────────────────────────────────

/**
 * Additional / supplementary fee line attached to an exam fee structure.
 * Stored in ExamFeeAdditionalStructure; general master code ADDFEETYPE.
 */
export interface ExamFeeAdditionalStructure {
  examFeeAdditionalStructureId?: number
  /** FK: GeneralDetail for additional fee type (ADDFEETYPE GM code) */
  adtExamfeetypeCatId?: number
  adtExamfeetypeCatDisplayName?: string
  /** Display type resolved from generalMasterId */
  type?: string
  generalMasterId?: number
  /** Applicable to this course year */
  courseYearId?: number
  courseYearName?: string
  /** Applicable from this course year */
  fromCourseYearId?: number
  /** Applicable until this course year */
  toCourseYearId?: number
  /** Fee amount */
  fee?: number
  /** Whether this additional fee is included in the registration fee total */
  includeInReg?: boolean
  isActive?: boolean
}

/**
 * Late-fee / fine record attached to an exam fee structure.
 */
export interface ExamFeeFine {
  examFeeFineId?: number
  fineName?: string
  fineFromDate?: string
  fineToDate?: string
  /** Fine for regular registration */
  regFeeFine?: number
  /** Fine for supplementary registration */
  supplyFeeFine?: number
  isActive?: boolean
}

/**
 * Course-year applicability row for a fee structure.
 */
export interface ExamFeeStructureCourseyr {
  examFeeStructureCourseyrId?: number
  courseId?: number
  courseYearId?: number
  isActive?: boolean
}

/**
 * Main ExamFeeStructure record from Spring Boot.
 */
export interface ExamFeeStructure {
  /** Primary key */
  examFeeStructureId?: number
  /** Display name / label */
  examFeeStructureName: string
  /** FK: ExamMaster exam */
  examId?: number
  examName?: string
  /** FK: College (college mode only) */
  collegeId?: number
  /** Registration fee per exam */
  regFee?: number
  /** Per-subject fees */
  subject1Fee?: number
  subject2Fee?: number
  subject3Fee?: number
  subject4Fee?: number
  subject5Fee?: number
  subject6Fee?: number
  subject7Fee?: number
  /** Supplementary exam fee */
  supplyFee?: number
  /** Fee collection start date (ISO string) */
  collectionStartDate?: string
  /** Fee collection end date (ISO string) */
  collectionEndDate?: string
  /** Nested additional fee rows */
  examFeeAdditionalStructure?: ExamFeeAdditionalStructure[]
  /** Nested late-fee rows */
  examFeeFine?: ExamFeeFine[]
  /** Nested course year applicability */
  examFeeStructureCourseyr?: ExamFeeStructureCourseyr[]
  /** Active/inactive flag */
  isActive: boolean
  /** Reason for deactivation */
  reason?: string
}

// ─── Form values ─────────────────────────────────────────────────────────────

export interface ExamFeeStructureFormValues {
  examFeeStructureName: string
  regFee: number
  subject1Fee: number
  subject2Fee: number
  subject3Fee: number
  subject4Fee: number
  subject5Fee: number
  subject6Fee: number
  subject7Fee: number
  supplyFee: number
  collectionStartDate: Date | null
  collectionEndDate: Date | null
  isActive: boolean
  reason: string
}
