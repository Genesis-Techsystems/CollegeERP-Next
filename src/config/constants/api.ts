/**
 * Spring Boot API endpoint constants.
 * All paths are relative to SPRING_API_URL (server-side) or /api/proxy/ (client-side).
 *
 * Usage:
 *   Server (integrations/): `${SPRING_API_URL}/${AUTH_API.LOGIN}`
 *   Client (services/):     `fetch(\`/api/proxy/\${EXAM_API.GET_COLLEGE_FILTERS}?...\`)`
 */

// ─── Domain CRUD paths ───────────────────────────────────────────────────────
// Used exclusively by CrudService (src/services/crud.ts).

export const DOMAIN = {
  LIST: "domain/list",
  GET: "domain/get",
  /** Spring CMS-prefixed domain list (e.g. staff users by college + user type code). */
  CMS_LIST: "cms/domain/list",
  CREATE: "domain/create",
  /** CMS-prefixed domain create — some deployments require this for `User` writes. */
  CMS_CREATE: "cms/domain/create",
  UPDATE: "domain/update",
  /** CMS-prefixed domain update — pairs with {@link CMS_LIST} / {@link CMS_CREATE} on CMS apps. */
  CMS_UPDATE: "cms/domain/update",
  PROC: "getAllRecords",
} as const;

// ─── Authentication ──────────────────────────────────────────────────────────
// Used in integrations/spring-api.ts ONLY — never call from client components.

export const AUTH_API = {
  /** POST: authenticate user, returns JWT */
  LOGIN: "api/auth/login",
  /** POST: logout */
  LOGOUT: "api/auth/logout",
  /** GET: fetch UserDTO with modules/pages */
  AUTHORIZATION: "api/authorization",
  /** POST: reset password request */
  RESET_PASSWORD: "api/auth/resetPassword",
  /** POST: save new password */
  SAVE_PASSWORD: "api/auth/savePassword",
  /** GET: security auth details */
  AUTH_DETAILS: "api/auth/authdetails",
  /** GET: user access */
  USER_ACCESS: "useraccess",
  /** GET: user pages */
  USER_PAGES: "userpages",
  /** Angular `resetStdPassword` */
  RESET_STD_PASSWORD: "api/auth/updatePassword",
} as const;

// ─── User management (non-domain helpers) ────────────────────────────────────

export const USER_MANAGEMENT_API = {
  /**
   * GET paginated users by type code (Angular `listByTypeCodeWithPageNation`).
   * Query: `userTypeCode`, `page`, `size`.
   */
  USER_DETAILS_BY_TYPE: "api/userdetailsbytype",
  /**
   * GET CMS student typeahead (Angular add-student-account modal).
   * Query: `collegeId`, `q` — e.g. `/cms/studentsearch?collegeId=16&q=Shrav`
   */
  STUDENT_SEARCH: "cms/studentsearch",
  /**
   * POST CMS student **User** create (Spring: `/cms/api/createuser`).
   * Proxied as `/api/proxy/cms/api/createuser`.
   */
  CREATE_USER_CMS: "cms/api/createuser",
  /** Angular `roleCrudUrl` */
  ROLE: "Role",
  /** Angular `rolePrivilegeCrudUrl` */
  ROLE_PRIVILEGE: "RolePrivilege",
  /** Angular `rolePrivilegeListUrl` */
  ROLE_PRIVILEGE_2: "roleprivilegelist",
  /** Angular `userTypeCrudUrl` */
  USER_TYPE: "Usertype",
  /** Angular `creatingUserForStudentsUrl` */
  CREATING_USER_FOR_STUDENTS: "creatinguserforstudents",
  /** Angular `UserRoleUrl` */
  USER_ROLE: "UserRole",
} as const;

// ─── Email / SMS (legacy Spring paths — proxied via `NEXT_API.PROXY`) ────────

export const COMMUNICATION_API = {
  /** Angular `sendBulkSms` — POST bulk SMS with filter fields + `numbers[]` (student mobiles). */
  SEND_BULK_SMS: "sendBulkSms",
  /** Angular `sendBulkSmsToMultiUsers` — POST enriched absent-student rows to send SMS. */
  SEND_BULK_SMS_TO_MULTI_USERS: "sendBulkSmsToMultiUsers",
  /** Angular `getSmsToSbsentStudentsUrl` — POST college/year/date (+ null course fields) → absent student rows with message. */
  GET_SMS_TO_ABSENT_STUDENTS: "getsmstoabsentstudents",
  /** Angular `smsHistoryUrl` — GET `?date=&collegeId=&patternId=` for absent SMS history. */
  SMS_HISTORY: "smshistory",
  /**
   * Angular email log / history list — GET `?collegeId=` with optional `fromDate`, `toDate` (yyyy-MM-dd).
   * Falls back in the client to `domain/list/EmailLog` when this path is unavailable.
   */
  EMAIL_HISTORY: "emailhistory",
  /** Angular `smslogindetail` — POST selected user rows to send login credentials via SMS. */
  SMS_LOGIN_DETAIL: "smslogindetail",
  /** Spring `getAllRecords/s_rep_attendance_not_taken_staff` — staff with attendance not marked (Angular send-staff-sms). */
  S_REP_ATTENDANCE_NOT_TAKEN_STAFF: "s_rep_attendance_not_taken_staff",
  /** Angular `sendBulkEmailtoEmployeesForAttendanceUrl` — POST bulk email after staff attendance SMS. */
  SEND_BULK_EMAIL_EMPLOYEES_ATTENDANCE: "sendBulkEmailtoEmployeesForAttendance",
  /** Angular `uploadFileForEmailUrl` — multipart POST; response `data` is stored path. */
  UPLOAD_FILE_FOR_EMAIL: "uploadFileForEmail",
  /** Angular `sendBulkEmailtoStudentsUrl` — POST selected student ids + email fields. */
  SEND_BULK_EMAIL_TO_STUDENTS: "sendBulkEmailtoStudents",
  /** Angular `sendBulkEmailtoSectionStudentsUrl` — POST filter fields + `sectionIds[]`. */
  SEND_BULK_EMAIL_TO_SECTION_STUDENTS: "sendBulkEmailtoSectionStudents",
  /** Angular `sendBulkEmailtoStudentsByCYurl` — department-wise email, student mode + `courseYearIds[]`. */
  SEND_BULK_EMAIL_TO_STUDENTS_BY_CY: "sendBulkEmailtoStudentsByCY",
  /** Angular `sendBulkEmailtoEmployeesUrl` — department-wise email, employee mode + `departmentIds[]`. */
  SEND_BULK_EMAIL_TO_EMPLOYEES: "sendBulkEmailtoEmployees",
  /**
   * Angular principal / staff → admin email — `addMasterDetails(sendBulkEmailtoAdminUrl, email)` (or equivalent).
   * POST body mirrors department-wise employee email with `userIds[]` instead of `departmentIds[]`.
   */
  SEND_BULK_EMAIL_TO_ADMIN: "sendBulkEmailtoAdmin",
  /** Angular `smsToStudentsUrl` */
  SMS_TO_STUDENTS: "sendsmstostudents",
  /** Angular `smsPatternCrudUrl` */
  SMS_PATTERN: "SmsPattern",
  /** Angular `smsstaffUrl` */
  SMSSTAFF: "smsstaff",
  /** Angular `sendBulkSmsMaaUrl` */
  SEND_BULK_SMS_MAA: "sendBulkSmsMaa",
  /** Angular `SmsReportConfigUrl` */
  SMS_REPORT_CONFIG: "SmsReportConfig",
  /** Angular `sendEmailToAdminurl` */
  SEND_EMAIL_TO_ADMIN: "sendEmailToAdmin",
  /** Angular `emailsentlistbydateUrl` */
  EMAILSENTLISTBYDATE: "emailsentlistbydate",
} as const;

// ─── Examination Management ──────────────────────────────────────────────────

export const EXAM_API = {
  /** POST: upload notification/fee-notification file (multipart) */
  UPLOAD_EXAM_NOTIFICATION: "examnotificationupload",
  /** POST: save all exam master label details */
  SAVE_EXAM_DETAILS: "addExamMasterDetails",
  /** GET: university curriculum report (Angular `curriculumReportUrl`) */
  CURRICULUM_REPORT: "getAllRecords/curriculum_report",
  /** GET: exam student registration / TT details (Angular examStudentRegistrationDetailsUrl) */
  EXAM_STD_REG_TT_DETAILS: "getAllRecords/s_get_exam_std_reg_tt_details",
  /** GET: exam student registration counts (Angular getExamStdRegistrationUrl) */
  EXAM_STD_REGISTRATION: "getAllRecords/s_get_exam_std_registration",
  /** GET: exam allotment details */
  GET_EXAM_ALLOTMENT_DETAILS: "getAllRecords/s_get_exam_allotment_details",
  /** GET: exam detail status by codes */
  GET_EXAM_DETAIL_STATUS: "getAllRecords/s_get_examdetail_status_bycodes",
  /** GET: room vacancy for exam room allotment (Angular `getExamRoomDetailsUrl`) */
  GET_EXAM_MASTER_DETAILS: "s_get_exam_masterdetails",
  /** POST: exam room allotment */
  EXAM_ROOM_ALLOTMENT: "examroomallotment",
  /** GET: exam student results */
  GET_EXAM_STUDENT_RESULTS: "getAllRecords/s_get_exam_student_results",
  /** POST: consolidated / final student result PDF (Angular `examResultPDF`) */
  EXAM_RESULT_PDF: "examResultPDF",
  /** GET: examwise student result */
  GET_EXAMWISE_STUDENT_RESULT: "getAllRecords/s_get_examwise_student_result",
  /** POST: exam marks entry student details */
  EXAM_MARKS_ENTRY_STUDENTS: "exammarksentrystddetails",
  /** GET: exam memo data */
  EXAM_MEMO_DATA: "getAllRecords/s_exam_memodata_pop",
  /** GET: exam student memo details */
  GET_EXAM_STUDENT_MEMO_DETAILS: "getExamStudentMemoDetails",
  /** GET: exam result memos */
  GET_EXAM_RESULT_MEMOS: "getAllRecords/s_get_exam_result_memos",
  /** GET: final internal marks */
  FINAL_INTERNAL_MARKS: "getAllRecords/s_get_exam_internal_final_marks",
  /** GET: batch-wise SGPA report (Angular `batchwisesgpaUrl`) */
  BATCHWISE_SGPA: "getAllRecords/s_get_batchwise_sgpa",
  /** GET: evaluators bank / lab remuneration (Angular `getEvaluatorsBankCopy`) */
  EVALUATORS_BANK_COPY: "getAllRecords/s_get_evaluators_bank_copy_report",
  /** GET: exam evaluation codes / evaluator lists (Angular `getExamEvaluationCodesUrl`) */
  EXAM_EVALUATION_BYCODES: "getAllRecords/s_get_examevaluation_bycodes",
  /** POST: seating solution solve */
  SEATING_SOLUTION_SOLVE: "seatingSolution/solve",
  /** CRUD: seating solution */
  SEATING_SOLUTION: "seatingSolution",
  /** GET: exam student seating all session */
  EXAM_SEATING_ALL_SESSION:
    "getAllRecords/s_pop_exam_student_seating_all_session",
  /** POST: exam student transaction upload */
  EXAM_STD_TXN_UPLOAD: "examstdtxnupload",
  /** POST: save exam timetable rows (batch endpoint) */
  SAVE_EXAM_TIMETABLE: "examtimetable",
  /** GET: exam timetable details by exam date */
  EXAM_TIMETABLE_DETAILS_BY_DATE: "examtimetabledetailsbyexamdate",
  /** GET: exam timetable display DTO (denormalised — examId, courseYearId, courseId params) */
  EXAM_TIMETABLE_DETAILS: "examtimetabledetails",
  /** POST: save exam room allotment rows */
  SAVE_EXAM_ROOM_ALLOTMENT: "examroomallotment",
  /** POST: bulk save exam invigilation allotment rows (Angular examinvigilationallotmentUrl) */
  EXAM_INVIGILATION_ALLOTMENT: "examinvigilationallotment",
  /** POST: save/update an array of ExamMarkssetup rows in one request */
  SAVE_EXAM_MARKS_SETUP: "exammarkssetup",
  /** POST: save/update exam fee structure rows (Angular `examFeeStructureUrl`) */
  SAVE_EXAM_FEE_STRUCTURE: "examfeestructure",
  /** GET: exam course-year subjects (Angular examCourseYearSubjectUrl) — params collegeId, academicYearId, courseyearId, courseGroupId */
  EXAM_COURSE_YEAR_SUBJECT: "examCourseYearSubject",
  /** Angular `examFeeAdditionalStructureUrl` */
  EXAM_FEE_ADDITIONAL_STRUCTURE: "ExamFeeAdditionalStructure",
  /** Angular `addExamStudentAttendanceAndInternalMarksUrl` */
  ADD_EXAM_STUDENT_ATTENDANCE_AND_INTERNAL_MARKS:
    "addExamStudentAttendanceAndInternalMarks",
  /** Angular `validateExamRegFormsurl` */
  VALIDATE_EXAM_REG_FORMS: "validateExamRegForms",
  /** Angular `getExamRegFormsUrl` */
  GET_EXAM_REG_FORMS: "getExamRegForms",
  /** Angular `notificationUploadUrl` */
  NOTIFICATION_2: "notificationupload",
  /** Angular `studentSubjectsForRegularExamUrl` */
  STUDENT_SUBJECTS_FOR_REGULAR_EXAM: "studentsubjectsforregularexam",
  /** Angular `studentSubjectsForSupplyExamUrl` */
  STUDENT_SUBJECTS_FOR_SUPPLY_EXAM: "studentSubjectsForSupplyExam",
  /** Angular `uploadExamRegFormsUrl` */
  UPLOAD_EXAM_REG_FORMS: "uploadExamRegForms",
  /** Angular `examLabBatchesCrudUrl` */
  EXAM_LAB_BATCHES: "ExamLabBatches",
  /** Angular `getExamLabBatchesStudentsUrl` */
  GET_EXAM_LAB_BATCHES_STUDENTS: "getExamLabBatchesStudents",
  /** Angular `addExamLabBatchesStudentsListUrl` */
  ADD_EXAM_LAB_BATCHES_STUDENTS: "addExamLabBatchesStudentsList",
  /** Angular `updateExamLabBatchesStudentsUrl` */
  UPDATE_EXAM_LAB_BATCHES_STUDENTS: "updateExamLabBatchesStudents",
  /** Angular `examStudentRegistrationCrudUrl` */
  EXAM_STUDENT_REGISTRATION: "ExamStudentRegistration",
  /** Angular `examStudentRegistrationPaymentCrudUrl` */
  EXAM_STUDENT_REGISTRATION_PAYMENT: "ExamStudentRegistrationPayment",
  /** Angular `examStudentRegistrationTransactionCrudUrl` */
  EXAM_STUDENT_REGISTRATION_TRANSACTION: "ExamStudentRegistrationTransaction",
  /** Angular `examStudentRegPaymentUrl` */
  EXAM_STUDENT_REG_PAYMENT: "examstudentregpayment",
  /** Angular `examMasterUrl` */
  EXAM_MASTER_2: "ExamMaster",
  /** Angular `ExamMasterDetailsUrl` */
  EXAM_MASTER_DETAILS: "ExamMasterDetails",
  /** Angular `studentHallTicketUrl` */
  STUDENT_HALL_TICKET: "studenthallticket",
  /** Angular `getBulkExamHallticketsUrl` */
  GET_BULK_EXAM_HALLTICKETS: "getBulkExamHalltickets",
  /** Angular `examMarksMemoDownloadUrl` */
  EXAM_MARKS_MEMO: "exammarksmemodownload",
  /** Angular `examRevisionSubjectCrudUrl` */
  EXAM_REVISION_SUBJECT: "ExamRevisionSubject",
  /** Angular `internalExternalMarksUrl` */
  INTERNAL_EXTERNAL_MARKS: "getInternalAndExternamMarks",
  /** Angular `WorkflowMemberAuthorizationsUrl` */
  WORKFLOW_MEMBER_AUTHORIZATIONS: "WorkflowMemberAuthorizations",
  /** Angular `examFCARSetupMasterCrudUrl` */
  EXAM_FCAR_SETUP_MASTER: "ExamFCARSetupMaster",
  /** Angular `examFCARSetupDetailCrudUrl` */
  EXAM_FCAR_SETUP_DETAIL: "ExamFCARSetupDetail",
  /** Angular `examFCARStudentSubMarkCrudUrl` */
  EXAM_FCAR_STUDENT_SUB_MARK: "ExamFCARStudentSubMark",
  /** Angular `examFCARSubjectSyllabusCrudUrl` */
  EXAM_FCAR_SUBJECT_SYLLABUS: "ExamFCARSubjectSyllabus",
  /** Angular `examGradeUrl` */
  EXAM_GRADE: "ExamGrade",
  /** Angular `examTypeCrudUrl` */
  EXAM_TYPE: "ExamTypes",
  /** Angular `examGroupingCrudUrl` */
  EXAM_GROUPING: "ExamGrouping",
  /** Angular `examSubjectwiseEvaluationCrudUrl` */
  EXAM_SUBJECTWISE_EVALUATION: "ExamSubjectwiseEvaluation",
  /** Angular `examSubjectwiseMarksetupCrudUrl` */
  EXAM_SUBJECTWISE_MARKSETUP: "ExamSubjectwiseMarksetup",
  /** Angular `examSessionUrl` */
  EXAM_SESSION: "ExamSession",
  /** Angular `examStudentUrl` */
  EXAM_STUDENT: "ExamStudent",
  /** Angular `examStudentDetailUrl` */
  EXAM_STUDENT_DETAIL: "ExamStudentDetail",
  /** Angular `studentExamFeeReceiptDownloadUrl` */
  STUDENT_EXAM_FEE_RECEIPT: "studentExamFeeReceiptDownload",
  /** Angular `uploadInvigilatorAttendanceSheetUrl` */
  UPLOAD_INVIGILATOR_ATTENDANCE_SHEET: "uploadInvigilatorAttendanceSheet",
  /** Angular `getExamAllotInvigilatorUrl` */
  GET_EXAM_ALLOT_INVIGILATOR: "getExamAllotInvigilator",
  /** Angular `examFeeStructureCourseyrUrl` */
  EXAM_FEE_STRUCTURE_COURSEYR: "ExamFeeStructureCourseyr",
  /** Angular `getStudentExamFeeStructureUrl` */
  GET_STUDENT_EXAM_FEE_STRUCTURE: "getStudentExamFeeStructure",
  /** Angular `examDetailsByStudentCourseYearUrl` */
  EXAM_DETAILS_BY_STUDENT_COURSE_YEAR: "examdetailsbystudentcourseyear",
  /** Angular `getExamtimeTableDetailsUrl` */
  GET_EXAMTIME_TABLE_DETAILS: "getExamtimeTableDetails",
  /** Angular `examTimetableLabBatchesUrl` */
  EXAM_TIMETABLE_LAB_BATCHES: "ExamTimetableLabBatches",
  /** Angular `examTimetableDetailUrl` */
  EXAM_TIMETABLE_DETAIL: "ExamTimetableDetail",
  /** Angular `examStdCourseyrSubjecturl` */
  EXAM_STD_COURSEYR_SUBJECT: "ExamStdCourseyrSubject",
  /** Angular `examStdCourseyrSubUrl` */
  EXAM_STD_COURSEYR_SUB: "examstdcourseyrsub",
  /** Angular `examstdcourseyrsubjectsUrl` */
  EXAMSTDCOURSEYRSUBJECTS: "examstdcourseyrsubjects?",
  /** Angular `examFeeReceiptUrl` */
  EXAM_FEE_RECEIPT: "examfeereceipt",
  /** Angular `examMarksMemoUrl` */
  EXAM_MARKS_MEMO_2: "exammarksmemo",
  /** Angular `examMemoMasterCrudUrl` */
  EXAM_MEMO_MASTER: "ExamMemoMaster",
  /** Angular `subjectsforexamUrl` */
  SUBJECTSFOREXAM: "subjectsforexam",
  /** Angular `examInvigilatorRoomsUrl` */
  EXAM_INVIGILATOR_ROOMS: "examinvigilatorrooms",
  /** Angular `examStudentDetailsUrl` */
  EXAM_STUDENT_DETAILS: "examstudentdetails",
  /** Angular `examStudentInternalMarksUrl` */
  EXAM_STUDENT_INTERNAL_MARKS: "examstudentinternalmarks",
  /** Angular `examStudentInternalMarkCrudUrl` */
  EXAM_STUDENT_INTERNAL_MARK: "ExamStudentInternalMark",
  /** Angular `examStudentMemoSubjectUrl` */
  EXAM_STUDENT_MEMO_SUBJECT: "examStudentMemoSubject",
  /** Angular `examSubjectStudentsUrl` */
  EXAM_SUBJECT_STUDENTS: "examsubjectstudents",
  /** Angular `registeredStudentForExamUrl` */
  REGISTERED_STUDENT_FOR_EXAM: "registeredstudentforexam",
  /** Angular `examroomtudentdetailsUrl` */
  EXAMROOMTUDENTDETAILS: "examroomstudentdetails",
  /** Angular `exammarksdownloadUrl` */
  EXAMMARKSDOWNLOAD: "exammarksdownload",
  /** Angular `uploadexammarksUrl` */
  UPLOADEXAMMARKS: "uploadexammarks",
  /** Angular `uploadBulkExamMarksUrl` */
  UPLOAD_BULK_EXAM_MARKS: "uploadbulkexammarks",
  /** Angular `examHallTicketUrl` */
  EXAM_HALL_TICKET: "examhallticket",
  /** Angular `finalInternalMarksListUrl` */
  FINAL_INTERNAL_MARKS_2: "finalinternalmarks",
  /** Angular `updateExamStudentRegistrationDetailsUrl` */
  UPDATE_EXAM_STUDENT_REGISTRATION_DETAILS:
    "updateExamStudentRegistrationDetails",
  /** Angular `getUnivStgExamRegUrl` */
  GET_UNIV_STG_EXAM_REG: "api/tables/getUnivStgExamReg",
  /** Angular `getUnivStgExamStdFeeUrl` */
  GET_UNIV_STG_EXAM_STD_FEE: "api/tables/getUnivStgExamStdFee",
  /** Angular `examFeeRevisionMasterCrudUrl` */
  EXAM_FEE_REVISION_MASTER: "ExamFeeRevisionMaster",
  /** Angular `examResultProcessingSettingsCrudUrl` */
  EXAM_RESULT_PROCESSING_SETTINGS: "ExamResultProcessingSettings",
} as const;

