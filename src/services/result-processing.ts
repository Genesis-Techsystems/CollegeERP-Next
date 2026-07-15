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
import { EXAM_API, EXAM_EVAL_API, NEXT_API } from '@/config/constants/api'
import { parseApiError } from '@/lib/errors'

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

/**
 * Angular branch-wise-passes/failed getDetails():
 * `s_get_exam_final_analysis_bycodes` with `final_results_list` /
 * `final_reeval_results_list`.
 */
export async function getGroupWiseFinalResults(params: {
  isReevaluation: boolean
  examId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examTypeCatdetId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_final_analysis_bycodes', {
    in_flag: params.isReevaluation ? 'final_reeval_results_list' : 'final_results_list',
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_examtypecate_det_id: params.examTypeCatdetId,
  })
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

/**
 * Angular moderation-benefited-students-report getDetails():
 * `s_get_exam_resultprocessing_bycode`, flag `mod_benefited_std_by_subject`.
 */
export async function getModerationBenefitedStudents(params: {
  examId: number
  examTypeCatdetId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_resultprocessing_bycode', {
    in_flag: 'mod_benefited_std_by_subject',
    in_exam_id: params.examId,
    in_examtype: params.examTypeCatdetId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
  })
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

/**
 * Angular grace-benefited-students-report getDetails():
 * `s_get_exam_resultprocessing_bycode`, flag `exam_gracemark_added_list`.
 */
export async function getGraceMarksBenefitedStudents(params: {
  examId: number
  examTypeCatdetId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_resultprocessing_bycode', {
    in_flag: 'exam_gracemark_added_list',
    in_exam_id: params.examId,
    in_examtype: params.examTypeCatdetId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
  })
  return Array.isArray(data?.result?.[0]) ? data.result[0] : []
}

/**
 * Angular detention-report getDetails():
 * `s_get_detention_report`, flag `batch_wise_detention_report`.
 */
/** Angular detention/backlog procs may return `result: [[...rows]]` or a flat `result: [...rows]`. */
function unwrapProcResultRows(data: { result?: unknown } | null | undefined): AnyRow[] {
  const result = data?.result
  if (!Array.isArray(result) || result.length === 0) return []
  if (Array.isArray(result[0])) return result[0] as AnyRow[]
  return result as AnyRow[]
}

