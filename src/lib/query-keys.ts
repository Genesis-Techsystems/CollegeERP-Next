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
  loginEmployeeId: (userId: number) => ['loginEmployeeId', userId] as const,

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

  // ── Academic Years ─────────────────────────────────────────────────────
  academicYears: {
    all: ['AcademicYear'] as const,
    list: () => ['AcademicYear', 'list'] as const,
  },

  // ── Financial Years ───────────────────────────────────────────────────
  financialYears: {
    all: ['FinancialYear'] as const,
    list: () => ['FinancialYear', 'list'] as const,
  },

  // ── College Courses & Groups ──────────────────────────────────────────
  collegeCoursesGroups: {
    all: ['CollegeCoursesGroups'] as const,
    list: (universityId: number, collegeId: number, courseId?: number, courseGroupId?: number) =>
      ['CollegeCoursesGroups', 'list', { universityId, collegeId, courseId, courseGroupId }] as const,
    filters: (orgId: number, empId: number) =>
      ['CollegeCoursesGroups', 'filters', orgId, empId] as const,
  },

  // ── Course Types / Courses ────────────────────────────────────────────
  courseTypes: {
    all: ['CourseType'] as const,
    list: () => ['CourseType', 'list'] as const,
  },
  courses: {
    all: ['Course'] as const,
    list: () => ['Course', 'list'] as const,
  },
  courseGroups: {
    all: ['CourseGroup'] as const,
    list: () => ['CourseGroup', 'list'] as const,
  },
  courseYears: {
    all: ['CourseYear'] as const,
    list: () => ['CourseYear', 'list'] as const,
  },
  groupSections: {
    all: ['GroupSection'] as const,
    list: () => ['GroupSection', 'list'] as const,
  },
  batches: {
    all: ['Batch'] as const,
    list: () => ['Batch', 'list'] as const,
  },
  studentBatches: {
    all: ['StudentAcademicbatch'] as const,
    list: () => ['StudentAcademicbatch', 'list'] as const,
  },

  // ── Universities ───────────────────────────────────────────────────────
  universities: {
    all: ['Universities'] as const,
    list: () => ['Universities', 'list'] as const,
  },

  // ── Colleges ───────────────────────────────────────────────────────────
  colleges: {
    all: ['College'] as const,
    list: () => ['College', 'list'] as const,
  },
  generalUserAccounts: {
    all: ['GeneralUserAccounts'] as const,
    list: (collegeId?: number) => ['GeneralUserAccounts', 'list', { collegeId }] as const,
  },
  staffAccounts: {
    all: ['StaffAccounts'] as const,
    list: (collegeId?: number) => ['StaffAccounts', 'list', { collegeId }] as const,
  },
  examinationAccounts: {
    all: ['ExaminationAccounts'] as const,
    list: (collegeId?: number) => ['ExaminationAccounts', 'list', { collegeId }] as const,
  },
  parentAccounts: {
    all: ['ParentAccounts'] as const,
    list: (page: number, pageSize: number) => ['ParentAccounts', 'list', { page, pageSize }] as const,
  },
  studentAccounts: {
    all: ['StudentAccounts'] as const,
    list: (page: number, pageSize: number) => ['StudentAccounts', 'list', { page, pageSize }] as const,
  },
  departments: {
    all: ['Department'] as const,
    list: () => ['Department', 'list'] as const,
  },
  designations: {
    all: ['Designation'] as const,
    list: () => ['Designation', 'list'] as const,
  },

  // ── Buildings ──────────────────────────────────────────────────────────
  buildings: {
    all: ['Building'] as const,
    list: () => ['Building', 'list'] as const,
  },

  // ── Blocks ─────────────────────────────────────────────────────────────
  blocks: {
    all: ['Block'] as const,
    list: () => ['Block', 'list'] as const,
  },

  // ── Fee Masters ────────────────────────────────────────────────────────
  feeCategories: {
    all: ['FeeCategory'] as const,
    list: () => ['FeeCategory', 'list'] as const,
  },
  feeParticulars: {
    all: ['FeeParticular'] as const,
    list: () => ['FeeParticular', 'list'] as const,
  },
  collegeFeeStructures: {
    all: ['CollegeFeeStructure'] as const,
    list: (filters: Record<string, unknown>) => ['CollegeFeeStructure', 'list', filters] as const,
    filters: (orgId: number, empId: number) => ['CollegeFeeStructure', 'filters', orgId, empId] as const,
  },
  univFeeStructures: {
    all: ['UnivFeeStructure'] as const,
    list: (filters: Record<string, unknown>) => ['UnivFeeStructure', 'list', filters] as const,
    filters: (orgId: number, empId: number) => ['UnivFeeStructure', 'filters', orgId, empId] as const,
    details: (univFeeStructureId: number) => ['UnivFeeStructure', 'details', univFeeStructureId] as const,
  },
  feesCollection: {
    studentDue: (filters: Record<string, unknown>) => ['FeesCollection', 'studentDue', filters] as const,
    studentStructures: (studentId: number) => ['FeesCollection', 'studentStructures', studentId] as const,
    studentSearch: (term: string) => ['FeesCollection', 'studentSearch', term] as const,
    studentSearchCollege: (collegeId: number, term: string) =>
      ['FeesCollection', 'studentSearchCollege', collegeId, term] as const,
    feeReceipts: (filters: Record<string, unknown>) => ['FeesCollection', 'feeReceipts', filters] as const,
    feeReceiptDetails: (filters: Record<string, unknown>) =>
      ['FeesCollection', 'feeReceiptDetails', filters] as const,
    feeConcessions: (filters: Record<string, unknown>) => ['FeesCollection', 'feeConcessions', filters] as const,
    employeeSearch: (term: string) => ['FeesCollection', 'employeeSearch', term] as const,
    employeeDetails: (employeeId: number) => ['FeesCollection', 'employeeDetails', employeeId] as const,
    transportAllocations: (employeeId: number) =>
      ['FeesCollection', 'transportAllocations', employeeId] as const,
    paylinkFilters: (orgId: number, employeeId: number) =>
      ['FeesCollection', 'paylinkFilters', orgId, employeeId] as const,
    feeDueNotifications: (filters: Record<string, unknown>) =>
      ['FeesCollection', 'feeDueNotifications', filters] as const,
    feeManagementDetail: (studentId: number) => ['FeesCollection', 'feeManagement', studentId] as const,
    feeMgmtFilters: (orgId: number, employeeId: number) =>
      ['FeesCollection', 'feeMgmtFilters', orgId, employeeId] as const,
    allocateStructures: (filters: Record<string, unknown>) =>
      ['FeesCollection', 'allocateStructures', filters] as const,
  },

  // ── Floors ─────────────────────────────────────────────────────────────
  floors: {
    all: ['Floor'] as const,
    list: () => ['Floor', 'list'] as const,
  },

  // ── Room Details ───────────────────────────────────────────────────────
  roomDetails: {
    all: ['Room'] as const,
    list: () => ['Room', 'list'] as const,
  },

  // ── Room Types ────────────────────────────────────────────────────────
  roomTypes: {
    all: ['RoomType'] as const,
    list: () => ['RoomType', 'list'] as const,
  },

  // ── Rooms ─────────────────────────────────────────────────────────────
  rooms: {
    all: ['Room'] as const,
    list: () => ['Room', 'list'] as const,
  },

  // ── General Settings ───────────────────────────────────────────────────
  generalSettings: {
    all: ['GeneralSetting'] as const,
    list: () => ['GeneralSetting', 'list'] as const,
  },
  generalMasters: {
    all: ['GeneralMaster'] as const,
    list: () => ['GeneralMaster', 'list'] as const,
  },
  banks: {
    all: ['Bank'] as const,
    list: () => ['Bank', 'list'] as const,
  },
  castes: {
    all: ['Caste'] as const,
    list: () => ['Caste', 'list'] as const,
  },
  subCastes: {
    all: ['SubCaste'] as const,
    list: () => ['SubCaste', 'list'] as const,
  },
  qualifications: {
    all: ['Qualification'] as const,
    list: () => ['Qualification', 'list'] as const,
  },
  qualificationGroups: {
    all: ['QualificationGroup'] as const,
    list: () => ['QualificationGroup', 'list'] as const,
  },
  holidayCalendar: {
    all: ['CollegeCalendar'] as const,
    list: (collegeId?: number, academicYearId?: number) =>
      ['CollegeCalendar', 'list', { collegeId, academicYearId }] as const,
  },
  workflowStages: {
    all: ['WorkflowStage'] as const,
    list: () => ['WorkflowStage', 'list'] as const,
  },
  studentCategories: {
    all: ['StudentCategory'] as const,
    list: () => ['StudentCategory', 'list'] as const,
  },
  workflowMemberAuthorizations: {
    all: ['WorkflowMemberAuthorization'] as const,
    list: () => ['WorkflowMemberAuthorization', 'list'] as const,
  },
  collegeCertificates: {
    all: ['CollegeCertificate'] as const,
    list: () => ['CollegeCertificate', 'list'] as const,
  },
  documentRepositories: {
    all: ['DocumentRepository'] as const,
    list: () => ['DocumentRepository', 'list'] as const,
  },
  weekdays: {
    all: ['Weekday'] as const,
    list: () => ['Weekday', 'list'] as const,
  },
  configAutoNumbers: {
    all: ['ConfigAutoNumber'] as const,
    organizations: () => ['ConfigAutoNumber', 'organizations'] as const,
    colleges: (organizationId?: number) => ['ConfigAutoNumber', 'colleges', organizationId] as const,
    list: (organizationId?: number, collegeId?: number) =>
      ['ConfigAutoNumber', 'list', { organizationId, collegeId }] as const,
  },

  // ── Question Banks ─────────────────────────────────────────────────────
  questionBanks: {
    all: ['Assessment'] as const,
    /** Pass userId to filter by owner (non-ADMIN); omit for all (ADMIN) */
    list: (userId?: number) =>
      userId !== undefined
        ? (['Assessment', 'list', userId] as const)
        : (['Assessment', 'list'] as const),
    /** Questions inside a specific bank */
    questions: (assessmentId: number) =>
      ['Assessment', assessmentId, 'questions'] as const,
    /** Question types from GeneralDetail lookup */
    questionTypes: () => ['Assessment', 'questionTypes'] as const,
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

  /** Email & SMS pages — reference data for filters */
  emailSms: {
    all: ['EmailSms'] as const,
    sendLoginDetailsColleges: () => ['EmailSms', 'sendLoginDetails', 'colleges'] as const,
    sendLoginDetailsRoles: (organizationId: number) =>
      ['EmailSms', 'sendLoginDetails', 'roles', organizationId] as const,
    /** `domain/list/SmsPattern` — `messagepatternfor==ABSENT` (Angular send-absent-sms). */
    smsPatternsAbsent: () => ['EmailSms', 'smsPatterns', 'ABSENT'] as const,
    /** Email logs grid — college + optional yyyy-MM-dd range. */
    emailLogs: (collegeId: number, fromDate: string, toDate: string) =>
      ['EmailSms', 'emailLogs', collegeId, fromDate, toDate] as const,
    /** Active colleges for email logs filter (same source as department-wise email). */
    emailLogsColleges: () => ['EmailSms', 'emailLogs', 'colleges'] as const,
  },
} as const