// ─── Question Bank / Assessments ─────────────────────────────────────────────

export const ASSESSMENT_API = {
  /** POST: add or update a single question (create if no courseQuestionId, update otherwise) */
  ADD_QUESTION: "assessment/addQuestion",
  /** POST: bulk-import questions from Excel; returns array of question objects */
  BULK_IMPORT: "assessment/importQuestionsDetails",
  /** GET (domain/list): searchable course-lesson hierarchy for modal dropdown */
  COURSE_SEARCH: "CourseLessonSearch",
  /** Angular `onlineCoursesCrudUrl` */
  ONLINE_COURSES: "OnlineCourses",
  /** Angular `digitalLibraryMemberUrl` */
  DIGITAL_LIBRARY_MEMBER: "DigitalLibraryMember",
  /** Angular `courseLessonCrudUrl` */
  COURSE_LESSON: "CourseLesson",
  /** Angular `courseLessonsTopicCrudUrl` */
  COURSE_LESSONS_TOPIC: "CourseLessonsTopic",
  /** Angular `courseMemberCrudUrl` */
  COURSE_MEMBER: "CourseMember",
  /** Angular `memberAssessmentCrudUrl` */
  MEMBER_ASSESSMENT: "MemberAssessment",
  /** Angular `memberAssessmentDetailsUrl` */
  MEMBER_ASSESSMENT_DETAILS: "assessment/memberAssessmentDetails",
  /** Angular `onlineCourseAcademicMapUrl` */
  ONLINE_COURSE_ACADEMIC_MAP: "onlinecourseacademicmap",
  /** Angular `assessmentCrudUrl` */
  ASSESSMENT: "Assessment",
  /** Angular `getLessonstatus` */
  GET_LESSONSTATUS: "getLessonstatus",
  /** Angular `lessonstatusurl` */
  LESSONSTATUS: "Lessonstatus",
  /** Angular `assessmentQuestionCrudUrl` */
  ASSESSMENT_QUESTION: "AssessmentQuestion",
  /** Angular `courseLessonsTopicVideoCrudUrl` */
  COURSE_LESSONS_TOPIC_VIDEO: "CourseLessonsTopicVideo",
  /** Angular `addLessonstatusListUrl` */
  ADD_LESSONSTATUS: "addLessonstatusList",
  /** Angular `empPerfAssessmentQuestionsurl` */
  EMP_PERF_ASSESSMENT_QUESTIONS: "EmpPerfAssessmentQuestions",
  /** Angular `empPerfAssessmentFeedbackCrudUrl` */
  EMP_PERF_ASSESSMENT_FEEDBACK: "EmpPerfAssessmentFeedback",
  /** Angular `membersSyncUrl` */
  MEMBERS_SYNC: "membersSync",
} as const;

// ─── Exam Online Paper ───────────────────────────────────────────────────────

export const EXAM_ONLINE_API = {
  /** CRUD: ExamOnlinePaper */
  EXAM_ONLINE_PAPER: "ExamOnlinePaper",
  /** CRUD: ExamOnlineStdPaper */
  EXAM_ONLINE_STD_PAPER: "ExamOnlineStdPaper",
  /** PUT: update time table details */
  UPDATE_TIMETABLE_DETAILS: "examOnline/updateTimeTableDetails",
  /** POST: publish exam */
  PUBLISH_EXAM: "examOnline/publishExam",
  /** GET: exam online students */
  EXAM_ONLINE_STUDENTS: "examOnline",
  /** POST: exam paper upload */
  EXAM_PAPER_UPLOAD: "examOnline/examPaperUrl",
  /** POST: submission file */
  SUBMISSION_FILE: "examOnline/submissionFile",
  /** POST: review submission file */
  REVIEW_SUBMISSION_FILE: "examOnline/reviewSubmissionFile",
  /** CRUD: ExamOnlineQuestion */
  EXAM_ONLINE_QUESTION: "ExamOnlineQuestion",
  /** CRUD: ExamOnlineQuestionOption */
  EXAM_ONLINE_QUESTION_OPTION: "ExamOnlineQuestionOption",
  /** CRUD: ExamOnlineQuestionPaper */
  EXAM_ONLINE_QUESTION_PAPER: "ExamOnlineQuestionPaper",
  /** CRUD: ExamOnlineStudent */
  EXAM_ONLINE_STUDENT: "ExamOnlineStudent",
  /** CRUD: ExamOnlineStudentAnswers */
  EXAM_ONLINE_STUDENT_ANSWERS: "ExamOnlineStudentAnswers",
  /** PUT: update exam online std paper */
  UPDATE_EXAM_ONLINE_STD_PAPER: "examOnline/updateExamOnlineStdPaper",
} as const;

// ─── Exam Evaluation ─────────────────────────────────────────────────────────

export const EXAM_EVAL_API = {
  /** CRUD: ExamEvaluationSettings */
  EVALUATION_SETTINGS: "ExamEvaluationSettings",
  /** CRUD: ExamEvaluatorProfiles */
  EVALUATOR_PROFILES: "ExamEvaluatorProfiles",
  /** POST: add evaluator profiles */
  ADD_EVALUATOR_PROFILES: "addExamEvaluatorProfiles",
  /** PUT: update evaluator profiles */
  UPDATE_EVALUATOR_PROFILES: "updateExamEvaluatorProfiles",
  /** PUT: bulk update evaluator preferences — Angular `updateexamevaluatorereferencesUrl`. */
  UPDATE_EVALUATOR_PREFERENCES: "updateexamevaluatorereferences",
  /** GET: evaluator details */
  GET_EVALUATOR_DETAILS: "getevaluatordetails",
  /** CRUD: ExamEvaluators */
  EVALUATORS: "ExamEvaluators",
  /** POST: upload exam OMR */
  UPLOAD_EXAM_OMR: "uploadExamOmr",
  /**
   * Angular `getCollegeExamDetails` —
   * GET getAllRecords/s_get_collegeexamdetails_bycode
   * (scan-upload filters + answer-paper summary)
   */
  GET_COLLEGE_EXAM_DETAILS: "s_get_collegeexamdetails_bycode",
  /** GET: `getAllRecords/s_get_answerpaperupload_details` — Angular getAnswerPaperUploadUrl (Check Upload Status) */
  ANSWER_PAPER_UPLOAD_DETAILS: "s_get_answerpaperupload_details",
  /** GET: generatePresignedUrls?answerPaperPath=… — presigned S3 URL for answer sheet preview */
  GENERATE_PRESIGNED_URLS: "generatePresignedUrls",
  /** CRUD: ExamStudentAnswerPaper */
  STUDENT_ANSWER_PAPER: "ExamStudentAnswerPaper",
  /** GET: base64 PDF for a student answer paper — Angular: sheetDataUrl = 'sheetData', param: id= */
  SHEET_DATA: "sheetData",
  /** CRUD: ExamQuestionPapers */
  QUESTION_PAPERS: "ExamQuestionPapers",
  /** CRUD: ExamQuestionPaperMarks */
  QUESTION_PAPER_MARKS: "ExamQuestionPaperMarks",
  /**
   * POST: upload question paper / model answer papers (Angular PaperPathUploadUrl).
   * Same as Angular Network: /cms/uploadquestionpapermodelanswerpapers
   */
  PAPER_PATH_UPLOAD: "uploadquestionpapermodelanswerpapers",
  /** POST: add exam evaluators */
  ADD_EXAM_EVALUATORS: "addexamevaluators",
  /** GET: get student answer papers */
  GET_STUDENT_ANSWER_PAPERS: "getstudentanswerpapers",
  /** PUT: update evaluation assignment status */
  UPDATE_EVAL_ASSIGNMENT_STATUS:
    "updateExamEvaluationAssignmentsStatusCatDetId",
  /** POST: add multiple evaluators */
  ADD_MULTIPLE_EVALUATORS: "addMultipleEvaluators",
  /** PUT: update exam question papers */
  UPDATE_EXAM_QUESTION_PAPERS: "updateExamQuestionPapers",
  /** POST: add exam QP template and details */
  ADD_EXAM_QP_TEMPLATE_DETAILS: "addExamQpTemplateAndDetails",
  /** GET: get exam QP template and details */
  GET_EXAM_QP_TEMPLATE_DETAILS: "getExamQpTemplateAndDetails",
  /** GET: exam evaluation reports */
  EXAM_EVAL_REPORTS: "getAllRecords/s_get_examevaluation_reports",
  /** GET: evaluation detail report (Angular evaluationDetailReportUrl) */
  EVALUATION_DETAIL_REPORT: "getAllRecords/s_get_evaluation_detail_report",
  /** GET: exam evaluation unassigned report (Angular getExamUnassnListUrl) */
  EVAL_UNASSIGNED: "getAllRecords/s_get_exam_eval_unassigned",
  /** GET: exam evaluation by codes (Angular getExamEvaluationCodesUrl) */
  EVALUATION_BYCODES: "getAllRecords/s_get_examevaluation_bycodes",
  /** GET: evaluators bank copy / remuneration report (Angular getEvaluatorsBankCopy) */
  EVALUATORS_BANK_COPY_REPORT:
    "getAllRecords/s_get_evaluators_bank_copy_report",
  /** GET: exam pre-moderation reports (Angular ExamPreModerationUrl) */
  PREMODERATION_REPORTS_BYCODES:
    "getAllRecords/s_get_exam_premoderation_reports_bycodes",
  /** GET: exam moderation / pass-percent analysis (Angular getExamModerationReportsUrl) */
  EXAM_MODERATION_REPORTS: "getAllRecords/s_get_exam_moderation_reports",
  /** GET: exam final analysis by codes (Angular ResultFinalAnalysisUrl) */
  EXAM_FINAL_ANALYSIS_BYCODES:
    "getAllRecords/s_get_exam_final_analysis_bycodes",
  /** GET: pre-exam reports */
  PRE_EXAM_REPORTS: "getAllRecords/s_get_preexam_reports",
  /** CRUD: ExamEvaluatorBankDetails */
  EVALUATOR_BANK_DETAILS: "ExamEvaluatorBankDetails",
  /** POST: send user ID and password to evaluator */
  SEND_EVALUATOR_CREDENTIALS: "sendUserIdAndPasswordToEvaluator",
  /** POST: add exam student evaluation pages list */
  ADD_STUDENT_EVAL_PAGES: "addExamStudentEvaluationPagesList",
  /** PUT: update evaluation assignments start date */
  UPDATE_EVAL_ASSIGNMENTS_START_DATE:
    "updateExamEvaluationAssignmentsStartDate",
  /** PUT: update evaluation assignments */
  UPDATE_EVAL_ASSIGNMENTS: "updateExamEvaluationAssignments",
  /** GET: exam question paper details proc */
  GET_EXAM_QP_DETAILS_PROC: "getAllRecords/s_get_examquestionpaper_details",
  /** GET: pop exam question paper details proc */
  POP_EXAM_QP_DETAILS: "getAllRecords/s_pop_exam_questionpaper_details",
  /** POST: save final exam student evaluation PDF */
  SAVE_FINAL_EVAL_PDF: "saveFinalExamStdEvaluationpdf",
  /** POST: add multiple evaluation assignments */
  ADD_MULTIPLE_EVAL_ASSIGNMENTS: "addMultipleExamEvaluationAssignments",
  /** PUT: update evaluations completed count */
  UPDATE_EVALS_COMPLETED_COUNT: "updateEvaluationsCompletedCount",
  /** POST: generate secret code for marks entry (Angular MAINAPI base = cms/api/) */
  GENERATE_SECRET_CODE_MARKS: "api/generateSecretCodeForMarksEntry",
  /** GET: validate secret code for marks entry (cms/api/...) */
  VALIDATE_SECRET_CODE_MARKS: "api/validateSecretCodeForMarksEntry",
  /** GET: subject wise moderation */
  SUBJECT_WISE_MODERATION: "getAllRecords/s_pop_exam_subjectwisemoderation",
  /** GET: evaluation marks finalise */
  EVALUATION_MARKS_FINALISE: "getAllRecords/s_pop_exam_evaluationmarksfinalise",
  /** GET: exam lab batches report */
  EXAM_LAB_BATCHES_REPORT: "getAllRecords/s_get_exam_labbatches_report",
  /** POST: add question paper colleges list (publish) */
  ADD_QP_COLLEGES_LIST: "addExamQuestionPaperCollegesList",
  /** POST: generate secret code for published QP */
  GENERATE_SECRET_CODE: "generateSecretCodeForPublishedQp",
  /** GET: validate secret code for published QP */
  VALIDATE_SECRET_CODE: "validateSecretCodeForPublishedQp",
  /** Angular `saveExamEvaluatorProfileDetailsUrl` */
  SAVE_EXAM_EVALUATOR_PROFILE_DETAILS: "saveExamEvaluatorProfileDetails",
  /** Angular `ExamScanProfileDetailsUrl` */
  EXAM_SCAN_PROFILE_DETAILS: "saveExamScanProfileDetails",
  /** Angular `ExamScanProfileDetails` */
  EXAM_SCAN_PROFILE_DETAILS_2: "ExamScanProfileDetails",
  /** Angular `ExamEvaluatorPreferencesUrl` */
  EXAM_EVALUATOR_PREFERENCES: "ExamEvaluatorPreferences",
  /** Angular `addExamEvaluatorProfileBankDetailsUrl` */
  ADD_EXAM_EVALUATOR_PROFILE_BANK_DETAILS: "addExamEvaluatorProfileBankDetails",
  /** Angular `getExamEvaluatorProfileDetailsUrl` */
  GET_EXAM_EVALUATOR_PROFILE_DETAILS: "getExamEvaluatorProfileDetails",
  /** Angular `ExamEvaluationAssignmentsCrudUrl` */
  EXAM_EVALUATION_ASSIGNMENTS: "ExamEvaluationAssignments",
  /** Angular `ExamQuestionPaperCollegesUrl` */
  EXAM_QUESTION_PAPER_COLLEGES: "ExamQuestionPaperColleges",
} as const;

