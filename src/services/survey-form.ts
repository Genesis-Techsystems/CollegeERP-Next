/**
 * Survey Forms — Angular `survey-forms-list` / `survey-form` /
 * `student-feedback-list`.
 * Uses existing domain CRUD + `surveyform` POST (no new backend endpoints).
 */
import { FEEDBACK_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import type { FbQuestion } from '@/types/feedback-question'
import type { SurveyFormRow } from '@/types/survey-form'
import {
  buildQuery,
  domainGetRawQuery,
  domainList,
  domainListPaginated,
  domainListRawQuery,
  fetchDetails,
  getAllRecords,
  type DomainPage,
  postDetails,
} from './crud'

type AnyRow = Record<string, unknown>
type ProcResponse = { result?: AnyRow[][] }

/** Angular `listAllDetails(SurveyForm)`. */
export async function listSurveyForms(): Promise<SurveyFormRow[]> {
  return domainList<SurveyFormRow>(
    FEEDBACK_API.SURVEY_FORM,
    buildQuery({}, { field: 'surveyFormId', direction: 'DESC' }),
  )
}

/**
 * Angular `getDetailsById(SurveyForm, surveyFormId, 'surveyFormId')`
 * → `domain/get/SurveyForm?query=surveyFormId=={id}` (includes surveyDetailDTOs).
 */
export async function getSurveyFormDetails(
  surveyFormId: number,
): Promise<SurveyFormRow | null> {
  if (!surveyFormId) return null
  return domainGetRawQuery<SurveyFormRow>(
    FEEDBACK_API.SURVEY_FORM,
    `surveyFormId==${surveyFormId}`,
  )
}

/**
 * Angular `listDetailsByTwoIds(FeedbackQuestion, collegeId, 'true',
 * College.collegeId, isActive)`.
 */
export async function listFbQuestionsByCollege(
  collegeId: number,
): Promise<FbQuestion[]> {
  if (!collegeId) return []
  return domainList<FbQuestion>(
    ENTITIES.FEEDBACK_QUESTION.name,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
  )
}

/**
 * Angular `addMasterDetails(surveyform, surveyDetails)` — create & update.
 */
export async function saveSurveyForm(
  payload: Record<string, unknown>,
): Promise<unknown> {
  return postDetails(FEEDBACK_API.SURVEYFORM, payload)
}

/**
 * Angular student-feedback-list `selectedCollege`:
 * `listDetailsByThreeIdsEqul(SurveyForm, 'Students', collegeId, 'true', 'desc',
 * fbfrom.generalDetailCode, College.collegeId, isActive, createdDt)`.
 */
export async function listSurveyFormsByCollegeForStudents(
  collegeId: number,
): Promise<SurveyFormRow[]> {
  if (!collegeId) return []
  // Angular: order(createdDt=desc) — lowercase direction matches Spring query.
  return domainListRawQuery<SurveyFormRow>(
    FEEDBACK_API.SURVEY_FORM,
    `fbfrom.generalDetailCode==Students.and.College.collegeId==${collegeId}.and.isActive==true.order(createdDt=desc)`,
  )
}

export type SurveyFeedbackListRow = Record<string, unknown> & {
  surveryFbId?: number
  fromStudentFirstName?: string
  fromRollNo?: string
  forEmpFirstName?: string
  forEmpNumber?: string
  subjectName?: string
  subjectCode?: string
  feedbackDate?: string
  collegeCode?: string
  fromAcademicYearName?: string
  fromCourseName?: string
  fromGroupCode?: string
  fromCourseYearName?: string
  fromSectionName?: string
  surveyFeedbackDetailDTOs?: Array<{
    fbAnswer?: string
    fbAnswerRating?: number | string
    surveyDetailDTO?: { fbQuestion?: string }
  }>
}

/**
 * Angular `listDetailsByIdPageNation(SurveyFeedback, surveyFormId, page, 50,
 * surveyForm.surveyFormId, 'page', 'size')`.
 */
export async function listSurveyFeedbackByFormPage(
  surveyFormId: number,
  page: number,
  size = 50,
): Promise<DomainPage<SurveyFeedbackListRow>> {
  if (!surveyFormId) return { rows: [], totalCount: 0, page: 0 }
  return domainListPaginated<SurveyFeedbackListRow>(
    FEEDBACK_API.SURVEY_FEEDBACK_LIST,
    page,
    size,
    buildQuery({ 'surveyForm.surveyFormId': surveyFormId }),
  )
}

/**
 * Angular feedback-summary-report `getFiltersList`
 * → `getAllRecords/s_get_collegewisedetails_bycode`
 * with `in_flag=clg_filters,clg_survey_filter`.
 */
export async function getFeedbackSummaryFilterBundles(params: {
  organizationId: number
  employeeId: number
}): Promise<{
  filtersData: AnyRow[]
  academicYearData: AnyRow[]
  surveyData: AnyRow[]
}> {
  const data = await getAllRecords<ProcResponse>(
    's_get_collegewisedetails_bycode',
    {
      in_flag: 'clg_filters,clg_survey_filter',
      in_org_id: params.organizationId,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: params.employeeId,
      in_loginuser_roleid: 0,
      in_employee: '',
      in_subject: '',
      in_gm_codes: 'QUOTA,GENDER',
    },
  )

  const groups = Array.isArray(data?.result) ? data.result : []
  let filtersData: AnyRow[] = []
  let academicYearData: AnyRow[] = []
  let surveyData: AnyRow[] = []

  for (const arr of groups) {
    if (!Array.isArray(arr) || arr.length === 0) continue
    const first = arr[0] ?? {}
    const flag = String(first.flag ?? '')
    if (flag === 'clg_filters') filtersData = arr
    else if (flag === 'clg_survey_filter') surveyData = arr
    else if (String(first.clg_filters_ay ?? '') === 'clg_filters_ay') {
      academicYearData = arr
    }
  }

  return { filtersData, academicYearData, surveyData }
}

export type FeedbackSummaryReportRow = {
  subject_name?: string
  Faculty_Name?: string
  Participants?: string | number
  Summary_Rating?: string | number
  Summary_Standard_Deviation?: string | number
} & AnyRow

/**
 * Angular `getFeedbackSummaryReport` →
 * `getAllRecords/s_feedback_summary_report_backup`
 * (`listBySixIds` with Question_Wise_Summary_a).
 */
export async function getFeedbackSummaryReportRows(params: {
  surveyFormId: number
  groupSectionId: number
  courseYearId: number
  percentageValue: number
}): Promise<FeedbackSummaryReportRow[]> {
  const data = await getAllRecords<ProcResponse>(
    FEEDBACK_API.STUDENT_FEEDBACK_SUMMARY_REPORT,
    {
      in_flag: 'Question_Wise_Summary_a',
      in_survey_form_id: params.surveyFormId,
      in_sectionId: params.groupSectionId,
      in_CourseYearId: params.courseYearId,
      in_emp_id: 0,
      in_percentage_value: params.percentageValue,
    },
  )
  const groups = Array.isArray(data?.result) ? data.result : []
  const first = groups[0]
  return Array.isArray(first) ? (first as FeedbackSummaryReportRow[]) : []
}

/**
 * Angular feedback-consolidated-report `getFeedbackSummaryReport` →
 * same proc with `in_flag=Question_Wise_Summary`.
 */
export async function getFeedbackConsolidatedReportRows(params: {
  surveyFormId: number
  groupSectionId: number
  courseYearId: number
  percentageValue: number
}): Promise<FeedbackSummaryReportRow[]> {
  const data = await getAllRecords<ProcResponse>(
    FEEDBACK_API.STUDENT_FEEDBACK_SUMMARY_REPORT,
    {
      in_flag: 'Question_Wise_Summary',
      in_survey_form_id: params.surveyFormId,
      in_sectionId: params.groupSectionId,
      in_CourseYearId: params.courseYearId,
      in_emp_id: 0,
      in_percentage_value: params.percentageValue,
    },
  )
  const groups = Array.isArray(data?.result) ? data.result : []
  const first = groups[0]
  return Array.isArray(first) ? (first as FeedbackSummaryReportRow[]) : []
}

export type FeedbackConsolidatedQuestionKey = {
  FB_Question: string
  question_sort_order: string | number
}

export type FeedbackConsolidatedPivotRow = {
  subject_name: string
  Faculty_Name: string
  questionSurvey: Array<string | number>
  mean: string | number
  Standard_Deviation: string | number
}

/** Angular consolidated-report pivot of `result[0]` into question columns. */
export function pivotFeedbackConsolidatedRows(
  rows: FeedbackSummaryReportRow[],
): {
  keys: FeedbackConsolidatedQuestionKey[]
  survey: FeedbackConsolidatedPivotRow[]
} {
  const keys: FeedbackConsolidatedQuestionKey[] = []
  const survey: FeedbackConsolidatedPivotRow[] = []

  for (const row of rows) {
    const question = String(row.FB_Question ?? '')
    if (
      question &&
      !keys.some((k) => k.FB_Question === question)
    ) {
      keys.push({
        FB_Question: question,
        question_sort_order: (row.question_sort_order as string | number) ?? '',
      })
    }

    const subject = String(row.subject_name ?? '')
    const faculty = String(row.Faculty_Name ?? '')
    const existing = survey.find(
      (x) => x.subject_name === subject && x.Faculty_Name === faculty,
    )
    if (existing) {
      existing.questionSurvey.push(
        (row.Rating as string | number) ?? '',
      )
    } else {
      survey.push({
        subject_name: subject,
        Faculty_Name: faculty,
        questionSurvey: [(row.Rating as string | number) ?? ''],
        mean: (row.Summary_Rating as string | number) ?? '',
        Standard_Deviation:
          (row.Summary_Standard_Deviation as string | number) ?? '',
      })
    }
  }

  return { keys, survey }
}

/**
 * Angular suggestion-report `selectedDepartment` /
 * `listDetailsByTwoIds(SurveyForm, collegeId, true, College.collegeId, isActive)`.
 */
export async function listSurveyFormsByCollegeActive(
  collegeId: number,
): Promise<SurveyFormRow[]> {
  if (!collegeId) return []
  return domainList<SurveyFormRow>(
    FEEDBACK_API.SURVEY_FORM,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
  )
}

export type SurveyFeedbackEmpRow = {
  employeeId?: number
  empName?: string
  empNumber?: string
  firstName?: string
} & AnyRow

/**
 * Angular `listByIds(surveyfeedbackEmp, surveyFormId, 'surveyFormId')`.
 */
export async function listSurveyFeedbackEmployees(
  surveyFormId: number,
): Promise<SurveyFeedbackEmpRow[]> {
  if (!surveyFormId) return []
  const data = await fetchDetails<SurveyFeedbackEmpRow[] | AnyRow>(
    FEEDBACK_API.SURVEYFEEDBACK_EMP,
    { surveyFormId },
  )
  if (Array.isArray(data)) return data
  return []
}

export type FeedbackSuggestionReportRow = {
  FB_Question?: string
  Academic_Details?: string
  Participants?: string | number
  Suggestion?: string
  Rating?: string | number
} & AnyRow

/**
 * Angular `getFeedbackSuggestionReport` →
 * `getAllRecords/s_feedback_suggestion_report`
 * (`listByFiveIds` with in_collegeId=0, in_dept_id=0).
 */
export async function getFeedbackSuggestionReportRows(params: {
  surveyFormId: number
  employeeId: number
  percentageValue: number
}): Promise<FeedbackSuggestionReportRow[]> {
  const data = await getAllRecords<ProcResponse>(
    FEEDBACK_API.FEEDBACK_SUGGESTION_REPORT,
    {
      in_SurveyForm_id: params.surveyFormId,
      in_collegeId: 0,
      in_emp_id: params.employeeId,
      in_dept_id: 0,
      in_percentage_value: params.percentageValue,
    },
  )
  const groups = Array.isArray(data?.result) ? data.result : []
  const first = groups[0]
  return Array.isArray(first) ? (first as FeedbackSuggestionReportRow[]) : []
}

export type FeedbackStatusReportRow = {
  id?: number
  survey_name?: string
  student_name?: string
  roll_number?: string
  Emp_Name?: string
  emp_number?: string
  Feedback_form_Status?: string
} & AnyRow

/**
 * Angular feedback-status-report `getEmpAttendanceReport` →
 * `getAllRecords/s_get_feedback_status?in_clg_id=&in_ayear_id=`.
 */
export async function getFeedbackStatusReportRows(params: {
  collegeId: number
  academicYearId: number
}): Promise<FeedbackStatusReportRow[]> {
  if (!params.collegeId || !params.academicYearId) return []
  const data = await getAllRecords<ProcResponse>(
    FEEDBACK_API.FEEDBACK_STATUS_REPORT,
    {
      in_clg_id: params.collegeId,
      in_ayear_id: params.academicYearId,
    },
  )
  const groups = Array.isArray(data?.result) ? data.result : []
  const first = groups[0]
  if (!Array.isArray(first)) return []
  return first.map((row, idx) => ({
    ...(row as FeedbackStatusReportRow),
    id: idx + 1,
  }))
}
