import { EXAM_API } from "@/config/constants/api";
import { domainUpdate, getAllRecords, postDetails } from "@/services/crud";

type AnyRow = Record<string, any>;

export async function getExamLabTimetableFilters(
  empId: number,
): Promise<AnyRow[]> {
  const data = await getAllRecords<{
    result?: AnyRow[][];
    data?: { result?: AnyRow[][] };
  }>("s_get_exam_filters_bycode", {
    in_flag: "univ_exam_filters",
    in_flag_type: "ALL",
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: 0,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: 0,
    in_academic_year_id: 0,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: empId,
    in_loginuser_roleid: 0,
    in_sub_flag_type: "ALL",
    in_param1: 0,
    in_param2: 0,
  });
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][];
  return Array.isArray(result) ? result.flat() : [];
}

export async function getExamLabTimetableRestFilters(params: {
  courseId: number;
  examId: number;
  academicYearId: number;
  empId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{
    result?: AnyRow[][];
    data?: { result?: AnyRow[][] };
  }>("s_get_exam_filters_bycode", {
    in_flag: "univ_exam_rest_no_tt",
    in_flag_type: "ALL",
    in_university_id: 0,
    in_college_id: 0,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: 0,
    in_exam_id: params.examId,
    in_academic_year_id: params.academicYearId,
    in_regulation_id: 0,
    in_subject_id: 0,
    in_loginuser_empid: params.empId,
    in_loginuser_roleid: 0,
    in_sub_flag_type: "ALL",
    in_param1: 0,
    in_param2: 0,
  });
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][];
  return Array.isArray(result) ? result.flat() : [];
}

export async function getExamLabTimetableGrid(params: {
  orgId: number;
  collegeId: number;
  courseId: number;
  courseYearId: number;
  examId: number;
  empId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{
    result?: AnyRow[][];
    data?: { result?: AnyRow[][] };
  }>(EXAM_API.COLLEGE_WISE_LAB_DETAILS, {
    in_flag: "view_timetable",
    in_org_id: params.orgId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId,
    in_group_section_id: 0,
    in_academic_year_id: 0,
    in_dept_id: 0,
    in_isadmin: 0,
    in_exam_id: params.examId,
    in_loginuser_empid: params.empId,
    in_loginuser_roleid: 0,
    in_employee: "",
    in_subject: "",
    in_gm_codes: "",
  });
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][];
  return Array.isArray(result) ? (result[0] ?? []) : [];
}

export async function getLabCreateFilters(params: {
  orgId: number;
  collegeId: number;
  courseId: number;
  courseYearId: number;
  academicYearId: number;
  examId: number;
  empId: number;
}): Promise<{ details: AnyRow[]; sessions: AnyRow[] }> {
  const data = await getAllRecords<{
    result?: AnyRow[][];
    data?: { result?: AnyRow[][] };
  }>(EXAM_API.COLLEGE_WISE_LAB_DETAILS, {
    in_flag: "clg_exam_labsubject_filters",
    in_org_id: params.orgId,
    in_college_id: params.collegeId,
    in_course_id: params.courseId,
    in_course_group_id: 0,
    in_course_year_id: params.courseYearId,
    in_group_section_id: 0,
    in_academic_year_id: params.academicYearId,
    in_dept_id: 0,
    in_isadmin: 0,
    in_exam_id: params.examId,
    in_loginuser_empid: params.empId,
    in_loginuser_roleid: 0,
    in_employee: "",
    in_subject: "",
    in_gm_codes: "",
  });
  const result = (data?.result ?? data?.data?.result ?? []) as AnyRow[][];
  return {
    details: Array.isArray(result) ? (result[0] ?? []) : [],
    sessions: Array.isArray(result) ? (result[1] ?? []) : [],
  };
}

export async function saveExamLabTimetableBatches(
  rows: AnyRow[],
): Promise<any> {
  try {
    return await postDetails("addexamTimetableLabBatches", rows);
  } catch {
    return postDetails("addexamtimetablelabbatches", rows);
  }
}

/**
 * Angular `updateDetails(ExamTimetableLabBatches, obj, id, 'examTimetableLabBatchId')`
 * → PUT domain/update/ExamTimetableLabBatches?query=examTimetableLabBatchId=={id}
 */
export async function updateExamLabTimetableBatch(
  examTimetableLabBatchId: number,
  payload: AnyRow,
): Promise<AnyRow> {
  return domainUpdate<AnyRow>(
    EXAM_API.EXAM_TIMETABLE_LAB_BATCHES,
    "examTimetableLabBatchId",
    examTimetableLabBatchId,
    payload,
  );
}

/**
 * Angular Check Conflicts:
 * `s_get_collegeexamdetails_bycode` with `in_flag=exam_student_timetable_validation`
 * (collegeId hardcoded 0, exam_date=1990-01-01 — Angular parity).
 */
export async function getExamLabTimetableConflicts(params: {
  orgId: number;
  academicYearId: number;
  examId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<{ result?: AnyRow[][] }>(
    "s_get_collegeexamdetails_bycode",
    {
      in_flag: "exam_student_timetable_validation",
      in_org_id: params.orgId,
      in_college_id: 0,
      in_academic_year_id: params.academicYearId,
      in_isadmin: 0,
      in_exam_id: params.examId,
      in_timetable_id: 0,
      in_exam_date: "1990-01-01",
      in_subject_id: 0,
      in_loginuser_empid: 0,
      in_loginuser_roleid: 0,
    },
  );
  const groups = (data?.result ?? []) as AnyRow[][];
  return Array.isArray(groups[0]) ? groups[0].filter(Boolean) : [];
}
