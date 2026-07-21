// Stored-proc param template ported verbatim from Angular `proc-constants.ts`
// (PROCCONSTANTS.s_get_examquestionpaper_details_new). Each entry carries the
// paramName (with its `=`/`&` separator baked in), a default paramValue, and an
// `id` used to match runtime overrides in `apiProc`.

export type ProcTemplateParam = {
  paramName: string;
  paramValue: string | number;
  id: string;
};

/** s_get_examquestionpaper_details_new */
export const S_GET_EXAMQUESTIONPAPER_DETAILS_NEW: ProcTemplateParam[] = [
  { paramName: "in_flag=", paramValue: "list_exam_questionpaper_draftmarks_new", id: "in_flag" },
  { paramName: "&in_orgid=", paramValue: 0, id: "in_orgid" },
  { paramName: "&in_fdate=", paramValue: "1990-01-01", id: "in_fdate" },
  { paramName: "&in_tdate=", paramValue: "1990-01-01", id: "in_tdate" },
  { paramName: "&in_exam_questionpaper_template_id=", paramValue: 0, id: "in_exam_questionpaper_template_id" },
  { paramName: "&in_exam_questionpaper_id=", paramValue: 0, id: "in_exam_questionpaper_id" },
  { paramName: "&in_evalutor_profileid=", paramValue: 0, id: "in_evalutor_profileid" },
  { paramName: "&in_exam_date=", paramValue: "1990-01-01", id: "in_exam_date" },
  { paramName: "&in_emp_id=", paramValue: 0, id: "in_emp_id" },
  { paramName: "&in_questionpaper_id=", paramValue: 0, id: "in_questionpaper_id" },
  { paramName: "&in_evaluator_role_id=", paramValue: 0, id: "in_evaluator_role_id" },
  { paramName: "&in_exam_evaluationassignment_id=", paramValue: 0, id: "in_exam_evaluationassignment_id" },
  { paramName: "&in_exam_id=", paramValue: 0, id: "in_exam_id" },
  { paramName: "&in_course_year_id=", paramValue: 0, id: "in_course_year_id" },
  { paramName: "&in_regulation_id=", paramValue: 0, id: "in_regulation_id" },
  { paramName: "&in_subject_id=", paramValue: 0, id: "in_subject_id" },
];