// ─── Invigilator Remuneration ─────────────────────────────────────────────────

export const INVIG_REMUNERATION_API = {
  /** CRUD: ExamInvigilationRemuneration entity — list/create/update/delete */
  ENTITY: "ExamInvigilationRemuneration",
  /** Primary key field name */
  PK: "examInvgRemunerationId",
  /** GET: invigilator designation types (GeneralDetail GM code) */
  INVIG_DESG_GM_CODE: "INVLATRDISG",
} as const;

// ─── Revaluation Fee Setup ────────────────────────────────────────────────────

export const REVAL_FEE_API = {
  /** CRUD: ExamFeeStructure entity — list/create/update/delete */
  ENTITY: "ExamFeeStructure",
  /** Primary key field name */
  PK: "examFeeStructureId",
} as const;

// ─── Revaluation ─────────────────────────────────────────────────────────────

export const EXAM_REVAL_API = {
  /** GET: exam student revised details */
  GET_STUDENT_REVISED_DETAILS:
    "getAllRecords/s_get_exam_student_revised_details",
  /**
   * Angular `studentFeeRevaluationUrl` —
   * GET getAllRecords/s_get_student_fee_revaluation (revision history / photocopy details)
   */
  GET_STUDENT_FEE_REVALUATION: "getAllRecords/s_get_student_fee_revaluation",
  /** POST: add exam additional fee receipt */
  ADD_ADDITIONAL_FEE_RECEIPT: "addExamAdditionalFeeReceipt",
  /** PUT: update exam student details for revaluation marks */
  UPDATE_REVAL_MARKS: "updateExamStudentDetailsForRevaluationMarks",
  /** PUT: update revised marks */
  UPDATE_REVISED_MARKS: "updateRevisedMarks",
  /** DELETE: delete evaluated paper marks */
  DELETE_EVALUATED_PAPER_MARKS: "deleteEvaluatedPaperMarks",
  /** POST: add final evaluation papers */
  ADD_FINAL_EVAL_PAPERS: "addfinalevaluationpapers",
  /** GET/POST: sheet data */
  SHEET_DATA: "sheetData",
  /** Angular `revaluationUrl` */
  REVALUATION: "revaluation",
} as const;

// ─── Question Paper ──────────────────────────────────────────────────────────

export const QUESTION_PAPER_API = {
  /** CRUD: ExamQuestionpaperTemplate */
  TEMPLATE: "ExamQuestionpaperTemplate",
  /** CRUD: ExamQuestionPaperTemplateDetails */
  TEMPLATE_DETAILS: "ExamQuestionPaperTemplateDetails",
  /** CRUD: ExamQpTemplate */
  QP_TEMPLATE: "ExamQpTemplate",
  /** CRUD: ExamQp */
  QP: "ExamQp",
  /** CRUD: ExamQpQuestions */
  QP_QUESTIONS: "ExamQpQuestions",
  /** CRUD: ExamQPtempAssign */
  QP_TEMP_ASSIGN: "ExamQPtempAssign",
  /** POST: add QP questions list */
  ADD_QP_QUESTIONS_LIST: "addExamQpQuestionsList",
  /** POST: add question paper colleges list */
  ADD_QP_COLLEGES_LIST: "addExamQuestionPaperCollegesList",
  /** POST: generate secret code */
  GENERATE_SECRET_CODE: "generateSecretCode",
  /** POST: validate secret code */
  VALIDATE_SECRET_CODE: "validateSecretCode",
  /** GET: downloadQPAndAnswerSheet?id={questionPaperId} — returns questionPaperBase64 */
  DOWNLOAD_QP_AND_ANSWER_SHEET: "downloadQPAndAnswerSheet",
} as const;

// ─── Student Management ──────────────────────────────────────────────────────

export const STUDENT_API = {
  /** POST: import student details */
  IMPORT_DETAILS: "importStudentDetails",
  /** POST: import student DOST details */
  IMPORT_STD_DOST_DETAILS: "importStdDostDetails",
  /** GET: get staging student details */
  GET_STG_DETAILS: "getStgStudentDetails",
  /** POST: process staging student details */
  PROCESS_STG_DETAILS: "processStgStudentDetails",
  /** POST: student application form photos upload */
  UPLOAD_PHOTOS: "studentapplicationformphotos",
  /** POST: update student application form photos */
  UPDATE_PHOTOS: "updatestudentapplicationformphotos",
  /** POST: student detail upload */
  DETAIL_UPLOAD: "studentdetailupload",
  /** POST: upload photos */
  UPLOAD_PHOTOS_GENERIC: "uploadPhotos",
  /** POST: validate photos before final upload */
  VALIDATE_PHOTOS: "validatePhotos",
  /** CRUD: StudentProfile */
  PROFILE: "StudentProfile",
  /** CRUD: StudentAcademicbatch */
  ACADEMIC_BATCH: "StudentAcademicbatch",
  /** POST: academic batch update */
  ACADEMIC_BATCH_UPDATE: "academicbatchupdate",
  /** POST: assign section to students */
  ASSIGN_SECTION: "assignsectiontostudents",
  /** GET: student subjects */
  SUBJECTS: "studentsubjects",
  /** GET: upload student marks */
  UPLOAD_MARKS: "uploadStudentMarks",
  /** GET: bulk students upload */
  GET_BULK_STUDENTS: "getAllRecords/s_get_bulk_student_upload",
  /** Angular `studentSubjectUrl` */
  STUDENT_SUBJECT: "StudentSubject",
  /** Angular `studentListUrl` */
  STUDENT: "studentsList",
  /** Angular `addStudentsListUrl` */
  ADD_STUDENTS: "addStudentslist",
  /** Angular `updateRollnoUrl` */
  UPDATE_ROLLNO: "updateRollno",
  /** Angular `addStudentBatchesUrl` */
  ADD_STUDENT_BATCHES: "addStudentBatches",
  /** Angular `studentsubjectsattendancelistUrl` */
  STUDENTSUBJECTSATTENDANCELIST: "studentsubjectsattendancelist",
  /** Angular `studentBatchCrudUrl` */
  STUDENT_BATCH: "Studentbatch",
  /** Angular `studentdetailUrl` */
  STUDENTDETAIL: "studentdetail",
  /** Angular `studentBatchesUrl` */
  STUDENT_BATCHES: "studentbatches",
  /** Angular `sendStudentMailsUrl` */
  SEND_STUDENT_MAILS: "sendStudentMails",
  /** Angular `batchWiseStudentsUrl` */
  BATCH_WISE_STUDENTS: "batchwisestudents",
  /** Angular `batchwiseStudentsElectiveUrl` */
  BATCHWISE_STUDENTS_ELECTIVE: "batchwisestudentselective",
  /** Angular `batchWiseStudentUrl` */
  BATCH_WISE_STUDENT: "BatchwiseStudent",
  /** Angular `batchwiseStudentSecUrl` */
  BATCHWISE_STUDENT_SEC: "batchwiseStudentSec",
  /** Angular `batchwiseElectiveUrl` */
  BATCHWISE_ELECTIVE: "batchwiseElective",
  /** Angular `promoteStudentUrl` */
  PROMOTE_STUDENT: "promotestudent",
  /** Angular `studentListByStructureUrl` */
  STUDENT_LIST_BY_STRUCTURE: "studentsListByStructure",
  /** Angular `detainUrl` */
  DETAIN: "detain",
  /** Angular `detainstudentslistUrl` */
  DETAINSTUDENTSLIST: "detainstudentslist",
  /** Angular `detainrecommendedUrl` */
  DETAINRECOMMENDED: "detainrecommended",
  /** Angular `discontinueUrl` */
  DISCONTINUE: "discontinue",
  /** Angular `passedoutUrl` */
  PASSEDOUT: "passedout",
  /** Angular `studentSubjectsStagingUrl` */
  STUDENT_SUBJECTS_STAGING: "api/tables/uploadStudentSubjects",
  /** Angular `uploadStudentSignaturePathUrl` */
  UPLOAD_STUDENT_SIGNATURE_PATH: "uploadStudentSignaturePath",
  /** Angular `bulkUploadStudentSignaturesUrl` */
  BULK_UPLOAD_STUDENT_SIGNATURES: "bulkUploadStudentSignatures",
  /** Angular `validateStudentSignatureUrl` */
  VALIDATE_STUDENT_SIGNATURE: "validateStudentSignature",
  /** Angular `uploadPhotosAndSignaturesUrl` */
  UPLOAD_PHOTOS_AND_SIGNATURES: "uploadPhotosAndSignatures",
  /** Angular `StdCCActivitiesDetailsUrl` */
  STD_CC_ACTIVITIES_DETAILS: "StdCCActivitiesDetails",
} as const;

// ─── Employee / Staff Management ───────────────────────────   ─────────────────

export const EMPLOYEE_API = {
  /** POST: import employee details */
  IMPORT_DETAILS: "importEmployeeDetails",
  /** POST: process staging employee details */
  PROCESS_STG_DETAILS: "processStgEmployeeDetails",
  /** POST: employee application uploads */
  UPLOAD_FILES: "employeeapplicationuploads",
  /** CRUD: EmployeeDailyDetail */
  DAILY_DETAIL: "EmployeeDailyDetail",
  /** CRUD: EmployeeReporting */
  REPORTING: "EmployeeReporting",
  /** POST: assign employee manager */
  ASSIGN_MANAGER: "assignemployeemanager",
  /** GET: employee details by course group id */
  DETAILS_BY_COURSE_GROUP: "employeedetailsbycoursegroupid",
  /** POST: send employee mails */
  SEND_MAILS: "sendEmployeeMails",
  /** GET: pop profile employees */
  POP_PROFILE_EMPLOYEES: "getAllRecords/s_pop_profile_employees",
  /** GET: new employee list */
  GET_NEW_EMPLOYEE_LIST: "getAllRecords/s_get_new_employee_list",
  /** CRUD: EmployeeDetail — staff list (HR employee list) */
  EMPLOYEE_DETAIL: "EmployeeDetail",
  /** GET: employee typeahead (`cms/employeesearch?q=&empStatus=ACTV`, optional `collegeId`). */
  EMPLOYEE_SEARCH: "cms/employeesearch",
  /** GET: employee details by user id — `employeedetailsbyid?userId=` */
  DETAILS_BY_USER_ID: "employeedetailsbyid",
  /** Angular `employeeapplicationUrl` */
  EMPLOYEEAPPLICATION: "employeedetails",
  /** Angular `employeeapplicationListUrl` */
  EMPLOYEEAPPLICATION_2: "employeeList",
  /** Angular `staffCourseYrSubjectUrl` */
  STAFF_COURSE_YR_SUBJECT: "StaffCourseyrSubject",
  /** Angular `staffcourseyrsubjectsUrl` */
  STAFFCOURSEYRSUBJECTS: "staffcourseyrsubjects",
  /** Angular `staffsyllabusplandetailsUrl` */
  STAFFSYLLABUSPLANDETAILS: "staffsyllabusplandetails",
  /** Angular `staffsyllabusplanUrl` */
  STAFFSYLLABUSPLAN: "staffsyllabusplan",
  /** Angular `deleteStaffsUrl` */
  DELETE_STAFFS: "deletestaffs",
  /** Angular `empAttendanceEmployeeCrudUrl` */
  EMP_ATTENDANCE_EMPLOYEE: "EmpAttendanceEmployee",
  /** Angular `shiftUrl` */
  SHIFT: "Shift",
  /** Angular `employeeShiftUrl` */
  EMPLOYEE_SHIFT: "EmployeeShift",
  /** Angular `staffGroupSectionUrl` */
  STAFF_GROUP_SECTION: "staffGroupSection",
  /** Angular `staffProxyCrudUrl` */
  STAFF_PROXY: "StaffProxy",
  /** Angular `staffProxiesUrl` */
  STAFF_PROXIES: "staffproxies",
  /** Angular `staffProxiesbyEmpDeptUrl` */
  STAFF_PROXIESBY_EMP_DEPT: "staffproxiesbyempdept",
  /** Angular `staffProxiesListUrl` */
  STAFF_PROXIES_2: "staffproxieslist",
  /** Angular `empProxyDetailsUrl` */
  EMP_PROXY_DETAILS: "empproxydetails",
  /** Angular `proxySubjectUrl` */
  PROXY_SUBJECT: "proxysubject",
  /** Angular `staffSubjectsUrl` */
  STAFF_SUBJECTS: "staffSubjects",
  /** Angular `staffSectionsUrl` */
  STAFF_SECTIONS: "staffSections",
  /** Angular `employeePayslipGenerationUrl` */
  EMPLOYEE_PAYSLIP_GENERATION: "employeepayslipgenerations",
  /** Angular `employeePayslipGenerationCrudUrl` */
  EMPLOYEE_PAYSLIP_GENERATION_2: "EmployeePayslipGeneration",
  /** Angular `employeeWisePayslipGenerationsUrl` */
  EMPLOYEE_WISE_PAYSLIP_GENERATIONS: "employeewisepayslipgenerations",
  /** Angular `employeePayslipDetailCrudUrl` */
  EMPLOYEE_PAYSLIP_DETAIL: "EmployeePayslipDetail",
} as const;

// ─── Fee / Payment Management ────────────────────────────────────────────────

