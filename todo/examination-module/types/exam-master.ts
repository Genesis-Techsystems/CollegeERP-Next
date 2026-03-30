// ─── Exam Master ──────────────────────────────────────────────────────────────

/** Exam master record from Spring Boot ExamMaster entity */
export interface ExamMaster {
  /** Primary key -- Spring Boot auto-generated */
  examId: number
  /** Display name of the exam (e.g. "B.Tech Regular Exams - Nov 2024") */
  examName: string
  /** Short name / abbreviation */
  examShortName: string
  /** Exam month/year -- stored as ISO "YYYY-MM-DD", display as "MM/YYYY" */
  examMonthYr: string
  /** Start date of the exam window (ISO string) */
  fromDate: string
  /** End date of the exam window (ISO string) */
  toDate: string
  /** Whether this exam includes regular exam papers */
  isRegularExam: boolean
  /** Whether this exam includes supplementary exam papers */
  isSupplyExam: boolean
  /** Whether this exam includes internal assessment papers */
  isInternalExam: boolean
  /** Whether the exam has been published to students */
  isPublished: boolean
  /** Whether result processing has begun */
  isResultprocessStarted: boolean
  /** Soft-delete flag -- false means logically deleted */
  isActive: boolean
  /** Reason for deactivation (required when isActive is false) */
  reason?: string
  /** Server file path for exam notification PDF/image */
  notificationFilePath?: string
  /** Date when notification was published (ISO string) */
  notificationPublishedOn?: string
  /** Server file path for fee notification PDF/image */
  feeNotificationFilePath?: string
  /** Date when fee notification was published (ISO string) */
  feeNotificationPublishedOn?: string
  /** FK: university this exam belongs to (university mode) */
  universityId?: number
  /** FK: college this exam belongs to (college mode) */
  collegeId?: number
  /** College code -- returned from joined College entity */
  collegeCode?: string
  /** College name -- returned from joined College entity */
  collegeName?: string
  /** FK: course this exam belongs to */
  courseId?: number
  /** Course code -- returned from joined Course entity */
  courseCode?: string
  /** Course name -- returned from joined Course entity */
  courseName?: string
  /** FK: academic year */
  academicYearId?: number
  /** Academic year display string -- from joined AcademicYear entity */
  academicYear?: string
  /** Record creation timestamp (ISO string) */
  createdDt?: string
  /** Last update timestamp (ISO string) */
  updatedDt?: string
}

export interface ExamMasterFormValues {
  examName: string
  examShortName: string
  examMonthYr: Date | null       // month/year picker value
  fromDate: Date | null
  toDate: Date | null
  isRegularExam: boolean
  isSupplyExam: boolean
  isInternalExam: boolean
  isPublished: boolean
  isResultprocessStarted: boolean
  isActive: boolean
  reason: string
  notificationPublishedOn: Date | null
  feeNotificationPublishedOn: Date | null
  notificationFile: File | null
  feeNotificationFile: File | null
}

// ─── Exam Master Details ──────────────────────────────────────────────────────

/** Detail row for an exam master -- one per regulation/group/year/type combination */
export interface ExamMasterDetails {
  /** Primary key -- present only for persisted records */
  examDetailsId?: number
  /** FK: parent exam master */
  examMasterId: number
  /** FK: GeneralDetail ID for exam type category (Regular/Supple/Internal) */
  examTypeCatId: number
  /** GeneralDetail code for the exam type (e.g. "Regular") */
  examTypeCatCode?: string
  /** Display name for the exam type category */
  examTypeCatDisplayName?: string
  /** FK: regulation for this detail row */
  regulationId: number
  /** Regulation code from joined Regulation entity */
  regulationCode?: string
  /** Regulation name from joined Regulation entity */
  regulationName?: string
  /** FK: course group */
  courseGroupId: number
  /** Course group code from joined CourseGroup entity */
  courseGroupCode?: string
  /** Course group name from joined CourseGroup entity */
  courseGroupName?: string
  /** FK: course year */
  courseYearId: number
  /** Course year code from joined CourseYear entity */
  courseYearCode?: string
  /** Course year name from joined CourseYear entity */
  courseYearName?: string
  /** User-defined label for this exam detail entry */
  examLabel: string
  /** Whether this is a bridge course entry */
  isBridgeCourse: boolean
  /** Soft-delete flag */
  isActive: boolean
  /** Reason for deactivation */
  reason?: string
  /** Record creation timestamp (ISO string) */
  createdDt?: string
  /** Last update timestamp (ISO string) */
  updatedDt?: string
}

// ─── College-wise filter dropdown data ────────────────────────────────────────
// Shape returned by GET /getAllRecords/s_get_collegewisedetails_bycode?in_flag=clg_filters
// data.result is an array of arrays; we care about two:
//   [i] where [i][0].flag === 'clg_filters'       → filtersdata
//   [i] where [i][0].clg_filters_ay === 'clg_filters_ay' → academicData

/** Row from the college-wise filter stored procedure result */
export interface CollegeWiseFilterRow {
  /** Discriminator: "clg_filters" for filter data */
  flag?: string
  /** Discriminator: "clg_filters_ay" for academic year data */
  clg_filters_ay?: string
  /** FK: university ID */
  fk_university_id: number
  /** University code */
  university_code: string
  /** University display name */
  university_name: string
  /** FK: college ID */
  fk_college_id: number
  /** College code */
  college_code: string
  /** College display name */
  college_name: string
  /** FK: course ID */
  fk_course_id: number
  /** Course code */
  course_code: string
  /** Course display name */
  course_name: string
  /** FK: academic year ID (present in AY rows) */
  fk_academic_year_id?: number
  /** Academic year display string (present in AY rows) */
  academic_year?: string
  /** 1 if this is the current academic year, 0 otherwise */
  is_curr_ay?: number
}

// ─── Reference data for details page ─────────────────────────────────────────

/** General detail record -- used for exam fee type tabs (Regular/Supple/Internal) */
export interface GeneralDetail {
  /** Primary key */
  generalDetailId: number
  /** Code used for filtering: "Regular" | "Supple" | "Internal" */
  generalDetailCode: string
  /** Internal name */
  generalDetailName: string
  /** User-facing display name */
  generalDetailDisplayName?: string
}

/** Regulation lookup record -- filtered by courseId */
export interface Regulation {
  /** Primary key */
  regulationId: number
  /** Short code (e.g. "R20") */
  regulationCode: string
  /** Full display name */
  regulationName: string
}

/** Course group lookup record -- filtered by courseId */
export interface CourseGroup {
  /** Primary key */
  courseGroupId: number
  /** Short code (e.g. "CSE-A") */
  groupCode: string
  /** Full display name */
  groupName: string
}

/** Course year lookup record -- filtered by courseId, ordered by sortOrder */
export interface CourseYear {
  /** Primary key */
  courseYearId: number
  /** Short code (e.g. "I") */
  courseYearCode: string
  /** Full display name (e.g. "I Year") */
  courseYearName: string
  /** Display order */
  sortOrder?: number
}
