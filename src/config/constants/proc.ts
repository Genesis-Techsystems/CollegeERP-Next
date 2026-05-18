/**
 * Stored procedure parameter definitions.
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/proc-constants.ts
 *
 * Each proc constant defines the parameter shape for a specific Spring Boot
 * getAllRecords endpoint. Use these to build query strings consistently.
 */

export interface ProcParam {
  /** Query string segment, e.g. "in_flag=" or "&in_org_id=" */
  paramName: string
  /** Default value for this parameter */
  paramValue: string | number
  /** Identifier used for programmatic lookup */
  id: string
}

/** Parameter definitions for s_get_univwisedetails_bycode (university fee structure filters). */
export const PROC_UNIV_FILTERS: ProcParam[] = [
  { paramName: 'in_flag=', paramValue: 'clg_filters', id: 'in_flag' },
  { paramName: '&in_org_id=', paramValue: 1, id: 'in_org_id' },
  { paramName: '&in_university_id=', paramValue: 0, id: 'in_university_id' },
  { paramName: '&in_college_id=', paramValue: 0, id: 'in_college_id' },
  { paramName: '&in_course_id=', paramValue: 0, id: 'in_course_id' },
  { paramName: '&in_course_group_id=', paramValue: 0, id: 'in_course_group_id' },
  { paramName: '&in_course_year_id=', paramValue: 0, id: 'in_course_year_id' },
  { paramName: '&in_group_section_id=', paramValue: 0, id: 'in_group_section_id' },
  { paramName: '&in_academic_year_id=', paramValue: 0, id: 'in_academic_year_id' },
  { paramName: '&in_regulation_id=', paramValue: 0, id: 'in_regulation_id' },
  { paramName: '&in_dept_id=', paramValue: 0, id: 'in_dept_id' },
  { paramName: '&in_isadmin=', paramValue: 0, id: 'in_isadmin' },
  { paramName: '&in_loginuser_empid=', paramValue: 0, id: 'in_loginuser_empid' },
  { paramName: '&in_loginuser_roleid=', paramValue: 0, id: 'in_loginuser_roleid' },
  { paramName: '&in_subject=', paramValue: '', id: 'in_subject' },
  { paramName: '&in_employee=', paramValue: '', id: 'in_employee' },
  { paramName: '&in_gm_codes=', paramValue: '', id: 'in_gm_codes' },
]

/** Parameter definitions for s_get_collegewisedetails_bycode */
export const PROC_COLLEGE_FILTERS: ProcParam[] = [
  { paramName: 'in_flag=', paramValue: 'clg_filters', id: 'in_flag' },
  { paramName: '&in_org_id=', paramValue: 1, id: 'in_org_id' },
  { paramName: '&in_college_id=', paramValue: 0, id: 'in_college_id' },
  { paramName: '&in_course_id=', paramValue: 0, id: 'in_course_id' },
  { paramName: '&in_course_group_id=', paramValue: 0, id: 'in_course_group_id' },
  { paramName: '&in_course_year_id=', paramValue: 0, id: 'in_course_year_id' },
  { paramName: '&in_group_section_id=', paramValue: 0, id: 'in_group_section_id' },
  { paramName: '&in_academic_year_id=', paramValue: 0, id: 'in_academic_year_id' },
  { paramName: '&in_dept_id=', paramValue: 0, id: 'in_dept_id' },
  { paramName: '&in_isadmin=', paramValue: 0, id: 'in_isadmin' },
  { paramName: '&in_loginuser_empid=', paramValue: 0, id: 'in_loginuser_empid' },
  { paramName: '&in_loginuser_roleid=', paramValue: 0, id: 'in_loginuser_roleid' },
  { paramName: '&in_subject=', paramValue: '', id: 'in_subject' },
  { paramName: '&in_employee=', paramValue: '', id: 'in_employee' },
  { paramName: '&in_gm_codes=', paramValue: '', id: 'in_gm_codes' },
]

/** Parameter definitions for s_get_exam_filters_bycode */
export const PROC_EXAM_FILTERS: ProcParam[] = [
  { paramName: 'in_flag=', paramValue: 'univ_exam_inep_filters', id: 'in_flag' },
  { paramName: '&in_flag_type=', paramValue: 'QUESTION_SETTER', id: 'in_flag_type' },
  { paramName: '&in_university_id=', paramValue: 0, id: 'in_university_id' },
  { paramName: '&in_course_id=', paramValue: 0, id: 'in_course_id' },
  { paramName: '&in_course_group_id=', paramValue: 0, id: 'in_course_group_id' },
  { paramName: '&in_course_year_id=', paramValue: 0, id: 'in_course_year_id' },
  { paramName: '&in_exam_id=', paramValue: 0, id: 'in_exam_id' },
  { paramName: '&in_academic_year_id=', paramValue: 0, id: 'in_academic_year_id' },
  { paramName: '&in_regulation_id=', paramValue: 0, id: 'in_regulation_id' },
  { paramName: '&in_subject_id=', paramValue: 0, id: 'in_subject_id' },
  { paramName: '&in_loginuser_empid=', paramValue: 0, id: 'in_loginuser_empid' },
  { paramName: '&in_loginuser_roleid=', paramValue: 0, id: 'in_loginuser_roleid' },
  { paramName: '&in_sub_flag_type=', paramValue: 'ALL', id: 'in_sub_flag_type' },
  { paramName: '&in_param1=', paramValue: 0, id: 'in_param1' },
  { paramName: '&in_param2=', paramValue: 'REGSUP', id: 'in_param2' },
]