export const FEE_API = {
  /** GET: student fee ledger (`s_fee_std_ledger` proc) */
  FEE_STD_LEDGER: "getAllRecords/s_fee_std_ledger",
  /** GET: student payment due details */
  GET_STUDENT_DUE_DETAILS: "getStudentPaymentDueDetails",
  /** POST: student fee payment */
  STUDENT_FEE_PAYMENT: "studentFeePayment",
  /** GET: due payment order details */
  GET_DUE_PAYMENT_ORDER: "PayPhi/getDuePaymentOrderDetails",
  /** POST: send payment mail notification */
  SEND_PAYMENT_MAIL: "sendPaymentMailNotification",
  /** GET: fee management student detail */
  FEE_MANAGEMENT_STD_DETAIL: "feeManagmentStudentdDetail",
  /** GET: fee management std details */
  GET_FEE_MANAGEMENT_STD_DETAILS: "getFeeManagementStdDetails",
  /** GET: fee management student detail search */
  FEE_MANAGEMENT_SEARCH: "feeManagementStdDetailSearch",
  /** CRUD: GeneralPaymentSetting */
  GENERAL_PAYMENT_SETTING: "GeneralPaymentSetting",
  /** CRUD: FeeCertificateIssue */
  CERTIFICATE_ISSUE: "FeeCertificateIssue",
  /** CRUD: FeeCertificateWorkflow */
  CERTIFICATE_WORKFLOW: "FeeCertificateWorkflow",
  /** POST: fee certificate issue workflow */
  CERTIFICATE_ISSUE_WORKFLOW: "feeCertificateIssueWorkflow",
  /** POST: fee certificate issue */
  CERTIFICATE_ISSUE_POST: "feecertificateissue",
  /** POST: fee certificate workflow update */
  CERTIFICATE_WORKFLOW_UPDATE: "feecertificateworkflowupdate",
  /** POST: fee certificate workflow update final issuer */
  CERTIFICATE_WORKFLOW_UPDATE_FINAL: "feecertificateworkflowupdateFinalIssuer",
  /** POST: fee certificate issue request */
  CERTIFICATE_ISSUE_REQUEST: "feeCertificateIssueRequest",
  /** POST: fee certificate issue amount */
  CERTIFICATE_ISSUE_AMOUNT: "feeCertificateIssueAmount",
  /** GET: student certificate details */
  GET_STUDENT_CERT_DETAILS: "getAllRecords/s_get_student_certificate_details",
  /** GET: paginated college fee structures (batch or academic year mode) */
  FEE_STRUCTURES_LIST: "feestructures",
  /** GET: paginated student fee due list (batch/academic filters). */
  STUDENT_FEE_LIST: "studentfeelist",
  /** GET: student search for fee payment (`q` query param). */
  STUDENT_FEE_SEARCH: "studentsearch",
  /** GET: fee student data for payment screen (`feestudentdata`). */
  FEE_STUDENT_DATA: "feestudentdata",
  /** GET: financial year for receipt date (`financialYearDate`). */
  FINANCIAL_YEAR_DATE: "financialYearDate",
  /** PUT: recalculate fee transactions after particulars change. */
  GENERATE_TRANSACTIONS: "generateTransactions",
  /** POST: save fee receipt / payment. */
  FEE_RECEIPTS: "feereceipts",
  /** GET: student fee receipt PDF download (`?studentId=`). */
  STUDENT_FEE_RECEIPT_DOWNLOAD: "studentFeeReceiptDownload",
  /** GET: fee receipt PDF by receipt id (`?receiptId=`). */
  FEE_RECEIPT_DOWNLOAD: "feeReceiptDownload",
  /** GET: particular-wise payment receipts (bus/hostel pay screen). */
  FEE_PARTICULAR_WISE_PAYMENTS: "feeparticularwisepayments",
  /** POST: create student-wise fee particulars before first category payment. */
  FEE_STUDENT_WISE_PARTICULARS: "feestudentwiseparticularlists",
  /** GET: paginated fee concession list. */
  FEE_CONCESSION_LIST: "feeconsessionlist",
  /** POST: add institutional scholarship / student-wise fee discount. */
  FEE_STUDENT_WISE_DISCOUNT: "feestudentwisediscounts",
  /** POST: add student-wise fee particulars list. */
  FEE_STUDENT_WISE_PARTICULAR_LIST: "feestudentwiseparticularlists",
  /** POST: add student-wise fines. */
  FEE_STUDENT_WISE_FINES: "feestudentwisefines",
  /** POST: add student-wise RTF / scholarship hold. */
  FEE_STUDENT_WISE_SCHOLARSHIP: "addFeeStudentwiseScholorship",
  /** DELETE: student-wise RTF / scholarship by id. */
  FEE_STUDENT_WISE_SCHOLARSHIP_DELETE: "deleteFeeStudentwiseScholorship",
  /** PUT/POST: update min fee percent on fee student data. */
  UPDATE_MIN_FEE_PERCENT: "updateMinFeePerfeestudentdata",
  /** POST: map fee structure to students. */
  MAP_FEE_STRUCTURE: "mapfeestructure",
  /** GET: pop-up student fee structures proc. */
  POP_STUDENT_FEE_STRUCTURE: "getAllRecords/s_pop_student_fee_Structure",
  /** GET: fee structures by course year for student mapping. */
  FEE_STRUCTURE_COURSEYR: "FeeStructureCourseyr",
  /** GET: fee management student detail. */
  FEE_MANAGEMENT_STUDENT_DETAIL: "feeManagmentStudentdDetail",
  /** POST: save student fee management row(s). */
  FEE_MANAGEMENT_SAVE: "feeManagmentStdDetail",
  /** GET: fee due list for pay-link / notifications. */
  FEE_DUE_LIST: "getAllRecords/s_fee_due_list",
  /** GET: employee typeahead (`cms/employeesearch?q=&empStatus=ACTV` — Angular base URL includes `/cms`). */
  EMPLOYEE_SEARCH: "cms/employeesearch",
  /** GET: transport allocation by employee. */
  TRANSPORT_ALLOCATION: "TransportAllocation",
  /** GET: sync initiated online fee payments. */
  UPDATE_INITIATED_PAYMENTS: "PayPhi/updateInitiatedPayments",
  /** GET: sync initiated admission online payments. */
  UPDATE_INITIATED_PAYMENTS_ADMISSION:
    "PayPhi/updateInitiatedPaymentsForAdmission",
  /** GET: fee due notifications */
  GET_FEE_DUE_NOTIFICATIONS: "getAllRecords/s_get_fee_duenotifications",
  /** GET: fee summary */
  FEE_SUMMARY: "getAllRecords/s_fee_summary",
  /** GET: fee discount summary */
  FEE_DISCOUNT_SUMMARY: "getAllRecords/s_fee_discount_summary",
  /** GET: complete student fee report */
  COMPLETE_STD_FEE_REPORT: "getAllRecords/s_get_complete_std_fee_report",
  /** GET: fee student details report */
  REP_FEE_STUDENT_DETAILS: "getAllRecords/s_rep_fee_studentdetails",
  /** GET: online payments comparative report */
  ONLINE_PAYMENTS_COMPARATIVE:
    "getAllRecords/s_get_online_payments_comparative_report",
  /** GET: fee transport collection */
  FEE_TRANSPORT_COLLECTION: "getAllRecords/s_rep_fee_transport_collection",
  /** GET: fee transport collection download */
  FEE_TRANSPORT_COLLECTION_DOWNLOAD:
    "getAllRecordsDownload/s_rep_fee_transport_collection",
  /** GET: certificate summary report */
  GET_CERTIFICATE_SUMMARY: "getAllRecords/s_get_certificate_summary_report",
  /** GET: fee certificate issue proc */
  GET_FEE_CERTIFICATE_ISSUE: "getAllRecords/s_get_fee_certificate_issue",
  /** GET: emp certificate approval */
  EMP_CERTIFICATE_APPROVAL: "getAllRecords/s_get_fee_emp_certificate_approval",
  /** GET: emp certificate approval download */
  EMP_CERTIFICATE_APPROVAL_DOWNLOAD:
    "getAllRecordsDownload/s_get_fee_emp_certificate_approval",
  /** POST: staging online fee receipts */
  STG_ONLINE_FEE_RECEIPTS: "stgOnlineFeereceipts",
  /** POST: staging online exam fee receipts */
  STG_ONLINE_EXAM_FEE_RECEIPTS: "stgOnlineExamFeeReceipts",
  /** Angular `getUnivFeeReceiptDetailsUrl` */
  GET_UNIV_FEE_RECEIPT_DETAILS: "getUnivFeeReceiptDetails",
  /** Angular `feeCategoryUrl` */
  FEE_CATEGORY: "FeeCategory",
  /** Angular `feeParticularUrl` */
  FEE_PARTICULAR: "FeeParticular",
  /** Angular `FeeStructureCrudUrl` */
  FEE_STRUCTURE_2: "FeeStructure",
  /** Angular `feeStructureParticularCrudUrl` */
  FEE_STRUCTURE_PARTICULAR: "FeeStructureParticular",
  /** Angular `studentfeelistDownloadUrl` */
  STUDENTFEELIST: "studentfeelistDownload",
  /** Angular `studentfeeDueDownloadUrl` */
  STUDENTFEE_DUE: "studentfeeDueDownload",
  /** Angular `feeDueDownloadUrl` */
  FEE_DUE: "feeDueListDownload",
  /** Angular `busFeeCollectionsUrl` */
  BUS_FEE_COLLECTIONS: "busfeecollections",
  /** Angular `empBusFeeCollectionsUrl` */
  EMP_BUS_FEE_COLLECTIONS: "empbusfeecollections",
  /** Angular `empBusFeeCollectionsDownloadUrl` */
  EMP_BUS_FEE_COLLECTIONS_2: "empbusfeecollectionsdownload",
  /** Angular `busFeeCollectionsDownloadUrl` */
  BUS_FEE_COLLECTIONS_2: "busfeecollectionsDownload",
  /** Angular `libraryFeeCollectionsUrl` */
  LIBRARY_FEE_COLLECTIONS: "libraryfeecollections",
  /** Angular `libraryFeeCollectionsDownloadUrl` */
  LIBRARY_FEE_COLLECTIONS_2: "libraryfeecollectionsDownload",
  /** Angular `managementStdFeeCollectionsUrl` */
  MANAGEMENT_STD_FEE_COLLECTIONS: "managementstdfeecollections",
  /** Angular `managementStdFeeCollectionsDownloadUrl` */
  MANAGEMENT_STD_FEE_COLLECTIONS_2: "managementstdfeecollectionsDownload",
  /** Angular `feeConsessionListDownloadUrl` */
  FEE_CONSESSION_LIST: "feeconsessionlistDownload",
  /** Angular `feeLedgerUrl` */
  FEE_LEDGER: "feeLedger",
  /** Angular `feeLedgerDownloadUrl` */
  FEE_LEDGER_2: "feeLedgerDownload",
  /** Angular `dayWiseReceiptsNewReportUrl` */
  DAY_WISE_RECEIPTS_NEW_REPORT: "daywisereceiptsNewReport",
  /** Angular `feeStudentWiseParticularsCrudUrl` */
  FEE_STUDENT_WISE_PARTICULARS_2: "feestudentwiseparticulars",
  /** Angular `feeStudentDataParticularCrudUrl` */
  FEE_STUDENT_DATA_PARTICULAR: "FeeStudentDataParticular",
  /** Angular `feeParticularwisePaymentCrudUrl` */
  FEE_PARTICULARWISE_PAYMENT: "FeeParticularwisePayment",
  /** Angular `feeStudentWiseParticularUrl` */
  FEE_STUDENT_WISE_PARTICULAR: "FeeStudentWiseParticular",
  /** Angular `feeStudentwiseDiscountCrudUrl` */
  FEE_STUDENTWISE_DISCOUNT: "FeeStudentwiseDiscount",
  /** Angular `updateMinFeePerfeestudentdataUrl` */
  UPDATE_MIN_FEE_PERFEESTUDENTDATA: "updateMinFeePerfeestudentdata",
  /** Angular `feeParticularwisePaymentsforStudentRefundUrl` */
  FEE_PARTICULARWISE_PAYMENTSFOR_STUDENT_REFUND:
    "feeparticularwisepaymentsforstudentrefund",
  /** Angular `daywisereceiptsPdfDownloadUrl` */
  DAYWISERECEIPTS_PDF: "daywisereceiptsPdfDownload",
  /** Angular `uploadFeeStgMerchantPaymentFileDetailsUrl` */
  UPLOAD_FEE_STG_MERCHANT_PAYMENT_FILE_DETAILS:
    "uploadFeeStgMerchantPaymentFileDetails",
  /** Angular `feeReceiptsListUrl` */
  FEE_RECEIPTS_2: "feereceiptsList",
  /** Angular `libFineCollectionUrl` */
  LIB_FINE_COLLECTION: "LibFineCollection",
  /** Angular `transportFeePaymentCrudUrl` */
  TRANSPORT_FEE_PAYMENT: "TransportFeePayment",
  /** Angular `distanceFeerUrl` */
  DISTANCE_FEER: "DistanceFee",
  /** Angular `hostelDiscountsUrl` */
  HOSTEL_DISCOUNTS: "HostelDiscount",
  /** Angular `invStockledgerCrudUrl` */
  INV_STOCKLEDGER: "InvStockledger",
  /** Angular `uploadUnivStgStdFeeUrl` */
  UPLOAD_UNIV_STG_STD_FEE: "api/tables/uploadUnivStgStdFee",
} as const;

// ─── Scholarship Management ────────────────────────────────────────────────────

export const SCHOLARSHIP_API = {
  /** Domain list: student scholarship applications by college + academic year. */
  SCH_STD_APPLICATION: "SchStdApplication",
  /** POST: create scholarship application. */
  SCHOLARSHIP_APP: "scholarshipapp",
  /** Domain CRUD: scholarship types. */
  SCHOLARSHIP_TYPE: "ScholarshipType",
  /** Domain CRUD: scholarship values (legacy modal). */
  SCHOLARSHIP_VALUE: "ScholarshipValue",
  /** Domain list: fee scholarship structures. */
  FEE_SCH_STRUCTURE: "FeeSchStructure",
  /** Domain: proceeding header. */
  SCH_PRECEEDING: "SchPreceeding",
  /** GET paginated: proceedings list. */
  SCH_PRECEEDINGS: "schpreceedings",
  /** Domain: student proceeding lines. */
  SCH_STD_PRECEEDING: "schstdpreceeding",
  /** Domain update: student proceeding payment settlement. */
  SCH_STD_PRECEEDING_CRUD: "SchStdPreceeding",
  /** Domain list: account proceedings. */
  SCH_ACCOUNTS_PRECEEDING: "SchAccountsPreceeding",
  /** GET/POST: account proceedings CRUD. */
  SCH_ACCOUNTS_PRECEEDINGS: "schaccountspreceedings",
  /** GET: proceedings linked to account batch. */
  SCH_PRECEEDINGS_BY_ACC: "schPreceedingsByAccPrecedingId",
  /** POST: upload student proceedings Excel. */
  UPLOAD_STD_PRECEEDINGS: "uploadstdpreceedings",
  /** Domain: staging student proceedings. */
  SCH_STG_STD_PRECEEDING: "SchStgStdPreceeding",
  SCH_STG_STD_PRECEEDINGS: "schstgstdpreceedings",
  /** GET: unlinked proceedings for account batch. */
  GET_NULL_PRECEEDINGS: "getnullpreceedings",
  /** GET: scholarship types + values for assign screen. */
  GET_SCHOLARSHIP_TYPE_AND_VALUES: "getScholarshipTypeAndValues",
  /** GET: students with scholarship assignment state. */
  GET_STUDENTS_SCHOLARSHIP_DETAILS: "getStudentsScholarshipDetails",
  /** POST: assign/unassign student scholarship. */
  UPDATE_STD_STUDENT_SCHOLARSHIP: "updateStdStudentScholarship",
  /** GET: college-wise filter proc (same as fee masters). */
  COLLEGE_WISE_DETAILS: "collegeWiseDetails",
  /** Angular `addFeeSchStructuresUrl` */
  ADD_FEE_SCH_STRUCTURES: "addFeeSchStructures",
  /** Angular `updateFeeSchStructuresUrl` */
  UPDATE_FEE_SCH_STRUCTURES: "updateFeeSchStructures",
  /** Angular `academicyearwiseScholarshipDueListUrl` */
  ACADEMICYEARWISE_SCHOLARSHIP_DUE: "academicyearwisescholarshipduelist",
  /** Angular `academicyearwiseScholarshipDueListDownloadUrl` */
  ACADEMICYEARWISE_SCHOLARSHIP_DUE_LIST:
    "academicyearwisescholarshipduelistDownload",
  /** Angular `scholarshipStdPrecedingsUrl` */
  SCHOLARSHIP_STD_PRECEDINGS: "scholarshipStdPrecedings",
  /** Angular `scholarshipStdPrecedingsDownloadUrl` */
  SCHOLARSHIP_STD_PRECEDINGS_2: "scholarshipStdPrecedingsDownload",
  /** Angular `scholarshipduelistDownloadUrl` */
  SCHOLARSHIPDUELIST: "scholarshipduelistDownload",
  /** Angular `addFeeStudentwiseScholorshiUrl` */
  ADD_FEE_STUDENTWISE_SCHOLORSHI: "addFeeStudentwiseScholorship",
  /** Angular `deleteFeeStudentwiseScholorshipUrl` */
  DELETE_FEE_STUDENTWISE_SCHOLORSHIP: "deleteFeeStudentwiseScholorship",
  /** Angular `name` */
  NAME_4: "Scholarship",
} as const;

// ─── Library ─────────────────────────────────────────────────────────────────

export const LIBRARY_API = {
  LIBRARY_DETAIL: "LibraryDetail",
  LIBRARY_DETAIL_BY_ID: "libraryId",
  BOOK_PURCHASE: "BookPurchaseDetail",
  BOOK_PURCHASE_BY_ID: "bookPurchaseDetailId",
  UPDATE_BOOK_DETAILS: "updateBookDetails",
  MEMBERSHIP: "MemberShip",
  MEMBERSHIP_BY_ID: "MemberShipId",
  MEMBER_SEARCH: "libraryMemberSearch",
  STUDENT_SEARCH: "studentsearch",
  EMPLOYEE_SEARCH: "employeesearch",
  NO_MEMBERSHIP: "nolibmembership",
  EMPLOYEES_LIB_MEMBERSHIP: "employeesLibmemberShip",
  SUPPLIER: "LibSupplierDetail",
  SUPPLIER_BY_ID: "supplierId",
  BOOK_CATEGORY: "Bookcategory",
  LIBRARY_CATEGORY: "LibraryCategory",
  BOOK_CATEGORY_BY_ID: "bookcatId",
  AUTHOR: "Author",
  AUTHOR_BY_ID: "AuthorId",
  PUBLISHER: "Publisher",
  PUBLISHER_BY_ID: "PublisherId",
  BOOK_BY_ID: "BookId",
  ADD_BOOK: "addbook",
  ADD_NEW_BOOKS: "addnewbooks",
  BOOK_DETAIL: "BookDetail",
  BOOK_DETAILS_BY_ID: "bookDetailsId",
  PERIODICAL: "Periodical",
  PERIODICAL_BY_ID: "periodicalId",
  PERIODICALS: "periodicals",
  PERIODICALS_DETAIL: "PeriodicalsDetail",
  PERIODICAL_DET_BY_ID: "periodicalDetId",
  RACK: "LibShelve",
  RACK_BY_ID: "shelveId",
  LIB_MEMBER: "LibMember",
  LIB_MEMBER_BY_ID: "libMemberId",
  BOOK_ISSUE_DETAILS: "bookIssuedetails",
  BOOK_ISSUE_DETAIL: "BookIssuedetail",
  BOOK_ISSUE_BY_ID: "bookIssuedetailsId",
  BOOK_RETURN_SEARCH: "bookReturnSearch",
  BOOK_DUE_LIST: "bookduelist",
  BOOK_SEARCH: "booksearch",
  BOOK_DETAIL_SEARCH: "bookdetailsearch",
  RESERVE_BOOK: "ReserveBook",
  LIBRARY_SETTING: "LibrarySetting",
  LIB_SETTINGS_BY_ID: "libSettingsId",
  LIBRARY_SETTINGS_ALT: "libraryssettings",
  GET_BOOKS_BARCODE_NOT_GENERATED_RECORDS: "getBooksBarcodeNotGeneratedRecords",
  GENERATE_BOOK_BARCODE: "generateBarcodeForBooks",
  GENERATE_MEMBER_BARCODE: "generateLibMemebrBarcode",
  /** Angular `libFineCollectionUrl` */
  LIB_FINE_COLLECTION: "LibFineCollection",
  FINE_COLLECTION: "getAllRecords/s_rep_lib_fee_collection",
  /** Angular `print()` / `download()` — `getAllRecordsPDFDownload/s_rep_lib_fee_collection` */
  FINE_COLLECTION_PDF: "getAllRecordsPDFDownload/s_rep_lib_fee_collection",
  BOOK: "Book",
  /** Angular `subjectBookCrudUrl` */
  SUBJECT_BOOK: "SubjectBook",
  /** Angular `subjectBookUrl` */
  SUBJECT_BOOK_2: "subjectbooks",
  /** Angular `checkaccessionnumberUrl` */
  CHECKACCESSIONNUMBER: "checkaccessionnumber",
  /** Angular `importBookDetailsUrl` */
  IMPORT_BOOK_DETAILS: "importBookDetails",
  /** Angular `processStgBookDetailsUrl` */
  PROCESS_STG_BOOK_DETAILS: "processStgBookDetails",
  /** Angular `importBookIssueDetailUrl` */
  IMPORT_BOOK_ISSUE_DETAIL: "importBookIssueDetail",
  /** Angular `processStgBookIssueDetailUrl` */
  PROCESS_STG_BOOK_ISSUE_DETAIL: "processStgBookIssueDetail",
  /** Angular `LibStudentVisitUrl` */
  LIB_STUDENT_VISIT: "LibStudentVisit",
  /** Angular `totalBookReportUrl` */
  TOTAL_BOOK_REPORT: "totalbookreport",
  /** Angular `bookWiseReportUrl` */
  BOOK_WISE_REPORT: "bookwisecountreport",
  /** Angular `libStudentVisitsUrl` */
  LIB_STUDENT_VISITS: "libStudentVisits",
  /** Angular `finChequeBooksUrl` */
  FIN_CHEQUE_BOOKS: "FinChequeBooks",
} as const;

// ─── Payment Gateways ────────────────────────────────────────────────────────

