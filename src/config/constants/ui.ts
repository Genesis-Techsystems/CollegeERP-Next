/**
 * UI-related constants: status labels, badge colors, display messages, alias labels.
 */

/** Status display labels */
export const STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
} as const

/** Badge color variants for status values */
export const STATUS_VARIANTS = {
  active: 'success',
  inactive: 'destructive',
  pending: 'warning',
  draft: 'secondary',
  published: 'default',
} as const

/** Empty state messages by context */
export const EMPTY_STATE_MESSAGES = {
  NO_RECORDS: 'No records found',
  NO_EXAMS: 'No exam masters found. Create one to get started.',
  NO_LABELS: 'No labels added yet. Add labels for each exam type.',
  SELECT_FILTERS: 'Select filters above to view data.',
  NO_EXAM_TYPES: 'No exam types configured for this exam.',
} as const

/** Form validation messages */
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  MIN_LENGTH: (n: number) => `Must be at least ${n} characters`,
  MAX_LENGTH: (n: number) => `Cannot exceed ${n} characters`,
} as const

/**
 * Alias labels for domain terminology.
 * Allows institution-specific overrides (e.g., "Course Year" -> "Semester").
 *
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/alias-labels.ts
 * To customize for a different institution, change the values here.
 */
export const ALIAS_LABELS = {
  organization: 'Organization',
  university: 'University',
  college: 'College',
  academicYear: 'Academic Year',
  course: 'Course',
  courseGroup: 'Course Group',
  courseYear: 'Course Year',
  subject: 'Subject',
  exam: 'Exam',
  regulation: 'Regulation',
} as const

export type AliasLabelKey = keyof typeof ALIAS_LABELS

/**
 * General master codes used as query parameters for GeneralDetail lookups.
 * Maps semantic names to the generalMasterCode strings expected by Spring Boot.
 *
 * Usage: `domain/list/GeneralDetail?query=GeneralMaster.generalMasterCode==${GM_CODES.EXAM_FEE_TYPE}`
 */
