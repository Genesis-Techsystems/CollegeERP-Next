// ─── Exam Master ──────────────────────────────────────────────────────────────

export interface ExamMaster {
  examId: number
  examName: string
  examShortName: string
  examMonthYr: string          // stored as "YYYY-MM-DD", display as "MM/YYYY"
  fromDate: string
  toDate: string
  isRegularExam: boolean
  isSupplyExam: boolean
  isInternalExam: boolean
  isPublished: boolean
  isResultprocessStarted: boolean
  isActive: boolean
  reason?: string
  notificationFilePath?: string
  notificationPublishedOn?: string
  feeNotificationFilePath?: string
  feeNotificationPublishedOn?: string
  universityId?: number
  collegeId?: number
  collegeCode?: string
  collegeName?: string
  courseId?: number
  courseCode?: string
  courseName?: string
  academicYearId?: number
  academicYear?: string
  createdDt?: string
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

export interface ExamMasterDetails {
  examDetailsId?: number
  examMasterId: number
  examTypeCatId: number
  examTypeCatCode?: string
  examTypeCatDisplayName?: string
  regulationId: number
  regulationCode?: string
  regulationName?: string
  courseGroupId: number
  courseGroupCode?: string
  courseGroupName?: string
  courseYearId: number
  courseYearCode?: string
  courseYearName?: string
  examLabel: string
  isBridgeCourse: boolean
  isActive: boolean
  reason?: string
  createdDt?: string
  updatedDt?: string
}

// ─── College-wise filter dropdown data ────────────────────────────────────────
// Shape returned by GET /getAllRecords/s_get_collegewisedetails_bycode?in_flag=clg_filters
// data.result is an array of arrays; we care about two:
//   [i] where [i][0].flag === 'clg_filters'       → filtersdata
//   [i] where [i][0].clg_filters_ay === 'clg_filters_ay' → academicData

export interface CollegeWiseFilterRow {
  flag?: string
  clg_filters_ay?: string
  fk_university_id: number
  university_code: string
  university_name: string
  fk_college_id: number
  college_code: string
  college_name: string
  fk_course_id: number
  course_code: string
  course_name: string
  fk_academic_year_id?: number
  academic_year?: string
  is_curr_ay?: number           // 1 if current academic year
}

// ─── Reference data for details page ─────────────────────────────────────────

export interface GeneralDetail {
  generalDetailId: number
  generalDetailCode: string      // 'Regular' | 'Supple' | 'Internal'
  generalDetailName: string
  generalDetailDisplayName?: string
}

export interface Regulation {
  regulationId: number
  regulationCode: string
  regulationName: string
}

export interface CourseGroup {
  courseGroupId: number
  groupCode: string
  groupName: string
}

export interface CourseYear {
  courseYearId: number
  courseYearCode: string
  courseYearName: string
  sortOrder?: number
}