export const PAYMENT_GATEWAY_API = {
  /** RazorPay: create order */
  RAZORPAY_CREATE_ORDER: "RazorPay/payment",
  /** RazorPay: charge */
  RAZORPAY_CHARGE: "RazorPay/charge",
  /** Demo / Angular `initaitePaymentUrl` — exam fee student portal (PayPhi) */
  INITIATE_PAYMENT: "paymentGateway/initiatePayment",
  /** BillDesk path — 404 on demo.skolo.in; used on some other tenants */
  BILLDESK_INITIATE: "BillDesk/initiatePayment",
  /** Generic: encrypt form data */
  ENCRYPT_FORM_DATA: "paymentGateway/encryptFormData",
  /** Generic: decrypt response */
  DECRYPT_RESPONSE: "paymentGateway/decryptResponse",
  /** Generic: get order details */
  GET_ORDER_DETAILS: "paymentGateway/getOrderDetails",
  /** PayPhi: initiate payment */
  PAYPHI_INITIATE: "PayPhi/initiatePayment",
  /** PayPhi: get payment order details */
  PAYPHI_ORDER_DETAILS: "PayPhi/getPaymentOrderDetails",
  /** PayPhi: univ initiate payment */
  PAYPHI_UNIV_INITIATE: "PayPhi/univInitiatePayment",
  /** PayPhi: get univ std payment order details */
  PAYPHI_UNIV_STD_ORDER: "PayPhi/getUnivStdPaymentOrderDetails",
  /** PayPhi: update initiated payments */
  PAYPHI_UPDATE_INITIATED: "PayPhi/updateInitiatedPayments",
  /** SabPaisa: initiate payment */
  SABPAISA_INITIATE: "SabPaisa/initiatePayment",
  /** SabPaisa: consume payment response */
  SABPAISA_CONSUME_RESPONSE: "SabPaisa/consumePaymentResponse",
  /** Paytm: PG request */
  PG_PAYTM_REQUEST: "pgpaytmrequest",
  /** Paytm: PG redirect */
  PG_REDIRECT: "pgredirect",
  /** Angular `initiatePaymentUrl` */
  INITIATE_PAYMENT_2: "BillDesk/initiatePayment",
  /** Angular `admissionInitiatePaymentUrl` */
  ADMISSION_INITIATE_PAYMENT: "PayPhi/admissionInitiatePayment",
  /** Angular `getAdmissionStdPaymentOrderDetails` */
  GET_ADMISSION_STD_PAYMENT_ORDER_DETAILS:
    "PayPhi/getAdmissionStdPaymentOrderDetails",
} as const;

// ─── University Wallet ───────────────────────────────────────────────────────

export const UNIV_WALLET_API = {
  /** CRUD: UnivPaymentWallet */
  WALLET: "UnivPaymentWallet",
  /** CRUD: UnivPaymentWalletTransactions */
  TRANSACTIONS: "UnivPaymentWalletTransactions",
} as const;

// ─── Organization / Institution Setup ────────────────────────────────────────

export const SETUP_API = {
  /** CRUD: Organization */
  ORGANIZATION: "Organization",
  /** POST: organization logo upload */
  ORG_LOGO_UPLOAD: "organizationlogoupload",
  /** CRUD: Universities */
  UNIVERSITIES: "Universities",
  /** POST: university logo upload */
  UNIVERSITY_LOGO_UPLOAD: "universitylogoupload",
  /** GET: university wise details */
  UNIVERSITY_WISE_DETAILS: "getAllRecords/s_get_univwisedetails_bycode",
  /** CRUD: College */
  COLLEGE: "College",
  /** POST: college logo upload */
  COLLEGE_LOGO_UPLOAD: "collegelogoupload",
  /** CRUD: Campus */
  CAMPUS: "Campus",
  /** CRUD: Department */
  DEPARTMENT: "Department",
  /** CRUD: Designation */
  DESIGNATION: "Designation",
  /** CRUD: Course */
  COURSE: "Course",
  /** CRUD: CourseType */
  COURSE_TYPE: "CourseType",
  /** CRUD: CourseGroup */
  COURSE_GROUP: "CourseGroup",
  /** CRUD: CourseYear */
  COURSE_YEAR: "CourseYear",
  /** CRUD: GroupSection */
  GROUP_SECTION: "GroupSection",
  /** CRUD: AcademicYear */
  ACADEMIC_YEAR: "AcademicYear",
  /** CRUD: FinancialYear */
  FINANCIAL_YEAR: "FinancialYear",
  /** CRUD: Regulation */
  REGULATION: "Regulation",
  /** CRUD: Building */
  BUILDING: "Building",
  /** CRUD: Block */
  BLOCK: "Block",
  /** CRUD: Floor */
  FLOOR: "Floor",
  /** CRUD: RoomType */
  ROOM_TYPE: "RoomType",
  /** CRUD: Room */
  ROOM: "Room",
  /** CRUD: Caste */
  CASTE: "Caste",
  /** CRUD: SubCaste */
  SUB_CASTE: "SubCaste",
  /** CRUD: Country */
  COUNTRY: "Country",
  /** CRUD: State */
  STATE: "State",
  /** CRUD: District */
  DISTRICT: "District",
  /** CRUD: City */
  CITY: "City",
  /** CRUD: Qualification */
  QUALIFICATION: "Qualification",
  /** CRUD: QualificationGroup */
  QUALIFICATION_GROUP: "QualificationGroup",
  /** CRUD: Batch */
  BATCH: "Batch",
  /** CRUD: GeneralSetting */
  GENERAL_SETTING: "GeneralSetting",
  /** CRUD: GeneralDetail */
  GENERAL_DETAIL: "GeneralDetail",
  /** GET: general masters */
  GENERAL_MASTERS: "generalmasters",
  /** CRUD: StudentCategory */
  STUDENT_CATEGORY: "StudentCategory",
  /** CRUD: Page */
  PAGE: "Page",
  /** GET: course groups */
  COURSE_GROUPS: "coursegroups",
  /** GET: course years */
  COURSE_YEARS: "courseyears",
  /** GET: group section */
  GROUP_SECTION_GET: "groupsection",
  /** GET: building details search */
  BUILDING_DETAILS_SEARCH: "buildingdetails",
  /** GET: course year regulations */
  COURSE_YEAR_REGULATIONS: "getAllRecords/s_course_year_regulations",
  /** GET: financial year date */
  FINANCIAL_YEAR_DATE: "financialYearDate",
  /** CRUD: EmpDeptHeads */
  DEPT_HEADS: "EmpDeptHeads",
  /** GET: department wise counselor */
  DEPT_WISE_COUNSELOR: "departmentwisecounselor",
  /** CRUD: CollegeCertificate */
  COLLEGE_CERTIFICATE: "CollegeCertificate",
  /** Angular `banksCrudUrl` */
  BANKS: "Bank",
  /** Angular `documentRepositoryCrudUrl` */
  DOCUMENT_REPOSITORY: "DocumentRepository",
  /** Angular `configautonumbersCrudUrl` */
  CONFIGAUTONUMBERS: "configautonumbers",
  /** Angular `configautonumberslistCrudUrl` */
  CONFIGAUTONUMBERSLIST: "configautonumberslist",
  /** Angular `ConfigAutonumberUrl` */
  CONFIG_AUTONUMBER: "ConfigAutonumber",
  /** Angular `userLoginOtpVerificationUrl` */
  USER_LOGIN_OTP_VERIFICATION: "userLoginOtpVerification",
  /** Angular `addStudentCourseGroupsUrl` */
  ADD_STUDENT_COURSE_GROUPS: "addStudentCourseGroups",
  /** Angular `studentSearchInMultipleCollegesUrl` */
  STUDENT_SEARCH_IN_MULTIPLE_COLLEGES: "studentSearchInMultipleColleges",
  /** Angular `moduleCrudUrl` */
  MODULE: "Module",
  /** Angular `subModuleCrudUrl` */
  SUB_MODULE: "Submodule",
  /** Angular `userCrudUrl` */
  USER: "User",
  /** Angular `QuotaUrl` */
  QUOTA: "Quota",
  /** Angular `coursecompletionUrl` */
  COURSECOMPLETION: "coursecompletion",
  /** Angular `collegeSuggestionUrl` */
  COLLEGE_SUGGESTION: "CollegeSuggestion",
  /** Angular `courseCategoryUrl` */
  COURSE_CATEGORY: "CourseCategory",
  /** Angular `courseOutcomeUrl` */
  COURSE_OUTCOME: "CmCourseOutcome",
  /** Angular `courseOutcomeMasterUrl` */
  COURSE_OUTCOME_MASTER: "cmCourseOutcomes",
  /** Angular `departmentCode` */
  DEPARTMENT_CODE: "Civil",
  /** Angular `departmentCode` */
  DEPARTMENT_CODE_2: "H&S",
  /** Angular `JobsUrl` */
  JOBS: "Jobs",
  /** Angular `TableListUrl` */
  TABLE: "TableList",
} as const;

// ─── Room Details / Devices ────────────────────────────────────────────────

export const ROOM_DETAILS_API = {
  /** GET proc: room + device details list by campus/building/block/floor/room filters */
  GET_ROOM_DEVICE_DETAILS: "get_room_device_details",
  /** POST: add room-device mappings list */
  ADD_ROOM_DETAILS_LIST: "addRoomDetailsList",
  /** PUT: update room-device mapping */
  UPDATE_ROOM_DETAILS: "updateRoomDetails",
  /** CRUD/list: EttlDevices */
  ETTL_DEVICES: "EttlDevices",
  /** Angular `roomUrl` */
  ROOM_2: "RoomDetails",
} as const;

// ─── Data Security ───────────────────────────────────────────────────────────

export const DATA_SECURITY_API = {
  /** POST: add employee data security list */
  ADD_LIST: "addEmployeeDataSecurityList",
  /** PUT: update employee data security */
  UPDATE: "updateEmployeeDataSecurity",
  /** CRUD: EmployeeDataSecurity */
  CRUD: "EmployeeDataSecurity",
} as const;

// ─── Leave Management ────────────────────────────────────────────────────────

export const LEAVE_API = {
  /** CRUD: LeaveType */
  LEAVE_TYPE: "LeaveType",
  /** CRUD: LeaveEntitlement */
  LEAVE_ENTITLEMENT: "LeaveEntitlement",
  /** POST: leave entitlement by dept */
  LEAVE_ENTITLEMENT_BY_DEPT: "leaveentitlementbydept",
  /** POST: leave entitlement */
  LEAVE_ENTITLEMENT_POST: "leaveentitlement",
  /** CRUD: EmployeeRunningLeave */
  RUNNING_LEAVE: "EmployeeRunningLeave",
  /** POST: employee leave application */
  LEAVE_APPLICATION_POST: "employeeleaveapplication",
  /** CRUD: LeaveApplication */
  LEAVE_APPLICATION: "LeaveApplication",
  /** POST: cancel leave application */
  CANCEL_LEAVE_APPLICATION: "cancelemployeeleaveapplication",
  /** GET: leave years */
  LEAVE_YEARS: "getYears",
  /** GET: employee leave count */
  GET_EMP_LEAVE_COUNT: "getEmpLeaveCount",
  /** GET: employee leave summary */
  LEAVE_SUMMARY: "employeeLeaveSummary",
  /** GET: leave summary reports */
  LEAVE_SUMMARY_REPORTS: "getAllRecords/s_emp_leave_report",
  /** GET: leave summary reports download */
  LEAVE_SUMMARY_DOWNLOAD: "getAllRecordsDownload/s_emp_leave_report",
  /** GET: emp attendance validation */
  EMP_ATTENDANCE_VALIDATION: "getAllRecords/s_rep_emp_attendance_validation",
} as const;

// ─── HR & Payroll ────────────────────────────────────────────────────────────

export const HR_PAYROLL_API = {
  /** CRUD: EmpDeptHeads */
  DEPT_HEADS: "EmpDeptHeads",
  /** CRUD: PayrollCategory */
  PAYROLL_CATEGORY: "PayrollCategory",
  /** POST: create / update payroll category (Angular `payRollCategoryUrl`) */
  PAYROLL_CATEGORY_SAVE: "payrollcategory",
  /** GET: payroll groups master list */
  PAYROLL_GROUPS: "payrollgroups",
  /** POST: create / update payroll group (Angular `payrollGroupUrl`) */
  PAYROLL_GROUP_SAVE: "payrollgroups",
  /** CRUD: PayslipSetting */
  PAYSLIP_SETTING: "PayslipSetting",
  /** CRUD: PayrollCategoryGroup */
  PAYROLL_CATEGORY_GROUP: "PayrollCategoryGroup",
  /** CRUD: EmployeePayrollGroup */
  EMPLOYEE_PAYROLL_GROUP: "employeepayrollgroup",
  /** POST: calculate payroll */
  CALCULATE_PAYROLL: "calculatepayroll",
  /** GET: staff payroll list report */
  STAFF_PAYROLL_LIST: "getAllRecords/s_staff_payroll_list",
  /** GET: payroll bank statement */
  PAYROLL_BANK_STATEMENT: "getAllRecords/s_rep_payroll_bank_statement",
  /** GET: pre-payroll audit */
  PRE_PAYROLL_AUDIT: "getAllRecords/s_pre_payroll_audit_report",
  /** GET: PBAS assessment form questions */
  GET_EMP_PERF_ASSESSMENT: "getEmpPerAssessment",
  /** POST: save assessment feedback */
  ADD_ASSESSMENT_FEEDBACK: "addFeedback",
  /** Stored procs — university upload approval (shared naming with affiliated colleges) */
  UNIV_UPLOADS_APPROVAL: "getAllRecords/s_get_univ_uploads_approval",
  UNIV_UPLOAD_STD_BULK: "getAllRecords/s_pop_univ_upload_std_bulk",
  /** GET: paginated biometric shift rows (`?status=1&page=&size=` + optional `collegeId`) */
  SHIFT_DETAILS: "shiftdetails",
  /** POST: save employee shift assignments */
  EMPLOYEE_SHIFTS: "employeeshifts",
  /** PUT: batch update LOP salary structure amounts */
  UPDATE_LOP: "updateEmployeeSalaryStructure",
  /** GET: payslips for a generation date */
  EMP_PAYSLIP_BY_DATE: "employeepayslipgenerationsbydate",
  /** POST: generate monthly payslips for college/department */
  PAYSLIP_GENERATIONS: "payslipgenerations",
  /** POST: email payslips for college/department */
  PAYSLIP_EMAIL: "payslipgenerationmails",
  /** Angular `PayrollGroupCrudUrl` */
  PAYROLL_GROUP: "PayrollGroup",
  /** Angular `payslipBranchSettingCrudUrl` */
  PAYSLIP_BRANCH_SETTING: "PayslipBranchSetting",
  /** Angular `payslipbrSettingUrl` */
  PAYSLIPBR_SETTING: "payslipbrsetting",
} as const;

// ─── Affiliated Colleges ───────────────────────────────────────────────────────

export const AFFILIATED_COLLEGES_API = {
  COLLEGE_WISE_DETAILS: "getAllRecords/s_get_collegewisedetails_bycode",
  UNIV_UPLOAD_BULK: "getAllRecords/s_pop_univ_upload_std_bulk",
  AFFILIATED_COLLEGE_SUMMARY:
    "getAllRecords/s_get_affilated_college_summary_details",
  UNIV_COLLEGE_WISE_PAYMENTS: "UnivCollegeWisePayments",
  AFFILIATED_STD_DETAILS: "getAffiliatedStdDetails",
  IMPORT_AFFILIATED_STUDENT_DETAILS: "importAffiliatedStudentDetails",
  STUDENT_SUBJECTS_BY_UPLOAD: "tables/getStudentSubjects",
  STUDENT_ATTENDANCE_BY_UPLOAD: "getStudentAttendance",
  UNIV_STG_EXAM_STD_FEE: "getUnivStgExamStdFee",
  UNIVERSITY_APPROVAL: "getUniversitieApproval",
  UNIV_UPLOADS_APPROVAL: "getAllRecords/s_get_univ_uploads_approval",
  /** Angular `studentAttendenceStageingUrl` */
  STUDENT_ATTENDENCE_STAGEING: "api/tables/uploadStudentAttendance",
  /** Angular `uploadUnivStgExamRegUrl` */
  UPLOAD_UNIV_STG_EXAM_REG: "api/tables/uploadUnivStgExamReg",
  /** Angular `uploadStudentMarksUrl` */
  UPLOAD_STUDENT_MARKS: "api/tables/uploadStudentMarks",
  /** Angular `getStudentAttendanceUrl` */
  GET_STUDENT_ATTENDANCE: "api/tables/getStudentAttendance",
  /** Angular `getStudentMarksUrl` */
  GET_STUDENT_MARKS: "api/tables/getStudentMarks",
} as const;

// ─── E-Office (inventory / letter formats) ───────────────────────────────────

