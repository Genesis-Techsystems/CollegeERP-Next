export interface CollegeWiseFilterRow {
  fk_university_id: number
  university_name?: string
  university_code?: string
  fk_course_id: number
  course_name?: string
  course_code?: string
  flag?: string
  clg_filters_ay?: string
  fk_academic_year_id?: number
  academic_year?: string
  is_curr_ay?: number
  fk_college_id?: number
  college_name?: string
  college_code?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface Regulation {
  regulationId: number
  regulationCode: string
  regulationName?: string
  isActive?: boolean
  [key: string]: string | number | boolean | null | undefined
}

export interface ExamMaster {
  examId: number
  examName: string
  examShortName?: string
  examMonthYr?: string
  fromDate?: string
  toDate?: string
  courseId?: number
  isRegularExam?: boolean
  isSupplyExam?: boolean
  isInternalExam?: boolean
  isPublished?: boolean
  isResultprocessStarted?: boolean
  isActive?: boolean
  reason?: string
  notificationFilePath?: string
  feeNotificationFilePath?: string
  notificationPublishedOn?: string
  feeNotificationPublishedOn?: string
  [key: string]: string | number | boolean | null | undefined
}

export interface ExamMasterDetails {
  examMasterDetailsId?: number
  examMaster?: { examId: number }
  regulationId?: number
  regulationCode?: string
  courseGroupId?: number
  courseGroupCode?: string
  courseYearId?: number
  courseYearName?: string
  examLabel?: string
  isBridgeCourse?: boolean
  isActive?: boolean
  [key: string]: string | number | boolean | { examId: number } | null | undefined
}

export interface GeneralDetail {
  generalDetailId: number
  generalDetailCode?: string
  generalDetailName?: string
  isActive?: boolean
  [key: string]: string | number | boolean | null | undefined
}

export interface CourseGroup {
  courseGroupId: number
  courseGroupName?: string
  courseGroupCode?: string
  groupCode?: string
  isActive?: boolean
  [key: string]: string | number | boolean | null | undefined
}

export interface CourseYear {
  courseYearId: number
  courseYearName?: string
  yearName?: string
  sortOrder?: number
  isActive?: boolean
  [key: string]: string | number | boolean | null | undefined
}
