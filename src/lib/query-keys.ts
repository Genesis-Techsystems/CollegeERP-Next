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

  // ── Scholarship Management ───────────────────────────────────────────────
  scholarshipTypes: {
    all: ['ScholarshipType'] as const,
    list: () => ['ScholarshipType', 'list'] as const,
  },
  scholarshipApplications: {
    all: ['SchStdApplication'] as const,
    list: (collegeId: number, academicYearId: number) =>
      ['SchStdApplication', 'list', { collegeId, academicYearId }] as const,
  },
  schPreceedings: {
    all: ['SchPreceeding'] as const,
    list: (filters: { collegeId: number; academicYearId: number; financialYearId: number; page?: number }) =>
      ['SchPreceeding', 'list', filters] as const,
  },
  schAccountsPreceedings: {
    all: ['SchAccountsPreceeding'] as const,
    list: (collegeId?: number) => ['SchAccountsPreceeding', 'list', collegeId] as const,
  },
  schStdPreceedings: {
    all: ['SchStdPreceeding'] as const,
    list: (schPreceedingId: number) => ['SchStdPreceeding', 'list', schPreceedingId] as const,
  },
  feeSchStructures: {
    all: ['FeeSchStructure'] as const,
    list: (filters: { collegeId: number; academicYearId?: number; courseId?: number; batchId?: number }) =>
      ['FeeSchStructure', 'list', filters] as const,
    detail: (feeSchStructureId: number) => ['FeeSchStructure', 'detail', feeSchStructureId] as const,
    values: (feeSchStructureId: number) => ['ScholarshipValue', 'byStructure', feeSchStructureId] as const,
  },
  assignScholarship: {
    all: ['AssignScholarship'] as const,
    batches: (courseId: number) => ['AssignScholarship', 'batches', courseId] as const,
    students: (filters: Record<string, number | undefined>) =>
      ['AssignScholarship', 'students', filters] as const,
    types: (filters: Record<string, number | undefined>) =>
      ['AssignScholarship', 'types', filters] as const,
  },
  scholarshipFilters: {
    all: ['scholarshipFilters'] as const,
    college: (orgId: number, empId: number) => ['scholarshipFilters', orgId, empId] as const,
  },

  // ── Admission ─────────────────────────────────────────────────────────────
  admission: {
    all: ['Admission'] as const,
    collegeFilters: (orgId: number, empId: number) =>
      ['Admission', 'collegeFilters', orgId, empId] as const,
    univFilters: (orgId: number, empId: number) =>
      ['Admission', 'univFilters', orgId, empId] as const,
    applicationForms: (filters: { collegeId: number; academicYearId: number; courseId: number }) =>
      ['Admission', 'applicationForms', filters] as const,
    enquiries: (filters?: { organizationId?: number; collegeId?: number; courseId?: number }) =>
      ['Admission', 'enquiries', filters] as const,
    casteQuotas: () => ['Admission', 'casteQuotas'] as const,
    collegeCounselling: (filters: { collegeId: number; batchId: number; courseGroupId: number }) =>
      ['Admission', 'collegeCounselling', filters] as const,
    univStdApplications: () => ['Admission', 'univStdApplications'] as const,
    feePaidApplications: (filters: Record<string, number | string | undefined>) =>
      ['Admission', 'feePaidApplications', filters] as const,
    admissionAllotmentsList: (collegeId: number) =>
      ['Admission', 'allotments', 'list', collegeId] as const,
    admissionAllotmentConsolidate: (collegeId: number) =>
      ['Admission', 'allotments', 'consolidate', collegeId] as const,
  },

  // ── Affiliated Colleges ───────────────────────────────────────────────────
  affiliatedColleges: {
    all: ['AffiliatedColleges'] as const,
    collegeFilters: (orgId: number, empId: number) =>
      ['AffiliatedColleges', 'collegeFilters', orgId, empId] as const,
    examFilters: (orgId: number, empId: number) =>
      ['AffiliatedColleges', 'examFilters', orgId, empId] as const,
    uploadSummary: (filters: Record<string, number>) =>
      ['AffiliatedColleges', 'uploadSummary', filters] as const,
    uploadsApprovalSummary: (filters: Record<string, number>) =>
      ['AffiliatedColleges', 'uploadsApprovalSummary', filters] as const,
    uploadsApprovalDetail: (proc: string, uploadFileId: number) =>
      ['AffiliatedColleges', 'uploadsApprovalDetail', proc, uploadFileId] as const,
    collegeSummary: (flag: string, filters: Record<string, number>) =>
      ['AffiliatedColleges', 'collegeSummary', flag, filters] as const,
    examPayments: (collegeId: number, examId: number) =>
      ['AffiliatedColleges', 'examPayments', collegeId, examId] as const,
    assignSubjects: (
      collegeId: number,
      academicYearId: number,
      studentId: number,
      courseYearId: number,
    ) =>
      ['AffiliatedColleges', 'assignSubjects', collegeId, academicYearId, studentId, courseYearId] as const,
  },

  // ── HR & Payroll ──────────────────────────────────────────────────────────
  hrPayroll: {
    all: ['HrPayroll'] as const,
    payrollCategories: () => ['HrPayroll', 'payrollCategories'] as const,
    payrollGroups: () => ['HrPayroll', 'payrollGroups'] as const,
    payslipSettings: () => ['HrPayroll', 'payslipSettings'] as const,
    departmentHeads: () => ['HrPayroll', 'departmentHeads'] as const,
    leaveTypes: () => ['HrPayroll', 'leaveTypes'] as const,
    leaveApplications: () => ['HrPayroll', 'leaveApplications'] as const,
    employees: () => ['HrPayroll', 'employees'] as const,
    employeeReporting: (employeeId?: number) =>
      employeeId != null
        ? (['HrPayroll', 'employeeReporting', employeeId] as const)
        : (['HrPayroll', 'employeeReporting'] as const),
    employeeDetail: (employeeId: number) => ['HrPayroll', 'employeeDetail', employeeId] as const,
    performanceAssessment: (employeeId?: number) =>
      employeeId != null
        ? (['HrPayroll', 'performanceAssessment', employeeId] as const)
        : (['HrPayroll', 'performanceAssessment'] as const),
    selfAppraisalForms: (collegeId: number) => ['HrPayroll', 'selfAppraisalForms', collegeId] as const,
    biometricEmployees: (collegeId: number | null, page: number, pageSize: number, unassigned: boolean) =>
      ['HrPayroll', 'biometricEmployees', collegeId, page, pageSize, unassigned] as const,
    employeeShifts: (employeeId: number) => ['HrPayroll', 'employeeShifts', employeeId] as const,
    shifts: () => ['HrPayroll', 'shifts'] as const,
    leaveEntitlement: (collegeId: number, leaveYear: string, departmentId: number) =>
      ['HrPayroll', 'leaveEntitlement', collegeId, leaveYear, departmentId] as const,
    employeePayrollGroup: (payrollGroupId: number) =>
      ['HrPayroll', 'employeePayrollGroup', payrollGroupId] as const,
    employeePayrollByCollege: (collegeId: number) =>
      ['HrPayroll', 'employeePayrollByCollege', collegeId] as const,
    staffPayrollReport: (
      flag: string,
      collegeId: number,
      deptId: number,
      catId: number,
      month: number,
      year: number,
    ) => ['HrPayroll', 'staffPayrollReport', flag, collegeId, deptId, catId, month, year] as const,
  },

  // ── Timetable management ────────────────────────────────────────────────────
  timetableManagement: {
    all: ['TimetableManagement'] as const,
    timingSets: () => ['TimetableManagement', 'timingSets'] as const,
    timetables: () => ['TimetableManagement', 'timetables'] as const,
    weekdays: () => ['TimetableManagement', 'weekdays'] as const,
    timingSetDetail: (timingsetId: number) =>
      ['TimetableManagement', 'timingSetDetail', timingsetId] as const,
    classTimings: (timingsetId: number) =>
      ['TimetableManagement', 'classTimings', timingsetId] as const,
  },

  // ── E-Office ──────────────────────────────────────────────────────────────
  eOffice: {
    all: ['EOffice'] as const,
    letterFormats: (organizationId: number, collegeId: number) =>
      ['EOffice', 'letterFormats', organizationId, collegeId] as const,
    internalIndents: () => ['EOffice', 'internalIndents'] as const,
    internalIndent: (id: number) => ['EOffice', 'internalIndent', id] as const,
    purchaseOrders: () => ['EOffice', 'purchaseOrders'] as const,
    purchaseOrder: (id: number) => ['EOffice', 'purchaseOrder', id] as const,
    lookup: () => ['EOffice', 'lookup'] as const,
  },

  mentorship: {
    all: ['Mentorship'] as const,
    activityTypes: () => ['Mentorship', 'activityTypes'] as const,
  },

  events: {
    all: ['Events'] as const,
    eventTypes: () => ['Events', 'eventTypes'] as const,
    departmentEvents: () => ['Events', 'departmentEvents'] as const,
    collegeEvents: (collegeId: number, academicYearId: number) =>
      ['Events', 'collegeEvents', collegeId, academicYearId] as const,
    monthEvents: (
      collegeId: number,
      academicYearId: number,
      date: string,
    ) => ['Events', 'monthEvents', collegeId, academicYearId, date] as const,
  },

  library: {
    all: ['Library'] as const,
    membership: (mode: string, search: string, collegeId: number) =>
      ['Library', 'membership', mode, search, collegeId] as const,
    details: () => ['Library', 'details'] as const,
    authors: () => ['Library', 'authors'] as const,
    publishers: () => ['Library', 'publishers'] as const,
    racks: () => ['Library', 'racks'] as const,
    bookCategories: () => ['Library', 'bookCategories'] as const,
    libraryCategories: () => ['Library', 'libraryCategories'] as const,
    suppliers: () => ['Library', 'suppliers'] as const,
    librariesByOrg: (organizationId: number) =>
      ['Library', 'librariesByOrg', organizationId] as const,
    books: (mode?: string, search?: string) =>
      ['Library', 'books', mode ?? 'all', search ?? ''] as const,
    booksByCategory: (libraryId: number, bookcatId: number) =>
      ['Library', 'booksByCategory', libraryId, bookcatId] as const,
    collegesForLibrary: () => ['Library', 'collegesForLibrary'] as const,
    librariesByCollege: (collegeId: number) => ['Library', 'librariesByCollege', collegeId] as const,
    bookCategoriesByLibrary: (libraryId: number) =>
      ['Library', 'bookCategoriesByLibrary', libraryId] as const,
    periodicals: () => ['Library', 'periodicals'] as const,
    bookDueList: (page: number) => ['Library', 'bookDueList', page] as const,
    reservedBooks: () => ['Library', 'reservedBooks'] as const,
    booksSearch: (term: string) => ['Library', 'booksSearch', term] as const,
    settings: () => ['Library', 'settings'] as const,
    bookDetails: () => ['Library', 'bookDetails'] as const,
    fineCollection: (date: string, collegeId: number) =>
      ['Library', 'fineCollection', date, collegeId] as const,
  },

  /** Hostel module */
  hostel: {
    all: ['Hostel'] as const,
    types: () => ['Hostel', 'types'] as const,
    details: () => ['Hostel', 'details'] as const,
    detailsByOrg: (organizationId: number) => ['Hostel', 'details', organizationId] as const,
    roomCharges: () => ['Hostel', 'roomCharges'] as const,
    rooms: (hostelId: number) => ['Hostel', 'rooms', hostelId] as const,
    roomAllocations: (hostelId: number, hstlRoomId: number) =>
      ['Hostel', 'roomAllocations', hostelId, hstlRoomId] as const,
    discounts: () => ['Hostel', 'discounts'] as const,
    register: (hostelId: number) => ['Hostel', 'register', hostelId] as const,
    visitors: (hostelId: number) => ['Hostel', 'visitors', hostelId] as const,
    visitorsReport: (hostelId: number, from: string, to: string) =>
      ['Hostel', 'visitorsReport', hostelId, from, to] as const,
  },

  /** TC & No Due Approval */
  tcNoDue: {
    all: ['TcNoDue'] as const,
    colleges: () => ['TcNoDue', 'colleges'] as const,
    academicYears: (collegeId: number) => ['TcNoDue', 'academicYears', collegeId] as const,
    collegeCerts: (collegeId: number, code?: string) =>
      ['TcNoDue', 'collegeCerts', collegeId, code ?? 'all'] as const,
    certIssues: (collegeCertificateId: number) =>
      ['TcNoDue', 'certIssues', collegeCertificateId] as const,
    studentIssue: (studentId: number, collegeCertificateId: number) =>
      ['TcNoDue', 'studentIssue', studentId, collegeCertificateId] as const,
    workflows: (feeCertificateIssueId: number) =>
      ['TcNoDue', 'workflows', feeCertificateIssueId] as const,
    summaryReport: (collegeId: number, from: string, to: string) =>
      ['TcNoDue', 'summaryReport', collegeId, from, to] as const,
  },

  /** Transport module */
  transport: {
    all: ['Transport'] as const,
    details: () => ['Transport', 'details'] as const,
    vehicles: () => ['Transport', 'vehicles'] as const,
    drivers: () => ['Transport', 'drivers'] as const,
    helpers: () => ['Transport', 'helpers'] as const,
    routes: () => ['Transport', 'routes'] as const,
    routeStops: (routeId: number) => ['Transport', 'routeStops', routeId] as const,
    vehicleDrivers: () => ['Transport', 'vehicleDrivers'] as const,
    vehicleRoutes: () => ['Transport', 'vehicleRoutes'] as const,
    distanceFees: () => ['Transport', 'distanceFees'] as const,
    allocations: (forType: 'S' | 'E') => ['Transport', 'allocations', forType] as const,
    studentTransport: (params: Record<string, string | number>) =>
      ['Transport', 'studentTransport', params] as const,
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

  // ── Campus Maintenance Issues ─────────────────────────────────────────────
  campusIssues: {
    all: ['ClgManagementIssue'] as const,
    list: () => ['ClgManagementIssue', 'list'] as const,
    byEmployee: (empId: number) => ['ClgManagementIssue', 'byEmployee', empId] as const,
    detail: (id: number) => ['ClgManagementIssue', 'detail', id] as const,
  },
} as const