export const FINANCE_API = {
  /** Angular `uploadVoucherUrl` — multipart voucher upload after transaction save. */
  UPLOAD_TRANSACTION_VOUCHER: "finTransaction/uploadVoucherUrl",
  FIN_REPORTS: "s_fin_reports_bycode",
  FIN_BUDGET_DETAILS: "s_get_fin_budgetdetails_bycode",
  ADD_MULTIPLE_FIN_BUDGET_MIDYEAR: "addMultipleFinBudgetMidyearEstimations",
  UPDATE_FIN_BUDGET_ALLOC: "updatefinbudgetalloc",
  ADD_FIN_BUDGET_ALLOC_LIST: "addFinBudgetAllocationList",
  /** Angular `studentmediumofinstructionsUrl` */
  STUDENTMEDIUMOFINSTRUCTIONS: "studentmediumofinstructions",
  /** Angular `getLiveClassSchedulesUrl` */
  GET_LIVE_CLASS_SCHEDULES: "liveClassSchedule/findDetails",
  /** Angular `codissLiveClassSchedulesUrl` */
  CODISS_LIVE_CLASS_SCHEDULES: "codissLiveClassSchedule/findDetails",
  /** Angular `teamMeetingLiveClassSchedulesUrl` */
  TEAM_MEETING_LIVE_CLASS_SCHEDULES: "teamMeetingSchedule/findDetails",
  /** Angular `financeAccountTypeurl` */
  FINANCE_ACCOUNT_TYPE: "FinAccountType",
  /** Angular `updateFinBudgetAllocationUrl` */
  UPDATE_FIN_BUDGET_ALLOCATION: "updateFinBudgetAllocation",
  /** Angular `accountEntityUrl` */
  ACCOUNT_ENTITY: "AccountEntity",
  /** Angular `finCategoryUrl` */
  FIN_CATEGORY: "FinCategory",
  /** Angular `finSubCategoryUrl` */
  FIN_SUB_CATEGORY: "FinSubCategory",
  /** Angular `finMasterSubCategoryUrl` */
  FIN_MASTER_SUB_CATEGORY: "finSubCategories",
  /** Angular `finTransactionUrl` */
  FIN_TRANSACTION: "FinTransaction",
  /** Angular `FinBudgetAllocationUrl` */
  FIN_BUDGET_ALLOCATION: "FinBudgetAllocation",
  /** Angular `finBankAccountsUrl` */
  FIN_BANK_ACCOUNTS: "FinBankAccounts",
  /** Angular `finChequeIssueUrl` */
  FIN_CHEQUE_ISSUE: "FinChequeIssue",
  /** Angular `getAccountEntityDetailUrl` */
  GET_ACCOUNT_ENTITY_DETAIL: "getAccountEntityDetail",
  /** Angular `addFinChequeIssueListUrl` */
  ADD_FIN_CHEQUE_ISSUE: "addFinChequeIssueList",
  /** Angular `getFinChequeIssueDetailUrl` */
  GET_FIN_CHEQUE_ISSUE_DETAIL: "getFinChequeIssueDetail",
} as const;

export const E_OFFICE_API = {
  /** Angular `invPOUrl` — multipart create for purchase order */
  INV_PO: "invpurchaseorder",
  UPDATE_INV_PURCHASE_ORDER: "updateInvPurchaseOrder",
  INV_SRV: "invsrv",
  INV_PURCHASE_RETURN: "purchasereturns",
  INV_INTERNAL_INDENT: "invInternalIndent",
  UPDATE_INV_INTERNAL_INDENT: "updateInvInternalIndent",
  INV_INTERNAL_ISSUE: "invinternalissue",
  INV_INTERNAL_RETURN: "invinternalreturn",
  FIN_BUDGET_DETAILS: "s_get_fin_budgetdetails_bycode",
  FIN_DETAILS: "s_get_financialdetails_bycode",
  /** Angular `invStoreItemCrudUrl` */
  INV_STORE_ITEM: "InvStoreItem",
  /** Angular `invStoresMasterCrudUrl` */
  INV_STORES_MASTER: "InvStoresmaster",
  /** Angular `invUommasterCrudUrl` */
  INV_UOMMASTER: "InvUommaster",
  /** Angular `invSuppliermasterCrudUrl` */
  INV_SUPPLIERMASTER: "InvSuppliermaster",
  /** Angular `invBrandMasterCrudUrl` */
  INV_BRAND_MASTER: "InvBrandmaster",
  /** Angular `invItemCategoryCrudUrl` */
  INV_ITEM_CATEGORY: "InvItemcategory",
  /** Angular `invItemSubCategoryCrudUrl` */
  INV_ITEM_SUB_CATEGORY: "InvItemsubcategory",
  /** Angular `invItemmasterCrudUrl` */
  INV_ITEMMASTER: "InvItemmaster",
  /** Angular `invItemopeningStockCrudUrl` */
  INV_ITEMOPENING_STOCK: "InvItemopeningStock",
  /** Angular `invPurchaseOrderDomainUrl` */
  INV_PURCHASE_ORDER_DOMAIN: "InvPurchaseOrder",
  /** Angular `invInternalReturnItemCrudUrl` */
  INV_INTERNAL_RETURN_ITEM: "InvInternalReturnItem",
  /** Angular `invPurchasereturnCrudUrl` */
  INV_PURCHASERETURN: "InvPurchasereturn",
  /** Angular `searchTrakableItems` */
  SEARCH_TRAKABLE_ITEMS: "searchTrakableItems",
  /** Angular `OfficeLetterFormatsUrl` */
  OFFICE_LETTER_FORMATS: "OfficeLetterFormats",
} as const;

// ─── Subject / Regulation ────────────────────────────────────────────────────

export const SUBJECT_API = {
  /** GET: subject regulations */
  SUBJECT_REGULATIONS: "subjectregulations",
  /** GET: subject course years by college/AY/section */
  SUBJECT_COURSE_YEARS: "subjectcourseyrs",
  /** GET: group year regulation details */
  GROUP_YR_REGULATION_DETAILS: "groupyrregulationdetails",
  /** CRUD: GroupyrRegulationDetail */
  GROUP_YR_REGULATION: "GroupyrRegulationDetail",
  /** CRUD: Subjectregulation */
  SUBJECT_REGULATION: "Subjectregulation",
  /** POST: assign/unassign staff for subject course year */
  STAFF_COURSEYR_SUBJECTS_CHECK: "staffcourseyrsubjectscheck",
  /** POST: subject regulation data sync */
  SUBJECT_REGULATION_DATA_SYNC: "subjectregulationDataSync",
  /** GET: all subject resources schedules */
  ALL_SUBJECT_RESOURCES_SCHEDULES: "allsubjectresourcesschedules",
  /** POST: upload subject unit */
  UPLOAD_SUBJECT_UNIT: "uploadsubjectunit",
  /** POST: bulk upload unit topics from comma-separated workbook format */
  UPLOAD_SUBJECT_UNIT_TOPICS_COMMA_SEPARATOR:
    "uploadSubjectunitTopicsCommaSeparator",
  /** POST: bulk upload subject units and topics (college scoped) */
  UPLOAD_SUBJECT_UNITS_AND_TOPICS: "uploadSubjectUnitsAndTopics",
  /** POST: import subject bulk details */
  IMPORT_SUBJECT_DETAILS: "importSubjectDetails",
  /** POST: process staged subject bulk details */
  PROCESS_STG_SUBJECT_DETAILS: "processStgsubjectDetails",
  /** Angular `subjectCrudUrl` */
  SUBJECT: "Subject",
  /** Angular `addSubjectAndUploadFileUrl` */
  ADD_SUBJECT_AND_UPLOAD_FILE: "addSubjectAndUploadFile",
  /** Angular `addSubjectsUrl` */
  ADD_SUBJECTS: "addSubjects",
  /** Angular `subjectsearchUrl` */
  SUBJECTSEARCH: "subjectsearch",
  /** Angular `subjectTypeModificationUrl` */
  SUBJECT_TYPE_MODIFICATION: "subjecttypemodification",
  /** Angular `updateSubjectAndUploadFileUrl` */
  UPDATE_SUBJECT_AND_UPLOAD_FILE: "updateSubjectAndUploadFile",
  /** Angular `updateStudnetSubjectsUrl` */
  UPDATE_STUDNET_SUBJECTS: "updateStudnetSubjects",
  /** Angular `subjectRegulationForCourseUrl` */
  SUBJECT_REGULATION_FOR_COURSE: "subjectregulationsforcoursegroup",
  /** Angular `subjectsCrudUrl` */
  SUBJECTS_2: "subjects",
  /** Angular `electiveSubjectsRequestUrl` */
  ELECTIVE_SUBJECTS_REQUEST: "electivesubjectrequests",
  /** Angular `updateSubjectUnitTopicUrl` */
  UPDATE_SUBJECT_UNIT_TOPIC: "updateSubjectUnitTopic",
  /** Angular `getSubjectUnitUrl` */
  GET_SUBJECT_UNIT: "SubjectUnit",
  /** Angular `subjectUnitsCrudUrl` */
  SUBJECT_UNITS: "subjectunits",
  /** Angular `getSubjectUnitTopicUrl` */
  GET_SUBJECT_UNIT_TOPIC: "SubjectUnitTopic",
  /** Angular `subjectResourceUrl` */
  SUBJECT_RESOURCE: "subjectresources",
  /** Angular `subjectResourcesSchedulesUrl` */
  SUBJECT_RESOURCES_SCHEDULES: "subjectresourcesschedules",
  /** Angular `subjectResourceEntityUrl` */
  SUBJECT_RESOURCE_ENTITY: "SubjectResource",
  /** Angular `courseyrsubjectsUrl` */
  COURSEYRSUBJECTS: "courseyrsubjects",
  /** Angular `electiveGroupyrMappingUrl` */
  ELECTIVE_GROUPYR_MAPPING: "ElectiveGroupyrMapping",
  /** Angular `electiveGroupYrMappingNamesUrl` */
  ELECTIVE_GROUP_YR_MAPPING_NAMES: "electivegroupyrmappingnames",
  /** Angular `SubjectCategoryUrl` */
  SUBJECT_CATEGORY: "SubjectCategory",
  /** Angular `SubjectTypesUrlL` */
  SUBJECT_TYPES_URL_L: "SubjectTypes",
  /** Angular `uploadStgUnitTopicExcelUrl` */
  UPLOAD_STG_UNIT_TOPIC_EXCEL: "uploadStgUnitTopicExcel",
  /** Angular `uploadUnitTopicUrl` */
  UPLOAD_UNIT_TOPIC: "storage/uploadUnitTopic",
} as const;

// ─── Assignments ─────────────────────────────────────────────────────────────

export const ASSIGNMENT_API = {
  /** CRUD: Assignment */
  ASSIGNMENT: "Assignment",
  /** POST: assignment */
  ASSIGNMENT_POST: "assignment",
  /** POST: assignment upload */
  UPLOAD: "assignmentupload",
  /** CRUD: StudentAssignment */
  STUDENT_ASSIGNMENT: "StudentAssignment",
  /** POST: student assignment */
  STUDENT_ASSIGNMENT_POST: "studentassignment",
  /** POST: student assignment upload */
  STUDENT_UPLOAD: "studentassignmentupload",
  /** GET: assignment pending list */
  GET_PENDING_LIST: "getAllRecords/s_get_assignment_pending_list",
} as const;

// ─── Dashboard / Reports ─────────────────────────────────────────────────────

export const DASHBOARD_API = {
  /** GET: dashboard report */
  DASHBOARD_REPORT: "dashboardreport",
  /** GET: total students report */
  TOTAL_STUDENTS: "getAllRecords/s_total_students_report",
  /** GET: student quick view */
  STUDENT_QUICK_VIEW: "getAllRecords/s_student_QuickView",
  /** GET: student attendance count */
  STUDENT_ATTENDANCE_COUNT: "getAllRecords/s_student_attendance_count",
  /** GET: student schedule count */
  STUDENT_SCH_COUNT: "getAllRecords/s_student_sch_count",
  /** GET: employee count */
  EMPLOYEE_COUNT: "getAllRecords/s_employee_count",
  /** GET: details feedback */
  DETAILS_FEEDBACK: "getAllRecords/s_details_feedback",
  /** GET: survey status */
  GET_SURVEY_STATUS: "getAllRecords/s_get_survey_status",
  /** GET: employee attendance report */
  EMP_ATTENDANCE_REPORT: "getAllRecords/s_emp_attendance_count",
  /** GET: staff payroll list report */
  STAFF_PAYROLL_LIST: "getAllRecords/s_staff_payroll_list",
  /** GET: staff payroll list F report */
  STAFF_PAYROLL_LIST_F: "getAllRecords/s_staff_payroll_list_f",
  /** GET: mapped counselor students */
  MAPPED_COUNSELOR_STUDENTS: "mappedcounselorstudents",
  /** GET: management report */
  MANAGEMENT_REPORT: "getAllRecords/s_db_managment",
  /** GET: students count */
  STUDENTS_COUNT: "getAllRecords/s_rep_std_details",
  /** GET: faculty count */
  FACULTY_COUNT: "getAllRecords/s_rep_emp_details",
  /** GET: finance report */
  FINANCE_REPORT: "getAllRecords/s_rep_finance",
  /** GET: income expense summary */
  INCOME_EXPENSE_SUMMARY: "getAllRecords/s_get_income_expense_summary",
  /** GET: expense summary */
  EXPENSE_SUMMARY: "getAllRecords/s_get_expense_summary",
  /** GET: inventory stock summary */
  INVENTORY_STOCK_SUMMARY: "getAllRecords/s_get_inventory_stock_summary",
  /** GET: transport summary */
  TRANSPORT_SUMMARY: "getAllRecords/s_get_transport_summary",
  /** GET: day wise expense report */
  DAY_WISE_EXPENSE: "getAllRecords/s_get_daywsie_expense_report",
  /** GET: library summary */
  LIBRARY_SUMMARY: "getAllRecords/s_get_library_summary",
} as const;

// ─── Attendance ──────────────────────────────────────────────────────────────

export const ATTENDANCE_API = {
  /** Angular `attendanceNotTakenStaffUrl` — staff who did not mark attendance for a dept/date. */
  S_REP_ATTENDANCE_NOT_TAKEN_STAFF: "s_rep_attendance_not_taken_staff",
  /** Angular `downloadAttendanceNotTakenListUrl` — Excel export for the same proc. */
  DOWNLOAD_STAFF_NOT_MARKED:
    "downloadattendancenottakenlist/s_rep_attendance_not_taken_staff",
  /** GET: emp attendance summary */
  EMP_ATTENDANCE_SUMMARY: "getAllRecords/s_get_emp_attendance_summary",
  /** GET: std attendance summary */
  STD_ATTENDANCE_SUMMARY: "getAllRecords/s_get_std_attendance_summary",
  /** GET: employee monthly attendance report */
  EMP_MONTHLY_REPORT:
    "employeemonthlyattendancereport/s_rep_emp_attendanace_detail",
  /** GET: day wise student attendance summary */
  GET_DAYWISE_STD_ATTENDANCE:
    "getAllRecords/s_get_daywise_std_attendance_summary",
  /** GET: class wise student attendance summary */
  GET_CLASSWISE_STD_ATTENDANCE:
    "getAllRecords/s_get_classwise_std_attendance_summary",
  /** Angular `schedulesforattendanceUrl` */
  SCHEDULESFORATTENDANCE: "schedulesforattendance",
  /** Angular `studentAttendanceListUrl` */
  STUDENT_ATTENDANCE: "studentabsentlist",
  /** Angular `actualClassesScheduleListUrl` */
  ACTUAL_CLASSES_SCHEDULE: "actualclassesschedulelist",
  /** Angular `actualClassesScheduleCrudUrl` */
  ACTUAL_CLASSES_SCHEDULE_2: "ActualClassesSchedule",
  /** Angular `studentSttendanceDetailsUrl` */
  STUDENT_STTENDANCE_DETAILS: "studentattendancedetails",
  /** Angular `studentAttendanceSummaryUrl` */
  STUDENT_ATTENDANCE_SUMMARY: "studentattendancesummary",
  /** Angular `counselormappingswithotabsentiesUrl` */
  COUNSELORMAPPINGSWITHOTABSENTIES: "counselormappingswithotabsenties",
  /** Angular `trainingAttendenceDetailsUrl` */
  TRAINING_ATTENDENCE_DETAILS: "TrainingStudentAttendence",
} as const;

/** Angular `timetable` app — timing sets, class timings, timetables, schedules. */
export const TIMETABLE_MGMT_API = {
  TIMING_SET_ENTITY: "Timingset",
  TIMETABLE_ENTITY: "Timetable",
  WEEKDAY_ENTITY: "Weekday",
  CLASS_TIMING_ENTITY: "ClassTiming",
  CLASS_WEEKDAY_ENTITY: "ClassWeekday",
  TIMING_SETS_BY_ID: "timingsets",
  ADD_TIMING_SET: "addTimingSet",
  UPDATE_TIMING_SETS: "updateTimingsets",
  CLASS_TIMINGS: "classtimings",
  CLASS_WEEKDAYS_LIST: "classweekdayslist",
  TIMETABLES_POST: "timetables",
  TIMETABLES_CURR: "timetablescurr",
  SCHEDULE_LIST_BY_TIMING_SET: "schedulelistbytimingset",
  /** Angular `timingSetListUrl` */
  TIMING_SET: "timingsetslist",
  /** Angular `classWeekdaysUrl` */
  CLASS_WEEKDAYS: "classweekdays",
  /** Angular `scheduleCrudUrl` */
  SCHEDULE: "schedules",
  /** Angular `scheduleEntityUrl` */
  SCHEDULE_ENTITY: "Schedule",
  /** Angular `scheduleSectionUrl` */
  SCHEDULE_SECTION: "schedulesections",
  /** Angular `liveClassScheduleUrl` */
  LIVE_CLASS_SCHEDULE: "liveClassSchedule",
  /** Angular `meetingCheckInUrl` */
  MEETING_CHECK_IN: "liveClassSchedule/meetingCheckIn",
  /** Angular `codissLiveClassScheduleUrl` */
  CODISS_LIVE_CLASS_SCHEDULE: "codissLiveClassSchedule",
  /** Angular `teamMeetingScheduleUrl` */
  TEAM_MEETING_SCHEDULE: "teamMeetingSchedule",
} as const;

export const TIMETABLE_REPORT_API = {
  REP_TT_GET_TIMETABLE_DETAILS: "getAllRecords/s_rep_tt_get_timetable_details",
} as const;

// ─── Grievance ───────────────────────────────────────────────────────────────

export const GRIEVANCE_API = {
  /** CRUD: GrievanceCategory */
  CATEGORY: "GrievanceCategory",
  /** CRUD: GrievanceCommittee */
  COMMITTEE: "GrievanceCommittee",
  /** CRUD: ComplaintsList */
  COMPLAINTS_LIST: "ComplaintsList",
  /** CRUD: CommitteeMember */
  COMMITTEE_MEMBER: "CommitteeMember",
  /** CRUD: Complaint */
  COMPLAINT: "Complaint",
  /** CRUD: ComplaintDetail */
  COMPLAINT_DETAIL: "ComplaintDetail",
  /** POST: complaint */
  COMPLAINT_POST: "complaint",
  /** CRUD: ComplaintsWf */
  COMPLAINTS_WF: "ComplaintsWf",
  /** POST: complaint detail */
  COMPLAINT_DETAIL_POST: "complaintdetail",
  /** POST: transfer complaint */
  TRANSFER_COMPLAINT: "transfercomplaint",
  /** POST: complaint reopen */
  COMPLAINT_REOPEN: "complaintreopen",
  /** POST: complaint upload */
  COMPLAINT_UPLOAD: "complaintupload",
} as const;