/** Parameter definitions for s_get_examquestionpaper_details */
export const PROC_EXAM_QP_DETAILS: ProcParam[] = [
  { paramName: 'in_flag=', paramValue: 'list_exam_questionpaper_details', id: 'in_flag' },
  { paramName: '&in_orgid=', paramValue: 0, id: 'in_orgid' },
  { paramName: '&in_fdate=', paramValue: '1990-01-01', id: 'in_fdate' },
  { paramName: '&in_tdate=', paramValue: '1990-01-01', id: 'in_tdate' },
  { paramName: '&in_exam_questionpaper_template_id=', paramValue: 0, id: 'in_exam_questionpaper_template_id' },
  { paramName: '&in_exam_questionpaper_id=', paramValue: 0, id: 'in_exam_questionpaper_id' },
  { paramName: '&in_exam_month_yr=', paramValue: '', id: 'in_exam_month_yr' },
  { paramName: '&in_course_code=', paramValue: '', id: 'in_course_code' },
  { paramName: '&in_course_year_code=', paramValue: '', id: 'in_course_year_code' },
  { paramName: '&in_subject_code=', paramValue: '', id: 'in_subject_code' },
  { paramName: '&in_evalutor_profileid=', paramValue: 0, id: 'in_evalutor_profileid' },
  { paramName: '&in_exam_date=', paramValue: '1990-01-01', id: 'in_exam_date' },
  { paramName: '&in_regulation_code=', paramValue: '', id: 'in_regulation_code' },
  { paramName: '&in_emp_id=', paramValue: 0, id: 'in_emp_id' },
  { paramName: '&in_questionpaper_id=', paramValue: 0, id: 'in_questionpaper_id' },
  { paramName: '&in_evaluator_role_id=', paramValue: 0, id: 'in_evaluator_role_id' },
  { paramName: '&in_exam_evaluationassignment_id=', paramValue: 0, id: 'in_exam_evaluationassignment_id' },
  { paramName: '&in_exam_id=', paramValue: 0, id: 'in_exam_id' },
  { paramName: '&in_course_year_id=', paramValue: 0, id: 'in_course_year_id' },
  { paramName: '&in_regulation_id=', paramValue: 0, id: 'in_regulation_id' },
  { paramName: '&in_subject_id=', paramValue: 0, id: 'in_subject_id' },
]

/** Parameter definitions for s_pop_exam_questionpaper_details */
export const PROC_POP_EXAM_QP_DETAILS: ProcParam[] = [
  { paramName: 'in_flag=', paramValue: 'delete_question', id: 'in_flag' },
  { paramName: '&in_exam_evaluationassignment_id=', paramValue: 0, id: 'in_exam_evaluationassignment_id' },
  { paramName: '&in_questionpaper_marks_id=', paramValue: 0, id: 'in_questionpaper_marks_id' },
]

/** Parameter definitions for s_get_examevaluation_bycodes */
export const PROC_EXAM_EVALUATION: ProcParam[] = [
  { paramName: 'in_flag=', paramValue: 'univ_exam_inep_filters', id: 'in_flag' },
  { paramName: '&in_flag_type=', paramValue: 'QUESTION_SETTER', id: 'in_flag_type' },
  { paramName: '&in_university_id=', paramValue: 0, id: 'in_university_id' },
  { paramName: '&in_course_id=', paramValue: 0, id: 'in_course_id' },
  { paramName: '&in_course_group_id=', paramValue: 0, id: 'in_course_group_id' },
  { paramName: '&in_course_year_id=', paramValue: 0, id: 'in_course_year_id' },
  { paramName: '&in_exam_id=', paramValue: 0, id: 'in_exam_id' },
  { paramName: '&in_academic_year_id=', paramValue: 0, id: 'in_academic_year_id' },
  { paramName: '&in_regulation_id=', paramValue: 0, id: 'in_regulation_id' },
  { paramName: '&in_subject_id=', paramValue: 0, id: 'in_subject_id' },
  { paramName: '&in_loginuser_empid=', paramValue: 0, id: 'in_loginuser_empid' },
  { paramName: '&in_loginuser_roleid=', paramValue: 0, id: 'in_loginuser_roleid' },
  { paramName: '&in_sub_flag_type=', paramValue: 'ALL', id: 'in_sub_flag_type' },
  { paramName: '&in_param1=', paramValue: 0, id: 'in_param1' },
  { paramName: '&in_param2=', paramValue: 'REGSUP', id: 'in_param2' },
]

/**
 * Helper: build a query string from a proc constant array with overrides.
 *
 * @param params - The base proc param array (e.g. PROC_COLLEGE_FILTERS)
 * @param overrides - Object mapping param id to new value
 * @returns Query string (without leading ?)
 *
 * @example
 * buildProcQuery(PROC_COLLEGE_FILTERS, { in_org_id: 5, in_loginuser_empid: 123 })
 * // => "in_flag=clg_filters&in_org_id=5&in_college_id=0&..."
 */
export function buildProcQuery(
  params: ProcParam[],
  overrides: Record<string, string | number> = {},
): string {
  return params
    .map((p) => {
      const value = p.id in overrides ? overrides[p.id] : p.paramValue
      // Strip leading & from paramName for clean concatenation
      const cleanName = p.paramName.replace(/^&/, '')
      return `${cleanName}${value}`
    })
    .join('&')
}
