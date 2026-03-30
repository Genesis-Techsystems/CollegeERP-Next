/**
 * ExamTimetable entity types.
 * Spring Boot entity: ExamTimetable
 * Primary key: examTimetableId
 *
 * Maps to Angular's examTimetableUrl = 'ExamTimetable' and
 * examTimetablePostUrl = 'examtimetable'.
 */

// ─── ExamTimetable ────────────────────────────────────────────────────────────

/** One exam timetable row — one subject on one date in one session */
export interface ExamTimetable {
  /** Primary key — Spring Boot auto-generated */
  examTimetableId: number
  /** FK: parent exam master */
  examId: number
  /** Exam name — from joined ExamMaster */
  examName?: string
  /** FK: subject being examined */
  subjectId: number
  /** Subject code — from joined Subject */
  subjectCode?: string
  /** Subject name — from joined Subject */
  subjectName?: string
  /** FK: exam session (morning / afternoon / evening) */
  examSessionId: number
  /** Session display name — from joined ExamSession */
  examSessionName?: string
  /** Date of the exam (ISO "YYYY-MM-DD") */
  examDate: string
  /** FK: course group (optional — some configs omit it) */
  courseGroupId?: number
  /** Course group code — from joined CourseGroup */
  groupCode?: string
  /** FK: course year */
  courseYearId?: number
  /** Course year code — from joined CourseYear */
  courseYearCode?: string
  /** Course year name — from joined CourseYear */
  courseYearName?: string
  /** FK: regulation */
  regulationId?: number
  /** Regulation code — from joined Regulation */
  regulationCode?: string
  /** FK: exam type category (Regular / Supply / Internal) */
  examTypeCatId?: number
  /** Exam type category code — from joined GeneralDetail */
  examTypeCatCode?: string
  /** Soft-delete flag */
  isActive: boolean
  /** Reason for deactivation */
  reason?: string
  /** Record creation timestamp (ISO string) */
  createdDt?: string
  /** Last update timestamp (ISO string) */
  updatedDt?: string
}

// ─── Form Values ──────────────────────────────────────────────────────────────

export interface ExamTimetableFormValues {
  examId: number | null
  subjectId: number | null
  examSessionId: number | null
  examDate: Date | null
  courseYearId: number | null
  regulationId: number | null
  examTypeCatId: number | null
  isActive: boolean
  reason: string
}

// ─── Subject lookup ───────────────────────────────────────────────────────────

/** Subject record used in the timetable subject dropdown */
export interface SubjectLookup {
  subjectId: number
  subjectCode: string
  subjectName: string
  regulationId?: number
  regulationCode?: string
  courseYearId?: number
}