// ─── Admission ───────────────────────────────────────────────────────────────

export const ADMISSION_API = {
  /** CRUD: StudentEnquiry */
  STUDENT_ENQUIRY: "StudentEnquiry",
  /** CRUD: student application forms list */
  STUDENT_APPLICATION_FORMS: "studentapplicationforms",
  /** PUT: update university student application */
  UPDATE_UNIV_STUDENT_APPLICATION: "updateUnivStudentApplication",
  /** GET: university student applications search */
  STD_APPLICATIONS_SEARCH: "univStdApplicationsSearch",
  /** GET/POST: student admission report by admission number */
  STUDENT_ADMISSION_REPORT: "studentadmissionreport",
  /** Angular `getStdApplicationFormDetailsUrl` */
  GET_STD_APPLICATION_FORM_DETAILS: "getStdApplicationFormDetails",
  /** Angular `addAdmissionFeeReceiptUrl` */
  ADD_ADMISSION_FEE_RECEIPT: "addAdmissionFeeReceipt",
  /** Angular `studentApplicationFormUrl` */
  STUDENT_APPLICATION_FORM: "studentapplicationform",
  /** Angular `univStudentApplicationUrl` */
  UNIV_STUDENT_APPLICATION: "univStudentApplication",
  /** Angular `studentApplicationUrl` */
  STUDENT_APPLICATION: "StudentApplication",
  /** Angular `univStdApplicationFormSearchUrl` */
  UNIV_STD_APPLICATION_FORM_SEARCH: "univStdApplicationFormSearch",
  /** Angular `getUnivStdApplicationsAndEducationDetailsUrl` */
  GET_UNIV_STD_APPLICATIONS_AND_EDUCATION_DETAILS:
    "getUnivStdApplicationsAndEducationDetails",
  /** Angular `getAdmissionStdApplicationsAndEducationDetailsUrl` */
  GET_ADMISSION_STD_APPLICATIONS_AND_EDUCATION_DETAILS:
    "getAdmissionStdApplicationsAndEducationDetails",
  /** Angular `getStudentApplicationDetailsByUrl` */
  GET_STUDENT_APPLICATION_DETAILS_BY: "getStudentApplicationDetailsBy",
  /** Angular `univStdApplicationFormPhotosUrl` */
  UNIV_STD_APPLICATION_FORM_PHOTOS: "univStdApplicationFormPhotos",
  /** Angular `stdRegisterUrl` */
  STD_REGISTER: "register",
  /** Angular `univUserLoginurl` */
  UNIV_USER_LOGIN: "univUserLogin",
  /** Angular `stdLoginUrl` */
  STD_LOGIN: "stdLogin",
  /** Angular `uploadUnivStdApplicationFormDocumentsUrl` */
  UPLOAD_UNIV_STD_APPLICATION_FORM_DOCUMENTS:
    "uploadUnivStdApplicationFormDocuments",
  /** Angular `stdLoginOtpVerificationUrl` */
  STD_LOGIN_OTP_VERIFICATION: "stdLoginOtpVerification",
  /** Angular `addStdApplicationFormDetailsUrl` */
  ADD_STD_APPLICATION_FORM_DETAILS: "addStdApplicationFormDetails",
  /** Angular `getAdmissionFeeReceiptDetailsUrl` */
  GET_ADMISSION_FEE_RECEIPT_DETAILS: "getAdmissionFeeReceiptDetails",
  /** Angular `updateStdApplicationFormDetailsUrl` */
  UPDATE_STD_APPLICATION_FORM_DETAILS: "updateStdApplicationFormDetails",
  /** Angular `uploadStdApplicationFormPhotosUrl` */
  UPLOAD_STD_APPLICATION_FORM_PHOTOS: "uploadStdApplicationFormPhotos",
  /** Angular `getAdmissionFeeStructureDetailsUrl` */
  GET_ADMISSION_FEE_STRUCTURE_DETAILS: "getAdmissionFeeStructureDetails",
  /** Angular `readmissionUrl` */
  READMISSION: "readmission",
  /** Angular `hostelRegisterUrl` */
  HOSTEL_REGISTER: "HostelRegister",
  /** Angular `courseRegisteredStdForDeptUrl` */
  COURSE_REGISTERED_STD_FOR_DEPT: "courseregisteredstdfordept",
} as const;

// ─── University Management ───────────────────────────────────────────────────

export const UNIVERSITY_API = {
  /** CRUD: UnivCollegeWiseCourses */
  COLLEGE_WISE_COURSES: "UnivCollegeWiseCourses",
  /** GET: univ college wise courses and groups */
  GET_COLLEGE_WISE_COURSES_GROUPS: "getUnivCollegeWiseCoursesAndGroups",
  /** POST: add univ college wise courses */
  ADD_COLLEGE_WISE_COURSES: "addUnivCollegeWiseCourses",
  /** PUT: update univ college wise courses and groups */
  UPDATE_COLLEGE_WISE_COURSES_GROUPS: "updateUnivCollegeWiseCoursesAndGroups",
  /** POST: add univ college wise groups */
  ADD_COLLEGE_WISE_GROUPS: "addUnivCollegeWiseGroups",
  /** POST: add univ college wise courses and groups in one payload */
  ADD_COLLEGE_WISE_COURSES_GROUPS: "addUnivCollegeWiseCoursesAndGroups",
  /** CRUD: UnivAdmissionAllotment */
  ADMISSION_ALLOTMENT: "UnivAdmissionAllotment",
  /** CRUD: UnivAdmissionAllotmentDetails */
  ADMISSION_ALLOTMENT_DETAILS: "UnivAdmissionAllotmentDetails",
  /** GET: univ admission allotment and details */
  GET_ADMISSION_ALLOTMENT_DETAILS: "getUnivAdmissionAllotmentAndDetails",
  /** CRUD: UnivFeeStructure */
  FEE_STRUCTURE: "UnivFeeStructure",
  /** CRUD: UnivFeeStructureDetails */
  FEE_STRUCTURE_DETAILS: "UnivFeeStructureDetails",
  /** GET: univ application form */
  GET_APPLICATION_FORM: "getUnivApplicationForm",
  /** POST: add univ fee receipt */
  ADD_FEE_RECEIPT: "addUnivFeeReceipt",
  /** CRUD: UnivStdApplications */
  STD_APPLICATIONS: "UnivStdApplications",
  /** GET: univ std applications search */
  STD_APPLICATIONS_SEARCH: "univStdApplicationsSearch",
  /** GET: univ student applications */
  GET_UNIV_STD_APPLICATIONS: "getAllRecords/s_get_univ_studentapplications",
  /** GET: std application fee paid list */
  GET_STD_APP_FEE_PAID: "getAllRecords/s_get_std_application_fee_paid_list",
  /** CRUD: CasteQuota */
  CASTE_QUOTA: "CasteQuota",
  /** CRUD: UnivCollegeCounselling */
  COLLEGE_COUNSELLING: "UnivCollegeCounselling",
} as const;

// ─── University Exam Centers ─────────────────────────────────────────────────

export const UNIV_EXAM_CENTER_API = {
  /** CRUD: UnivExamRegionalCenters */
  REGIONAL_CENTERS: "UnivExamRegionalCenters",
  /** CRUD: UnivExamCenters */
  EXAM_CENTERS: "UnivExamCenters",
  /** CRUD: UnivExamGroup — exam paper delivery exam groups (per university) */
  UNIV_EXAM_GROUP: "UnivExamGroup",
  /** CRUD: UnivExamGroupDetails — exams linked to an exam group (paper delivery) */
  UNIV_EXAM_GROUP_DETAILS: "UnivExamGroupDetails",
  /** GET: `getAllRecords/s_get_exam_group_bycode` — exam group lists / exam pick lists (REGSUP, etc.) */
  EXAM_GROUP_BY_CODE: "s_get_exam_group_bycode",
  /** CRUD: UnivExamBundle */
  EXAM_BUNDLE: "UnivExamBundle",
  /** CRUD: UnivExamBags */
  EXAM_BAGS: "UnivExamBags",
  /** CRUD: UnivExamBagCollection */
  BAG_COLLECTION: "UnivExamBagCollection",
  /** CRUD: UnivExamAnswerPaperBags */
  ANSWER_PAPER_BAGS: "UnivExamAnswerPaperBags",
  /** CRUD: UnivEcProfiles */
  EC_PROFILES: "UnivEcProfiles",
  /** CRUD: ExamScanProfiles */
  EXAM_SCAN_PROFILES: "ExamScanProfiles",
  /** CRUD: ExamScanBundles */
  EXAM_SCAN_BUNDLES: "ExamScanBundles",
  /** CRUD: ExamScanBundleDetails */
  EXAM_SCAN_BUNDLE_DETAILS: "ExamScanBundleDetails",
  /** CRUD: UnivEcQuestionPaperConfig */
  EC_QP_CONFIG: "UnivEcQuestionPaperConfig",
  /** CRUD: UnivExamBagTransportation */
  BAG_TRANSPORTATION: "UnivExamBagTransportation",
  /** POST: add list univ EC students */
  ADD_EC_STUDENTS: "addListUnivEcStudents",
  /** CRUD: UnivEcStudents */
  EC_STUDENTS: "UnivEcStudents",
  /** CRUD: UnivEcColleges */
  EC_COLLEGES: "UnivEcColleges",
  /** POST: add list univ EC colleges */
  ADD_EC_COLLEGES: "addListUnivEcColleges",
  /** CRUD: UnivEcCollegeDetails */
  EC_COLLEGE_DETAILS: "UnivEcCollegeDetails",
  /** GET: `getAllRecords/s_get_exam_center_bycode` — exam-center filters / group-year-subject mapping */
  GET_COLLEGE_EXAM_CENTERS: "s_get_exam_center_bycode",
  /** GET: `getAllRecords/s_get_exam_center_details` — bundle/scan lists (Angular getCollegeExamCentersUrl) */
  GET_COLLEGE_EXAM_CENTER_DETAILS: "s_get_exam_center_details",
  /** POST: add univ EC college details */
  ADD_EC_COLLEGE_DETAILS: "addUnivEcCollegeDetails",
  /** PUT: update inactive univ EC college details */
  UPDATE_INACTIVE_EC_COLLEGE_DETAILS: "updateInActiveUnivEcCollegeDetails",
  /** POST: add list univ EC profiles */
  ADD_EC_PROFILES: "addListUnivEcProfiles",
  /** POST: add list univ exam center rooms */
  ADD_EXAM_CENTER_ROOMS: "addListUnivExamCenterRooms",
  /** CRUD: UnivExamCenterRooms */
  EXAM_CENTER_ROOMS: "UnivExamCenterRooms",
  /** GET: search by exam OMR serial no */
  SEARCH_BY_OMR_SERIAL: "searchByExamOmrSerialNo",
  /** CRUD: ExamBagDispatchStatus */
  BAG_DISPATCH_STATUS: "ExamBagDispatchStatus",
  /** POST: add list univ exam answer paper bags */
  ADD_ANSWER_PAPER_BAGS: "addListUnivExamAnswerPaperBags",
  /** GET: `getAllRecords/s_get_exam_center_bundle_bycode` — bundle OMR / stickers / attendance (Angular getExamCenterBundleByCodeUrl) */
  EXAM_CENTER_BUNDLE_BY_CODE: "s_get_exam_center_bundle_bycode",
  /** GET: `getAllRecords/s_get_exam_center_scan_bycode` — scan-bundle OMR stickers (Angular getExamCenterScanByCodeUrl) */
  EXAM_CENTER_SCAN_BY_CODE: "s_get_exam_center_scan_bycode",
  /** GET: `getAllRecords/s_pop_exam_center_scan_details` — populate scan-bundle OMR rows (Angular getPopExamCenterScanDetailsUrl) */
  POP_EXAM_CENTER_SCAN_DETAILS: "s_pop_exam_center_scan_details",
  /** GET: `getAllRecords/s_get_barcode_details` — exam seatno barcode list (Angular getBarcodeDetailsUrl) */
  BARCODE_DETAILS: "s_get_barcode_details",
  /** Angular `UnivExamScanbundleUrl` */
  UNIV_EXAM_SCANBUNDLE: "UnivExamScanbundle",
  /** Angular `saveUnivExamScanbundleDetailsUrl` */
  SAVE_UNIV_EXAM_SCANBUNDLE_DETAILS: "saveUnivExamScanbundleDetails",
  /** Angular `saveUnivExamGroupDetailsUrl` */
  SAVE_UNIV_EXAM_GROUP_DETAILS: "saveUnivExamGroupDetails",
  /** Angular `UnivExamScanbundleDetailsUrl` */
  UNIV_EXAM_SCANBUNDLE_DETAILS: "UnivExamScanbundleDetails",
  /** Angular `searchExamOmrSerialNoUrl` */
  SEARCH_EXAM_OMR_SERIAL_NO: "searchExamOmrSerialNo",
  /** Angular `UnivEvaluationCenterUrl` */
  UNIV_EVALUATION_CENTER: "UnivEvaluationCenter",
  /** Angular `getBooksBarcodeNotGeneratedRecordsUrl` */
  GET_BOOKS_BARCODE_NOT_GENERATED_RECORDS: "getBooksBarcodeNotGeneratedRecords",
  /** Angular `getLibMemberBarcodeNotGeneratedRecordsUrl` */
  GET_LIB_MEMBER_BARCODE_NOT_GENERATED_RECORDS:
    "getLibMemberBarcodeNotGeneratedRecords",
  /** Angular `updateOmrSerialnoAndOmrBarcodeUrl` */
  UPDATE_OMR_SERIALNO_AND_OMR_BARCODE: "updateOmrSerialnoAndOmrBarcode",
  /** Angular `generateBarCodeUrl` */
  GENERATE_BAR_CODE: "generate-barcode/examstudents",
  /** Angular `updateRejectProcessedReasonUrl` */
  UPDATE_REJECT_PROCESSED_REASON: "updateRejectProcessedReason",
} as const;

// ─── University Committees ───────────────────────────────────────────────────

export const UNIV_COMMITTEE_API = {
  /** CRUD: UnivCommitteePositions */
  POSITIONS: "UnivCommitteePositions",
  /** CRUD: UnivCommittees */
  COMMITTEES: "UnivCommittees",
  /** CRUD: UnivCommitteeMembers */
  MEMBERS: "UnivCommitteeMembers",
  /** CRUD: UnivRemunerationSettings */
  REMUNERATION_SETTINGS: "UnivRemunerationSettings",
  /** CRUD: UnivCommitteeMeetings */
  MEETINGS: "UnivCommitteeMeetings",
  /** CRUD: UnivExamMaster */
  EXAM_MASTER: "UnivExamMaster",
  /** CRUD: UnivExaminationRemunerationDetails */
  REMUNERATION_DETAILS: "UnivExaminationRemunerationDetails",
  /** PUT: update multiple remuneration status */
  UPDATE_REMUNERATION_STATUS: "updateMultipleRemunerationStatusCatDetId",
  /** PUT: update remuneration details */
  UPDATE_REMUNERATION_DETAILS: "RazorPay/updateRemunerationDetails",
  /** CRUD: UnivRemunerationTransactions */
  REMUNERATION_TRANSACTIONS: "UnivRemunerationTransactions",
  /** GET: committee meeting members details */
  GET_MEETING_MEMBERS: "getCommitteeMeetingMembersDetails",
  /** POST: university committee meeting */
  COMMITTEE_MEETING_POST: "universityCommitteeMeeting",
  /** CRUD: UnivCommitteeProfilerecruitments */
  PROFILE_RECRUITMENTS: "UnivCommitteeProfilerecruitments",
  /** POST: add multiple committee profile recruitments */
  ADD_PROFILE_RECRUITMENTS: "addMultipleCommitteeProfileRecruitments",
  /** GET: committee and zoom meeting details */
  GET_COMMITTEE_ZOOM_DETAILS: "getCommitteeAndZoomMeetingDetails",
  /** GET: committee details by codes */
  GET_COMMITTEE_DETAILS: "getAllRecords/s_get_committeedetails_bycodes",
  /** POST: mail release offer letter */
  MAIL_RELEASE_OFFER_LETTER: "mailReleaseOfferLetter",
  /** CRUD: RemunerationDesignation */
  REMUNERATION_DESIGNATION: "RemunerationDesignation",
  /** CRUD: UniversityDepartments */
  UNIVERSITY_DEPARTMENTS: "UniversityDepartments",
} as const;

// ─── Transport ───────────────────────────────────────────────────────────────

export const TRANSPORT_API = {
  /** GET: vehicle details */
  GET_VEHICLE_DETAILS: "getAllRecords/s_get_vehicle_details",
  /** GET: driver details */
  GET_DRIVER_DETAILS: "getAllRecords/s_get_driver_details",
  /** GET: route details */
  GET_ROUTE_DETAILS: "getAllRecords/s_get_route_details",
  /** GET: student transport details */
  GET_STUDENT_TRANSPORT: "getAllRecords/s_get_std_transport",
  /** POST: transport allocation for student */
  TRANSPORT_ALLOCATION: "transportallocationforstudent",
  /** Angular `transportDetailUrl` */
  TRANSPORT_DETAIL: "TransportDetail",
  /** Angular `vehicleDetailCrudUrl` */
  VEHICLE_DETAIL: "VehicleDetail",
  /** Angular `driverUrl` */
  DRIVER: "Driver",
  /** Angular `helperUrl` */
  HELPER: "Helper",
  /** Angular `routeUrl` */
  ROUTE: "Route",
  /** Angular `routeStopUrl` */
  ROUTE_STOP: "RouteStop",
  /** Angular `vehicleDriverUrl` */
  VEHICLE_DRIVER: "VehicleDriver",
  /** Angular `vechicleRouterUrl` */
  VECHICLE_ROUTER: "VechicleRoute",
  /** Angular `transportPaymentUrl` */
  TRANSPORT_PAYMENT: "transportpayment",
} as const;

// ─── Hostel ──────────────────────────────────────────────────────────────────