export const GM_CODES = {
  QUOTA: 'QUOTA',
  DISABILITY: 'DISABIL',
  TITLE: 'TITLE',
  STUDENT_TYPE: 'STDTYPE',
  NATIONALITY: 'NATIONALITY',
  RELIGION: 'RELI',
  BLOOD_GROUP: 'BGRP',
  LANGUAGE: 'LANG',
  MARITAL_STATUS: 'MAST',
  AFFILIATION: 'AFFL',
  COLLEGE_TYPE: 'CLGTY',
  DOC_TYPE: 'DOCTYPE',
  SUBJECT_TYPE: 'SUBTYPE',
  SUBJECT_CATEGORY: 'SUBCAT',
  GENDER: 'GENDER',
  MODE_OF_ENQUIRY: 'MODEENQ',
  KNOW_ABOUT_US: 'KABTUS',
  ENQUIRY_STATUS: 'ENQST',
  EMPLOYEE_STATUS: 'EMPSTS',
  EMPLOYEE_STATE: 'EMPST',
  EMPLOYEE_GRADE: 'EMPGRADE',
  EMPLOYEE_TYPE: 'EMPTYPE',
  EMPLOYEE_CATEGORY: 'EMPCAT',
  EMPLOYEE_WORK_CATEGORY: 'EMPWRKCT',
  TEACHER_FOR: 'TCHNGFR',
  APPOINTMENT_TYPE: 'APPMNT',
  PAY_MODE: 'PAYMDE',
  PAYMENT_MODE: 'PYMNTMDE',
  RESIDENT: 'RESD',
  ACCOMMODATION: 'ACCMDTN',
  MODE_OF_STUDY: 'MDESTDY',
  DOC_FORM_TYPE: 'DOCFORM',
  LESSON_STATUS: 'LSNSTS',
  FEE_PAYMENT_TYPE: 'FEEPAYTYPE',
  BOOK_BIND_TYPE: 'BINDTYPE',
  PERIODICAL_FREQ: 'PERIODICALFREQ',
  PERIODICAL_TYPE: 'PERIODICALTYPE',
  PROCESS_STATUS: 'PROCSTATUS',
  RETURN_BOOK_CONDITION: 'RETBOOKCOND',
  BOOK_ISSUED: 'BOOKISSUED',
  CURRENCY_TYPE: 'CURNCYTYPR',
  BOOK_REG_TYPE: 'BOOKREGTYPE',
  BOOK_PRIORITY: 'BOOKPRIOR',
  LIB_FINE_TYPE: 'LIBFINETYPE',
  LIB_SETTING: 'LIBSETTING',
  LEAVE_TYPE_DURATION: 'LEAVETYPEDUR',
  COUNSELING_STATUS: 'CONACTSTAT',
  LEAVE_STATUS: 'LEAVEPS',
  HOSTEL_FOR: 'HSTLFOR',
  HOSTEL_ROOM_TYPE: 'HSTLROOM',
  PAYMENT_TYPE_FREQ: 'PMTFREQ',
  AUDIENCE: 'AUDTYPE',
  RELATION: 'RELATION',
  EVENT_STATUS: 'EVNTSTS',
  VEHICLE_TYPE: 'VEHTYPE',
  FEE_FREQUENCY: 'PERIODICALFREQ',
  CERTIFICATE_STATUS: 'CERTSTATUS',
  CERTIFICATE_WORKFLOW_STATUS: 'CERTWFSTAGE',
  STUDENT_STATUS: 'STUDENTSTATUS',
  GRIEVANCE: 'GRV',
  STD_APP_WF: 'StdAppForm',
  SPECIAL_FEE: 'Spcl Fee',
  PAY_SLIP_STATUS: 'PAYSLIPSTATUS',
  ITEM_TYPE: 'ITEMCATTYPE',
  PURCHASE_STATUS: 'POSTATUS',
  QUALIFY_EXAM_TYPE: 'QUALIFYEXAM',
  FB_INPUT_TYPE: 'FBINPTYP',
  FB_USERS: 'FeedBackUsers',
  ASSIGN_TYPE: 'ASIGNTYPE',
  ASSIGN_STATUS: 'ASIGNSTATUS',
  ASSIGN_STATUS_WF: 'ASSIGNMENT',
  ISSUE_STATUS: 'ISSUESTATUS',
  CAMPUS_COMPLAINT: 'CMPLT',
  EXAM_SESSION: 'EXMSESN',
  INVIGILATOR_DISG_TYPES: 'INVLATRDISG',
  SUGGESTION_FOR: 'SUGSTNFOR',
  SUGGESTION_TYPE: 'SUGSTNTYPE',
  SPECIAL_ACTIVITY: 'SPCACT',
  SCHEDULE_STATUS: 'SCHSTA',
  TRAINING_TYPE: 'PLCMNTTRNGTYP',
  EXAM_FEE_TYPE: 'EXMFEETYP',
  SERVICE_CATEGORY: 'SERVICECATEGORY',
  EMP_ACTIVE_STATUS: 'ACTV',
  PAYER_TYPE: 'PYRTYP',
  EXAM_SEAT_STATUS: 'EXMSEATS',
  /** Angular CONSTANTS.examBagDispatchStatus — generalDetailsByCode */
  EXAM_BAG_DISPATCH_STATUS: 'ExamBagDispatchStatus',
  ADDITIONAL_FEE_TYPE: 'ADDFEETYPE',
  EXAM_RESULT: 'RESULT',
  INTERNAL_EXAM_MARKS_TYPE: 'EIMT',
  REVISION_TYPE: 'REVISIONTYPE',
  TRANSACTION_TYPE: 'TRANSACTIONTYPE',
  EXAM_PAY_STATUS: 'EXAMPAYSTATUS',
  PLACEMENT_TYPE: 'PSTTYPE',
  PLACEMENT_STATUS: 'PLCMNTSTS',
  PO_TYPE: 'POTYPE',
  TRANS_TYPE: 'TRANSTYPE',
  LESSON_STATUS_TYPE: 'LESSONSTATUS',
  ACHIEVEMENT_LEVEL: 'ACHVMNTLVL',
  PRIZES: 'PRIZECAT',
  SUBJECT_CAT_REGISTRATION: 'SUBCATREG',
  SUBJECT_REGISTRATION_STATUS: 'SUBREGSTS',
  GAINFUL_ENGAGEMENT: 'GNFENGMNT',
  EMP_RATINGS: 'EMPRATING',
  WORK_LEVEL: 'LVLWRK',
  QUESTION_TYPE: 'QUESTYPES',
  PROFILE_ACTIVITY_TYPES: 'PROFILEACTIVITYTYPES',
  PROFILE_ACTIVITIES: 'PROFILEACIVITIES',
  RESULT_VALIDATION: 'RESULTVALID',
  INTERNAL_PATTERN: 'INTERNALPATTERN',
  OUTCOME: 'OUTCOME',
  ONLINE_FEE: 'ONLINEFEE',
  PROGRAM_OUTCOMES_CAT: 'PRGNMOUTCMS',
  TAXONOMY_CAT: 'TAXONOMY',
  TEACHING_METHODOLOGY: 'TECHMETHD',
  MAJOR_ACCOUNT_TYPE: 'MajorAccountType',
  INCOME_EXPENSES_TYPES: 'INCMEXTRNSTYP',
  STD_CCA_TYPE: 'STDCCATYPE',
  STD_CCA: 'STDCCA',
  UNIVERSITY_FEE_CATEGORY: 'UniversityFeeCategory',
  REMUNERATION_APPROVALS_STATUS: 'APPROVALSTATUS',
  PAPER_TYPE: 'PAPERTYPE',
  EVALUATION_STATUS: 'EvaluationStatus',
  EVALUATION_PAPER_STATUS: 'EvaluationPaperStatus',
  PAY_SCHEDULE: 'PAYSCHEDULE',
} as const

export type GeneralMasterCode = typeof GM_CODES[keyof typeof GM_CODES]
