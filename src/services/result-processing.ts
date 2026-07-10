/**
 * Result Processing services.
 *
 * Mirrors Angular `src/app/main/apps/examination/result-processing/*`:
 *  - apply-moderation-rule.component.ts (Moderation Rule Setup / Apply Moderation Rule)
 *  - t-sheets.component.ts (T-Sheets)
 *
 * Filter cascades use the same domain lists as Angular (College → AcademicYear →
 * Course → CourseGroup → CourseYear → ExamMaster) and the same custom
 * `examCourseYearSubject` endpoint for exam subjects — NOT the consolidated
 * clg_exam_timetable_filters proc, whose subject/exam ids do not line up with
 * what `s_pop_exam_subjectwisemoderation` expects.
 */

import { crud, domainCreate, domainList, domainUpdate, fetchDetails, getAllRecords } from './crud'
import { buildQuery } from './query'
import { EXAM_API, EXAM_EVAL_API } from '@/config/constants/api'

type AnyRow = Record<string, any>

// ─── Moderation rule filter cascades (Angular apply-moderation-rule) ──────────

/** Angular getData(): College list, isActive==true. */
/**
 * Grade rule settings live on the `ExamResultProcessingSettings` entity (pk `examrpsettingId`),
 * NOT `ExamGrade` (the A/B/C grade scale used by grade-setup). The grade-rule-settings screen
 * previously read/wrote ExamGrade, so its rule columns (firstmodmarks, grafting %, grace marks…)
 * were always blank. Mirrors Angular grade-rule-settings.component.ts.
 */
export async function listGradeRuleSettings(params: {
  collegeId: number
  courseId: number
  regulationId: number
}): Promise<AnyRow[]> {
  const { courseId, regulationId } = params
  if (!courseId || !regulationId) return []
  try {
    // Rules are scoped to course + regulation (collegeId is null on the records),
    // so we intentionally do NOT filter by College here — otherwise the grid is
    // always empty. College remains a navigation aid in the UI to pick the course.
    return await domainList<AnyRow>(
      'ExamResultProcessingSettings',
      buildQuery({
        'Course.courseId': courseId,
        'regulation.regulationId': regulationId,
      }),
    )
  } catch {
    return []
  }
}

export async function createGradeRuleSetting(payload: Record<string, unknown>): Promise<AnyRow> {
  return domainCreate<AnyRow>('ExamResultProcessingSettings', payload)
}

export async function updateGradeRuleSetting(
  examrpsettingId: number,
  payload: Record<string, unknown>,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>('ExamResultProcessingSettings', 'examrpsettingId', examrpsettingId, payload)
}

export async function getModerationColleges(): Promise<AnyRow[]> {
  return domainList<AnyRow>('College', buildQuery({ isActive: true }))
}

/** Angular selectedCollege(): AcademicYear by college, isActive, fromDate DESC. */
export async function getModerationAcademicYears(collegeId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'AcademicYear',
    buildQuery(
      { 'College.collegeId': collegeId, isActive: true },
      { field: 'fromDate', direction: 'DESC' },
    ),
  )
}

/** Angular selectedAcademicYear(): Course by college, isActive. */
export async function getModerationCourses(collegeId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'Course',
    buildQuery({ 'College.collegeId': collegeId, isActive: true }),
  )
}

/** Angular selectedCourse(): CourseGroup by course, isActive. */
export async function getModerationCourseGroups(courseId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'CourseGroup',
    buildQuery({ 'Course.courseId': courseId, isActive: true }),
  )
}

/** Angular selectedCourseGroup(): CourseYear by course, isActive, sortOrder ASC. */
export async function getModerationCourseYears(courseId: number): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'CourseYear',
    buildQuery(
      { 'Course.courseId': courseId, isActive: true },
      { field: 'sortOrder', direction: 'ASC' },
    ),
  )
}

/** Angular selectedCourseYear(): ExamMaster by college+course+academicYear, isActive, createdDt DESC. */
export async function getModerationExams(params: {
  collegeId: number
  courseId: number
  academicYearId: number
}): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    'ExamMaster',
    buildQuery(
      {
        'College.collegeId': params.collegeId,
        'Course.courseId': params.courseId,
        'AcademicYear.academicYearId': params.academicYearId,
        isActive: true,
      },
      { field: 'createdDt', direction: 'DESC' },
    ),
  )
}

/**
 * Angular selectedExam(): GET examCourseYearSubject?collegeId=&academicYearId=
 * &courseyearId=&courseGroupId= (note the lowercase `courseyearId` — matches
 * the Spring endpoint). Returns rows with subjectId/subjectCode/subjectName/regulationCode.
 */
export async function getExamCourseYearSubjects(params: {
  collegeId: number
  academicYearId: number
  courseYearId: number
  courseGroupId: number
}): Promise<AnyRow[]> {
  const data = await fetchDetails<AnyRow[] | ''>(EXAM_API.EXAM_COURSE_YEAR_SUBJECT, {
    collegeId: params.collegeId,
    academicYearId: params.academicYearId,
    courseyearId: params.courseYearId,
    courseGroupId: params.courseGroupId,
  })
  return Array.isArray(data) ? data : []
}

/**
 * Angular getDetails() "Generate": s_pop_exam_subjectwisemoderation,
 * flag GetModerationMarks. result[0] = students, result[1] = moderation rule info.
 */
export async function getSubjectWiseModerationMarks(params: {
  collegeId: number
  examId: number
  courseYearId: number
  courseGroupId: number
  subjectId: number
}): Promise<{ students: AnyRow[]; info: AnyRow[] }> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(EXAM_EVAL_API.SUBJECT_WISE_MODERATION, {
    in_flag: 'GetModerationMarks',
    in_collegeid: params.collegeId,
    in_examid: params.examId,
    in_courseyearid: params.courseYearId,
    in_coursegroupid: params.courseGroupId,
    in_subjectid: params.subjectId,
  })
  const groups = data?.result ?? []
  return {
    students: Array.isArray(groups[0]) ? groups[0] : [],
    info: Array.isArray(groups[1]) ? groups[1] : [],
  }
}

// ─── T-Sheets (Angular t-sheets.component) ────────────────────────────────────

/**
 * Angular t-sheets getList(): s_get_examevaluation_bycodes, flag
 * list_evaluationsettings_filter (in_orgid 1, in_affiliatedto_catdet_id 1).
 * Returns rows with course_code + exam_month_yr that drive the Get List call.
 */
export async function getTSheetEvaluationFilters(employeeId: number): Promise<AnyRow[]> {
  const data = await crud.getAllRecords<{ result: AnyRow[][] }>('s_get_examevaluation_bycodes', {
    in_flag: 'list_evaluationsettings_filter',
    in_orgid: 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_month_yr: '',
    in_course_code: '',
    in_course_year_code: '',
    in_subject_code: '',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_code: '',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 1,
    in_loginuser_empid: employeeId || 0,
  })
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

/**
 * Angular t-sheets newGetDetails() "Get List": s_get_exam_result_memos, flag
 * list_exam_tsheet with the 13 evaluation-settings params (NOT the legacy
 * in_exam_id/in_course_id variant — the live proc expects these names).
 */
export async function getTSheetResultList(params: {
  examMonthYear: string
  courseCode: string
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(EXAM_API.GET_EXAM_RESULT_MEMOS, {
    in_flag: 'list_exam_tsheet',
    in_orgid: 1,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_month_yr: params.examMonthYear,
    in_course_code: params.courseCode,
    in_course_year_code: '',
    in_subject_code: '',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_regulation_code: '',
    in_emp_id: 0,
    in_questionpaper_id: 0,
  })
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}