export const HOSTEL_API = {
  /** POST: hostel allocation for student */
  HOSTEL_ALLOCATION: "hostelallocationforstudent",
  /** POST: hostel room allocation */
  ROOM_ALLOCATION: "hostelroomallocation",
  /** GET: allocations for a room — `cms/hstlroomallocation?hstlRoomId=&isActive=true` */
  ROOM_ALLOCATION_LIST: "hstlroomallocation",
  /** GET: search hosteler by name — `roomAllocationSearch?hostelId=&q=` */
  ROOM_ALLOCATION_SEARCH: "roomAllocationSearch",
  /** GET: monthly visitors summary */
  GET_VISITORS_REPORT: "getAllRecords/s_get_visitors_report",
  /** Angular `hostelTypeUrl` */
  HOSTEL_TYPE: "HostelType",
  /** Angular `hostelUrl` */
  HOSTEL: "HostelDetail",
  /** Angular `hostelRoomChargesIdUrl` */
  HOSTEL_ROOM_CHARGES_ID: "HostelRoomCharge",
  /** Angular `hostelRoomUrl` */
  HOSTEL_ROOM: "HostelRoom",
  /** Angular `hostelVisitorUrl` */
  HOSTEL_VISITOR: "HostelVisitor",
} as const;

// ─── Certificates & Reports ──────────────────────────────────────────────────

export const CERTIFICATE_API = {
  /** POST: student TC */
  STUDENT_TC: "studenttc",
  /** POST: generate transfer certificate */
  GENERATE_TC: "generateTransferCertificate",
  /** POST: student bonafide report */
  BONAFIDE_REPORT: "studentbonafidereport",
  /** POST: student PP bonafide report */
  PP_BONAFIDE_REPORT: "studentppbonafidereport",
  /** POST: student IT bonafide report */
  IT_BONAFIDE_REPORT: "studentitbonafidereport",
  /** POST: student bank bonafide report */
  BANK_BONAFIDE_REPORT: "studentbankbonafidereport",
  /** POST: student TC bonafide report */
  TC_BONAFIDE_REPORT: "studenttcbonafidereport",
  /** POST: student custodian report */
  CUSTODIAN_REPORT: "studentcustodianreport",
  /** POST: book detail search report */
  BOOK_DETAIL_SEARCH_REPORT: "bookdetailsearchreport",
  /** POST: emp payslip generations PDF download */
  EMP_PAYSLIP_PDF_DOWNLOAD: "empPayslipGenerationsPDFDownload",
  /** Angular `generateAllStdCertificatesUrl` */
  GENERATE_ALL_STD_CERTIFICATES: "generateAllStdCertificates",
  /** Angular `generateTcCertificateUrl` */
  GENERATE_TC_CERTIFICATE: "generateTcCertificate",
  /** Angular `titlesReportUrl` */
  TITLES_REPORT: "titlesreport",
  /** Angular `noobjectionUrl` */
  NOOBJECTION: "noobjection",
} as const;

// ─── Syllabus ────────────────────────────────────────────────────────────────

export const SYLLABUS_API = {
  /** GET: classwise syllabus status */
  GET_CLASSWISE_STATUS: "getAllRecords/s_get_classwise_syllabus_status",
  /** GET: subject syllabus plan report */
  PLAN_REPORT: "getAllRecords/s_subject_syllabus_plan_report",
  /** GET: classwise syllabus percentage */
  CLASSWISE_PERCENTAGE: "getAllRecords/s_get_classwise_syllabus_per",
} as const;

// ─── Events (Angular events-and-notifications + event-calendar) ─────────────

export const EVENTS_API = {
  COLLEGE_CALENDAR: "collegecalendar",
  EVENTS: "events",
  EVENTS_BY_AUDIENCE: "eventsByAudience",
  DEPARTMENT_EVENT: "departmentEvent",
  DEPARTMENT_EVENT_UPLOAD: "departmentEvent/uploadFiles",
  /** Angular `eventTypeUrl` */
  EVENT_TYPE: "EventType",
  /** Angular `eventAudienceUrl` */
  EVENT_AUDIENCE: "eventaudience",
  /** Angular `eventsByDateUrl` */
  EVENTS_BY_DATE: "eventsbydate",
  /** Angular `notificationUrl` */
  NOTIFICATION: "Notification",
  /** Angular `notificationsUrl` */
  NOTIFICATIONS: "notifications",
  /** Angular `notificationbyaudienceUrl` */
  NOTIFICATIONBYAUDIENCE: "notificationbyaudience",
  /** Angular `eventCrudUrl` */
  EVENT: "Event",
} as const;

// ─── Mentorship / counseling (Angular staff-mentorship + admin-counseling) ───

export const MENTORSHIP_API = {
  MAPPED_COUNSELOR_STUDENTS: "mappedcounselorstudents",
  COUNSELOR_MAPPINGS: "counselormappings",
  COUNSELOR_DETAILS: "counselordetails",
  COUNSELOR_ACTIVITIES: "counseloractivitys",
  COUNSELOR_ACTIVITY_ENTITY: "CounselorActivity",
  COUNSELOR_ACTIVITY_TYPE_ENTITY: "CounselorActivityType",
  /** Angular `counselorMappingUrl` */
  COUNSELOR_MAPPING: "CounselorMapping",
} as const;

// ─── Counselor ───────────────────────────────────────────────────────────────

export const COUNSELOR_API = {
  /** GET: counselor summary */
  GET_SUMMARY: "getAllRecords/s_get_counselor_summary",
  /** GET: counselor attendance report */
  ATTENDANCE_REPORT: "getAllRecords/s_rep_counselor_attendance_details",
  /** GET: counselor fortnight report */
  FORTNIGHT_REPORT: "getAllRecords/s_get_counselor_report",
  /** GET: counselor fortnight download report */
  FORTNIGHT_DOWNLOAD: "getAllRecordsDownload/s_get_counselor_report",
} as const;

// ─── Self-Appraisal ──────────────────────────────────────────────────────────

export const APPRAISAL_API = {
  /** POST: emp self-appraisal form detail services */
  FORM_DETAIL_SERVICES: "empSelfappraisalFormDetailServices",
  /** GET: emp self-appraisal details */
  DETAILS: "empSelfappraisalDetails",
  /** CRUD: EmpSelfappraisalForm */
  FORM: "EmpSelfappraisalForm",
  /** CRUD: EmpSelfappraisal */
  SELF_APPRAISAL: "EmpSelfappraisal",
  /** CRUD: EmpContribution */
  CONTRIBUTION: "EmpContribution",
} as const;

// ─── Special Activities ──────────────────────────────────────────────────────

export const SPECIAL_ACTIVITY_API = {
  /** CRUD: SpecialActivity */
  CRUD: "SpecialActivity",
  /** POST: special activity */
  POST: "specialactivity",
  /** GET: special activity students */
  STUDENTS: "specialactivitystudents",
  /** CRUD: SpclActivityAttendance */
  ATTENDANCE: "SpclActivityAttendance",
  /** POST: spcl activity attendance */
  ATTENDANCE_POST: "spclActivityAttendance",
} as const;

// ─── Alumni ──────────────────────────────────────────────────────────────────

export const ALUMNI_API = {
  /** CRUD: AmsCommittee */
  COMMITTEE: "AmsCommittee",
  /** CRUD: AmsCommitteeRole */
  COMMITTEE_ROLE: "AmsCommitteeRole",
  /** CRUD: AmsIndustry */
  INDUSTRY: "AmsIndustry",
  /** Angular `teamSessionUrl` */
  TEAM_SESSION: "teamSession",
} as const;

// ─── Budget ──────────────────────────────────────────────────────────────────

export const BUDGET_API = {
  /** CRUD: BudgetCategory */
  CATEGORY: "BudgetCategory",
  /** CRUD: BudgetPrograms */
  PROGRAMS: "BudgetPrograms",
  /** CRUD: BudgetAllocation */
  ALLOCATION: "BudgetAllocation",
} as const;

// ─── To-Do / Activities ──────────────────────────────────────────────────────

export const TODO_API = {
  /** CRUD: EmpTodoListTags */
  TAGS: "EmpTodoListTags",
  /** CRUD: EmpActivityList */
  ACTIVITIES: "EmpActivityList",
  /** CRUD: EmpTodoList */
  TODO_LIST: "EmpTodoList",
  /** GET: emp todo list report */
  TODO_LIST_REPORT: "getAllRecords/s_rep_emp_todo_list",
} as const;

// ─── Class Notes ─────────────────────────────────────────────────────────────

export const CLASS_NOTES_API = {
  /** POST: upload class notes */
  UPLOAD: "uploadclassnotes",
} as const;

// ─── Miscellaneous Reports ───────────────────────────────────────────────────

export const MISC_REPORT_API = {
  /** GET: student electives */
  GET_STD_ELECTIVES: "getAllRecords/s_get_std_electives",
  /** GET: emp workload report */
  EMP_WORKLOAD: "getAllRecords/s_rep_emp_workload",
  /** GET: emp workload report download */
  EMP_WORKLOAD_DOWNLOAD: "getAllRecordsDownload/s_rep_emp_workload",
  /** GET: scholarship list */
  STD_SCHOLARSHIP: "getAllRecords/s_std_scholarship_list",
  /** GET: scholarship download */
  STD_SCHOLARSHIP_DOWNLOAD: "getAllRecordsDownload/s_std_scholarship_list",
  /** GET: enquiry application summary */
  ENQUIRY_APP_SUMMARY: "getAllRecords/s_get_enquiry_application_summary",
  /** GET: feedback status */
  GET_FEEDBACK_STATUS: "getAllRecords/s_get_feedback_status",
  /** GET: visitors report */
  GET_VISITORS_REPORT: "getAllRecords/s_get_visitors_report",
  /** GET: parent appointment details */
  GET_PARENT_APPOINTMENT: "getAllRecords/s_get_parent_appointment_details",
  /** GET: student co-curricular activities report */
  GET_STD_CC_ACTIVITIES: "getAllRecords/s_get_std_ccactivities_report",
  /** POST: upload to temp table */
  UPLOAD_TEMP_TABLE: "upload",
} as const;

// ─── Workflow ────────────────────────────────────────────────────────────────

export const WORKFLOW_API = {
  /** CRUD: WorkflowStage */
  WORKFLOW_STAGE: "WorkflowStage",
  /** Angular `stdSubRegWorkflowUrl` */
  STD_SUB_REG_WORKFLOW: "StdSubRegWorkflow",
} as const;

// ─── Exam Masters (simple CRUD entities) ─────────────────────────────────────

export const EXAM_MASTERS_API = {
  /**
   * GET/CRUD: ExamMarkssetup records.
   * Spring Boot entity name: ExamMarkssetup (lowercase 's')
   */
  EXAM_MARKS_SETUP_ENTITY: "ExamMarkssetup",
  /**
   * POST: save/update an array of ExamMarkssetup rows in one request.
   * Angular: exammarkssetupUrl = 'exammarkssetup'
   */
  EXAM_MARKS_SETUP_SAVE: "exammarkssetup",
  /**
   * CRUD: ExamFeeStructure — per-exam fee configuration
   * (regFee, subjectFees, collectionDates, nested additional/fine rows).
   */
  EXAM_FEE_STRUCTURE_ENTITY: "ExamFeeStructure",
} as const;

// ─── Organization ─────────────────────────────────────────────────────────────

export const ORG_API = {
  /** POST: upload / replace organization logo (multipart/form-data) */
  LOGO_UPLOAD: "organizationlogoupload",
} as const;

// ─── Feedback / Survey ───────────────────────────────────────────────
export const FEEDBACK_API = {
  /** Angular `fbOptionGroupUrl` */
  FB_OPTION_GROUP: "FbOptionGroup",
  /** Angular `FbOptionchoiceUrl` */
  FB_OPTIONCHOICE: "FbOptionchoice",
  /** Angular `surveyformUrl` */
  SURVEYFORM: "surveyform",
  /** Angular `getSurveyFormUrl` */
  GET_SURVEY_FORM: "surveyformdetailsbyenddate",
  /** Angular `feedbackQuestionUrl` */
  FEEDBACK_QUESTION: "FeedbackQuestion",
  /** Angular `surveyFeedbackUrl` */
  SURVEY_FEEDBACK: "surveyfeedback",
  /** Angular `surveyFeedbackDetailCrudUrl` */
  SURVEY_FEEDBACK_DETAIL: "SurveyFeedbackDetail",
  /** Angular `surveyfeedbackEmpUrl` */
  SURVEYFEEDBACK_EMP: "surveyfeedbackEmp",
} as const;

// ─── Campus Maintenance ───────────────────────────────────────────────
export const CAMPUS_MAINTENANCE_API = {
  /** Angular `clgManagementIssueUrl` */
  CLG_MANAGEMENT_ISSUE: "ClgManagementIssue",
  /** Angular `uploadIssueImageUrl` */
  UPLOAD_ISSUE_IMAGE: "uploadissueimage",
} as const;

// ─── Placements & Achievements ───────────────────────────────────────────────
export const PLACEMENT_API = {
  /** Angular `trainingUrl` */
  TRAINING: "Training",
  /** Angular `trainingDetailUrl` */
  TRAINING_DETAIL: "TrainingDetail",
  /** Angular `trainingStudentUrl` */
  TRAINING_STUDENT: "TrainingStudent",
  /** Angular `trainingSessionUrl` */
  TRAINING_SESSION: "TrainingSession",
  /** Angular `trainingAttendenceUrl` */
  TRAINING_ATTENDENCE: "trainingstdattend",
  /** Angular `companyContactUrl` */
  COMPANY_CONTACT: "CompanyContact",
  /** Angular `achivementCategoryUrl` */
  ACHIVEMENT_CATEGORY: "Category",
  /** Angular `achivementsubcategory` */
  ACHIVEMENTSUBCATEGORY: "SubCategory",
  /** Angular `achivementCrudUrl` */
  ACHIVEMENT: "Achievement",
  /** Angular `companyUrl` */
  COMPANY: "Company",
  /** Angular `companyMeetingUrl` */
  COMPANY_MEETING: "CompanyMeeting",
  /** Angular `placementUrl` */
  PLACEMENT: "Placement",
  /** Angular `placementDetailsUrl` */
  PLACEMENT_DETAILS: "placementdetails",
  /** Angular `placementCompanyUrl` */
  PLACEMENT_COMPANY: "PlacementCompany",
  /** Angular `placementBroadcastUrl` */
  PLACEMENT_BROADCAST: "PlacementBroadcast",
  /** Angular `placementStudentRegistrationUrl` */
  PLACEMENT_STUDENT_REGISTRATION: "PlacementStudentRegistration",
  /** Angular `stdregdetailsUrl` */
  STDREGDETAILS: "stdregdetails",
} as const;

// ─── Student Subject Registration ───────────────────────────────────────────────
export const SUBJECT_REGISTRATION_API = {
  /** Angular `stdSubRegistrationSetupUrl` */
  STD_SUB_REGISTRATION_SETUP: "StdSubRegistrationSetup",
  /** Angular `stdSubRegistrationUrl` */
  STD_SUB_REGISTRATION: "StdSubRegistration",
  /** Angular `stdsubregUrl` */
  STDSUBREG: "stdsubreg",
} as const;

// ─── Live Classes / Digital Library storage ───────────────────────────────────────────────
export const LIVE_CLASS_API = {
  /** Angular `zoomSessionUrl` */
  ZOOM_SESSION: "zoomSession",
  /** Angular `presignedUriUrl` */
  PRESIGNED_URI: "storage/presignedUri",
} as const;

// ─── CO-PO (Course / Program Outcomes) ───────────────────────────────────────────────
export const COPO_API = {
  /** Angular `programOutcomeUrl` */
  PROGRAM_OUTCOME: "CmProgramOutcome",
  /** Angular `cmLessonPlanUrl` */
  CM_LESSON_PLAN: "CmLessonPlan",
  /** Angular `cmLessonPlanningUrl` */
  CM_LESSON_PLANNING: "cmLessonPlans",
  /** Angular `cmOutcomeMappingsUrl` */
  CM_OUTCOME_MAPPINGS: "cmOutcomeMappings",
  /** Angular `cmOutcomeMappingCrudUrl` */
  CM_OUTCOME_MAPPING: "CmOutcomeMapping",
} as const;

// ─── Next.js Internal API Routes ─────────────────────────────────────────────
//
// These are the Next.js /api/* routes that client components call directly.
// They are NOT Spring Boot paths — do not prefix with /api/proxy/.
//
// Usage:
//   fetch(NEXT_API.AUTH.LOGIN, { method: 'POST', ... })
//   fetch(NEXT_API.PROXY(AUTH_API.USER_ACCESS) + '?userId=...')

/**
 * Minio object-storage base URL.
 * Prepend to any `logoPath` / file path returned by Spring Boot.
 *
 * @example  `${MINIO_URL}${org.logoPath}`
 */
export const MINIO_URL = process.env.NEXT_PUBLIC_MINIO_URL ?? "";

export const NEXT_API = {
  AUTH: {
    /** POST: authenticate — sets iron-session cookie */
    LOGIN: "/api/auth/login",
    /** POST: clear iron-session cookie */
    LOGOUT: "/api/auth/logout",
    /** GET: return current SessionUser from iron-session */
    ME: "/api/auth/me",
  },
  /** POST (multipart) to store a file in S3; DELETE ?key=... to remove one */
  UPLOAD: "/api/upload",
  /**
   * Build a /api/proxy/{path} URL for any Spring Boot endpoint.
   *
   * @example  NEXT_API.PROXY(AUTH_API.USER_ACCESS)
   * // → '/api/proxy/useraccess'
   */
  PROXY: (path: string) => `/api/proxy/${path}` as const,
  /**
   * Build a /api/cms/{path} URL — use when `SPRING_API_URL` already ends with `/cms`
   * (avoids `/api/proxy/cms/...` double-prefixing the CMS segment).
   *
   * @example  NEXT_API.CMS(EXAM_API.SAVE_EXAM_FEE_STRUCTURE)
   * // → '/api/cms/examfeestructure'
   */
  CMS: (path: string) => `/api/cms/${path}` as const,
} as const;
