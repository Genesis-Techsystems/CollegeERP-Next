/**
 * Typed query key registry — QK
 *
 * All TanStack Query keys live here. Never write inline key arrays in pages
 * or hooks. Use QK.<entity>.all for broad invalidation and QK.<entity>.list(...)
 * for filtered queries (cascades correctly through TanStack's prefix matching).
 *
 * Pattern: .all is the root prefix; .list(...) extends it with filters.
 * invalidateQueries({ queryKey: QK.examSessions.all }) invalidates every
 * examSessions key variant.
 */

export const QK = {
  // ── Session ──────────────────────────────────────────────────────────────
  session: ['session'] as const,

  // ── Exam Sessions ─────────────────────────────────────────────────────
  examSessions: {
    all: ['ExamSession'] as const,
    list: (universityId?: number) =>
      universityId !== undefined
        ? (['ExamSession', 'list', universityId] as const)
        : (['ExamSession', 'list'] as const),
    /** Active sessions only — used as lookup in timetable modal */
    active: () => ['ExamSession', 'active'] as const,
    /** Filter data (universities + GM codes) fetched inside ExamSessionModal */
    filters: (orgId: number, empId: number) =>
      ['ExamSession', 'filters', orgId, empId] as const,
  },

  // ── Exam Grades ────────────────────────────────────────────────────────
  examGrades: {
    all: ['ExamGrade'] as const,
    list: (filters: { courseId?: number; regulationId?: number; isForDisabled?: boolean }) =>
      ['ExamGrade', 'list', filters] as const,
  },

  // ── Exam Max Marks ─────────────────────────────────────────────────────
  examMaxMarks: {
    all: ['ExamMaxMarks'] as const,
    list: (filters: { courseId?: number; courseYearId?: number; regulationId?: number }) =>
      ['ExamMaxMarks', 'list', filters] as const,
  },

  // ── Exam Fee Setup ─────────────────────────────────────────────────────
  examFeeSetup: {
    all: ['ExamFeeSetup'] as const,
    list: (filters: { universityId?: number; courseId?: number }) =>
      ['ExamFeeSetup', 'list', filters] as const,
    /** Filter data fetched inside ExamFeeSetup page */
    filters: (empId: number) => ['ExamFeeSetup', 'filters', empId] as const,
  },

  // ── Exam Timetable ─────────────────────────────────────────────────────
  examTimetable: {
    all: ['ExamTimetable'] as const,
    list: (examId?: number, courseYearId?: number, courseId?: number) =>
      ['ExamTimetable', 'list', { examId, courseYearId, courseId }] as const,
    /** Timetable slots for a specific exam (used by SeatingPlanModal) */
    slots: (examId: number) => ['ExamTimetable', 'slots', examId] as const,
  },

  // ── Exam Master ────────────────────────────────────────────────────────
  examMaster: {
    all: ['ExamMaster'] as const,
    list: (courseId?: number, academicYearId?: number) =>
      ['ExamMaster', 'list', { courseId, academicYearId }] as const,
  },

  // ── Seating Plan ───────────────────────────────────────────────────────
  seatingPlan: {
    all: ['SeatingPlan'] as const,
    list: (examId?: number) =>
      examId !== undefined
        ? (['SeatingPlan', 'list', examId] as const)
        : (['SeatingPlan', 'list'] as const),
    /** Room lookup — stable reference data */
    rooms: () => ['SeatingPlan', 'rooms'] as const,
  },

  // ── Invigilator Remuneration ──────────────────────────────────────────
  invigilatorRemuneration: {
    all: ['InvigilatorRemuneration'] as const,
    list: () => ['InvigilatorRemuneration', 'list'] as const,
  },

  // ── Revaluation Fee ────────────────────────────────────────────────────
  revaluationFee: {
    all: ['RevaluationFee'] as const,
    list: () => ['RevaluationFee', 'list'] as const,
  },

  // ── Organizations ─────────────────────────────────────────────────────
  organizations: {
    all: ['Organization'] as const,
    list: () => ['Organization', 'list'] as const,
  },

  // ── Campuses ───────────────────────────────────────────────────────────
  campuses: {
    all: ['Campus'] as const,
    list: () => ['Campus', 'list'] as const,
  },

  // ── College Filters ────────────────────────────────────────────────────
  collegeFilters: {
    all: ['collegeFilters'] as const,
    byUser: (orgId: number, empId: number) =>
      ['collegeFilters', { orgId, empId }] as const,
    regulations: (courseId: number) =>
      ['collegeFilters', 'regulations', courseId] as const,
    courseYears: (courseId: number) =>
      ['collegeFilters', 'courseYears', courseId] as const,
    subjects: (courseYearId: number) =>
      ['collegeFilters', 'subjects', courseYearId] as const,
  },
} as const