export async function getBatchWiseDetentionReport(params: {
  collegeId: number
  courseId: number
  batchId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_detention_report', {
    in_flag: 'batch_wise_detention_report',
    in_college_id: params.collegeId,
    in_course_id: params.courseId || 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_batch_id: params.batchId,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular student-backlog-data getDetails():
 * `s_generate_exam_reports`, flag `STUDENT_FAILURE_SUMMARY`.
 */
export async function getBatchWiseStudentBacklogReport(params: {
  collegeId: number
  courseId: number
  batchId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_generate_exam_reports', {
    in_flag: 'STUDENT_FAILURE_SUMMARY',
    in_college_id: params.collegeId,
    in_course_id: params.courseId || 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_batch_id: params.batchId,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular student-wise-grade-point-report getDetails():
 * `s_get_exam_results_bycode`, flag `tabulation_register_new` / `tabulation_register_re_evaluation`.
 */
export async function getStudentWiseGradePointReport(params: {
  examId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  hallTicketNo?: string
  isReevaluation?: boolean
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_exam_results_bycode', {
    in_flag: params.isReevaluation ? 'tabulation_register_re_evaluation' : 'tabulation_register_new',
    in_exam_id: params.examId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_hallticket_no: params.hallTicketNo?.trim() || '',
    in_examtype: 0,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular exam-absentees-report getEvaluationList():
 * `s_get_exam_std_absentees_report`.
 */
export async function getExamAbsenteesReport(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  examId: number
  subjectId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_exam_std_absentees_report', {
    in_college_id: params.collegeId || 0,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: params.courseYearId || 0,
    in_regulation_id: params.regulationId || 0,
    in_exam_id: params.examId,
    in_exam_date: '1990-01-01',
    in_subject_id: params.subjectId || 0,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular re-evaluation-result-report (route: re-evaluation-exam-report) getDetails():
 * `s_get_exam_reevaluation_marks_report`, flag `reevaluation_marks_report`.
 */
export async function getReEvaluationExamReport(params: {
  examId: number
  examTypeCatdetId: number
  courseId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_exam_reevaluation_marks_report', {
    in_flag: 'reevaluation_marks_report',
    in_exam_id: params.examId,
    in_examtype: params.examTypeCatdetId || 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId || 0,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular re-evaluation-result-comparision-report getDetails():
 * `s_get_revaluation_analysis_report`.
 */
export async function getReEvaluationComparisionReport(params: {
  examId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_revaluation_analysis_report', {
    in_exam_id: params.examId,
    in_college_id: 0,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId || 0,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular internal-marks-entry-report (route: internal-marks-report) getDetails():
 * `s_get_exam_internal_final_marks` with in_final_type=0.
 */
export async function getInternalMarksReport(params: {
  examId: number
  collegeId: number
  courseGroupId: number
  courseYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_exam_internal_final_marks', {
    in_exam_ids: String(params.examId),
    in_college_id: params.collegeId,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: params.courseYearId || 0,
    in_subject_id: 0,
    in_std_id: 0,
    in_final_type: 0,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular academic-year-curriculum-report getDetails():
 * `getAllRecords/curriculum_report` with flag `ay_univ_curriculum`.
 */
export async function getAcademicYearCurriculumReport(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  regulationId: number
  academicYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('curriculum_report', {
    in_flag: 'ay_univ_curriculum',
    in_university_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: params.courseYearId || 0,
    in_regulation_id: params.regulationId || 0,
    in_academic_year_id: params.academicYearId || 0,
    in_batch_id: 0,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular batchwise-sgpa-report getDetails():
 * `s_get_batchwise_sgpa` with flag `batch_wise`.
 * result[0] = semester columns, result[1] = student SGPA rows.
 */
export async function getBatchWiseSgpaReport(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  batchId: number
}): Promise<{ semesters: AnyRow[]; students: AnyRow[] }> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_batchwise_sgpa', {
    in_flag: 'batch_wise',
    in_college_id: params.collegeId,
    in_course_id: params.courseId || 0,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_batch_id: params.batchId,
    in_regulation_id: 0,
  })
  const groups = Array.isArray(data?.result) ? data.result : []
  return {
    semesters: Array.isArray(groups[0]) ? groups[0] : [],
    students: Array.isArray(groups[1]) ? groups[1] : [],
  }
}

/**
 * Angular invigilators-remuneration-report getDetails():
 * `s_get_evaluators_bank_copy_report` with flag `invigilators_remuneration`.
 */
export async function getInvigilatorsRemunerationReport(params: {
  examId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_evaluators_bank_copy_report', {
    in_flag: 'invigilators_remuneration',
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_id: params.examId,
    in_subject_id: 0,
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: 0,
    in_exam_short_name: 0,
    in_affiliatedto_catdet_id: 1,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular lab-remuneration-report selectedExam():
 * `univ_exam_rest_no_tt` → rest filters + regulations groups.
 */
export async function getLabRemunerationRestFilters(params: {
  courseId: number
  examId: number
  academicYearId: number
  employeeId: number
}): Promise<{ rest: AnyRow[]; regulations: AnyRow[] }> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_rest_no_tt',
    in_flag_type: 'ALL',
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'ALL',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  return {
    rest: groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_rest_filters') ?? [],
    regulations: groups.find((g) => (g?.[0]?.flag ?? '') === 'regulations') ?? [],
  }
}

/**
 * Angular lab-remuneration-report selectedRegulation(): LAB subjects via
 * `univ_exam_subject_uc` / `univ_exam_sub_uc`.
 */
export async function getLabRemunerationSubjects(params: {
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  examId: number
  academicYearId: number
  regulationId: number
  employeeId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
    in_flag: 'univ_exam_subject_uc',
    in_flag_type: 'LAB',
    in_university_id: 0,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: params.courseGroupId || 0,
    in_course_year_id: params.courseYearId || 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: params.regulationId || 0,
    in_subject_id: 0,
    in_loginuser_empid: params.employeeId || 0,
    in_loginuser_roleid: 0,
    in_sub_flag_type: 'LAB',
    in_param1: 0,
    in_param2: 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'univ_exam_sub_uc') ?? []
}

/**
 * Angular lab-remuneration-report selectedsubject():
 * `s_get_examevaluation_bycodes` flag `filter_univexam_evaluator_moderator`.
 */
export async function getLabRemunerationEvaluators(params: {
  organizationId: number
  employeeId: number
  examId: number
  courseYearId: number
  subjectId: number
  regulationId: number
  courseId: number
  academicYearId: number
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_examevaluation_bycodes', {
    in_flag: 'filter_univexam_evaluator_moderator',
    in_orgid: params.organizationId || 0,
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_evalutor_profileid: 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 0,
    in_exam_id: params.examId,
    in_course_year_id: params.courseYearId || 0,
    in_subject_id: params.subjectId || 0,
    in_regulation_id: params.regulationId || 0,
    in_course_id: params.courseId,
    in_academic_year_id: params.academicYearId,
    in_loginuser_empid: params.employeeId || 0,
  })
  const groups = data?.result ?? []
  return groups.find((g) => (g?.[0]?.flag ?? '') === 'evaluator_list') ?? []
}

/**
 * Angular lab-remuneration-report getList():
 * `s_get_evaluators_bank_copy_report` with
 * `lab_evaluator_remuneration` / `re_lab_evaluator_remuneration`.
 */
export async function getLabRemunerationReport(params: {
  examId: number
  subjectId: number
  evaluatorProfileId: number
  isReevaluation?: boolean
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result: AnyRow[][] | AnyRow[] }>('s_get_evaluators_bank_copy_report', {
    in_flag: params.isReevaluation ? 're_lab_evaluator_remuneration' : 'lab_evaluator_remuneration',
    in_fdate: '1990-01-01',
    in_tdate: '1990-01-01',
    in_exam_month_yr: '1990-01-01',
    in_exam_id: params.examId,
    in_subject_id: params.subjectId || 0,
    in_evalutor_profileid: params.evaluatorProfileId || 0,
    in_exam_date: '1990-01-01',
    in_emp_id: 0,
    in_questionpaper_id: 0,
    in_evaluator_role_id: 0,
    in_academic_year: '',
    in_exam_short_name: '',
    in_affiliatedto_catdet_id: 1,
  })
  return unwrapProcResultRows(data)
}

/**
 * Angular consolidated-exam-report download():
 * POST `examResultPDF` with flag `exam_final_std_result_detail` — returns PDF blob.
 */
export type ConsolidatedExamReportPayload = {
  flag: 'exam_final_std_result_detail'
  examId: number
  collegeId: number
  courseId: number
  courseGroupId: number
  courseYearId: number
  academicYearId: number
  studentId: number
  regulationId: number
  subjectId: number
}

export async function downloadConsolidatedExamReportPdf(
  payload: ConsolidatedExamReportPayload,
): Promise<Blob> {
  // Angular downloadExamResultPDF(): POST examResultPDF with responseType: 'blob'
  const res = await fetch(NEXT_API.PROXY(EXAM_API.EXAM_RESULT_PDF), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([payload]),
  })
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    throw parseApiError(res, await res.json().catch(() => null))
  }
  // Upstream may return JSON success/error instead of a PDF when generation fails
  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(data?.message || 'Failed to generate PDF')
  }
  const blob = await res.blob()
  if (!blob || blob.size === 0) {
    throw new Error('Failed to generate PDF')
  }
  return blob
}
