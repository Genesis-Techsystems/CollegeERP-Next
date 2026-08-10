/**
 * Angular `reports/student-admission-reports/*` — thin wrappers over existing Spring procs.
 * Param names match Angular `getDetailsByRequest` exactly.
 */

import { DASHBOARD_API, MISC_REPORT_API, SYLLABUS_API } from "@/config/constants/api";
import { getAllRecords } from "./crud";

type AnyRow = Record<string, unknown>;
type ProcEnvelope = { result?: unknown[][] };

function firstResultGroup(data: ProcEnvelope | null | undefined): AnyRow[] {
  const groups = Array.isArray(data?.result) ? data.result : [];
  const first = groups[0];
  return Array.isArray(first) ? (first as AnyRow[]) : [];
}

/** Angular enquiries-report → `s_get_enquiry_application_summary`. */
export async function getEnquiryApplicationSummary(params: {
  collegeId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.fromDate || !params.toDate) return [];
  const data = await getAllRecords<ProcEnvelope>(
    MISC_REPORT_API.ENQUIRY_APP_SUMMARY,
    {
      to_enq_date: params.toDate,
      from_enq_date: params.fromDate,
      in_clg_id: params.collegeId,
    },
  );
  return firstResultGroup(data);
}

/** Angular student-academic-history-report → `s_get_std_academic_historyreport`. */
export async function getStdAcademicHistoryReport(params: {
  collegeId: number;
  courseId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId) return [];
  const data = await getAllRecords<ProcEnvelope>(
    MISC_REPORT_API.STD_ACADEMIC_HISTORY,
    {
      in_clg_id: params.collegeId,
      in_course_id: params.courseId,
      in_ayear_id: params.academicYearId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_std_id: 0,
    },
  );
  return firstResultGroup(data);
}

/** Angular students-lab-batches-report → `s_get_std_labbatches`. */
export async function getStdLabBatchesReport(params: {
  collegeId: number;
  courseId: number;
  academicYearId: number;
  courseGroupId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId) return [];
  const data = await getAllRecords<ProcEnvelope>(MISC_REPORT_API.STD_LAB_BATCHES, {
    in_clg_id: params.collegeId,
    in_course_id: params.courseId,
    in_ayear_id: params.academicYearId,
    in_course_group_id: params.courseGroupId,
    in_course_year_id: params.courseYearId,
    in_stdbatch_id: 0,
  });
  return firstResultGroup(data);
}

/**
 * Angular student-electives-report → `s_get_std_electives`
 * (only `in_clg_id` + `in_course_year_id` — not the enrollment-screen param shape).
 */
export async function getStdElectivesReport(params: {
  collegeId: number;
  courseYearId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.courseYearId) return [];
  const data = await getAllRecords<ProcEnvelope>(
    MISC_REPORT_API.GET_STD_ELECTIVES,
    {
      in_clg_id: params.collegeId,
      in_course_year_id: params.courseYearId,
    },
  );
  return firstResultGroup(data);
}

/** Angular class-syllabus-status-report → `s_get_classwise_syllabus_status`. */
export async function getClasswiseSyllabusStatus(params: {
  collegeId: number;
  academicYearId: number;
  courseYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId) return [];
  const data = await getAllRecords<ProcEnvelope>(
    SYLLABUS_API.GET_CLASSWISE_STATUS,
    {
      in_clg_id: params.collegeId,
      in_ayear_id: params.academicYearId,
      in_course_year_id: params.courseYearId,
      in_group_section_id: params.groupSectionId,
    },
  );
  return firstResultGroup(data);
}

/** Angular subject-wise-syllabus-report → `s_subject_syllabus_plan_report`. */
export async function getSubjectWiseSyllabusReport(params: {
  collegeId: number;
  subjectId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId) return [];
  const data = await getAllRecords<ProcEnvelope>(SYLLABUS_API.PLAN_REPORT, {
    in_college_id: params.collegeId,
    in_subject_id: params.subjectId,
  });
  return firstResultGroup(data);
}

/**
 * Angular subject-wise-syllabus-report subject cascade →
 * `s_get_collegewisedetails_bycode` with `in_flag=clg_cou_subject_filters`.
 */
export async function getCourseSubjectFilters(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  if (
    !params.collegeId ||
    !params.courseId ||
    !params.courseGroupId ||
    !params.courseYearId ||
    !params.groupSectionId ||
    !params.academicYearId
  ) {
    return [];
  }
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
  const data = await getAllRecords<ProcEnvelope>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_cou_subject_filters",
      in_org_id: orgId || 0,
      in_college_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_group_section_id: params.groupSectionId,
      in_academic_year_id: params.academicYearId,
      in_regulation_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: empId || 0,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: "",
    },
  );
  return firstResultGroup(data);
}

/** Angular daily-smscommunication-detail-report → `s_get_sms_summary`. */
export async function getSmsSummaryReport(params: {
  collegeId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.fromDate || !params.toDate) return [];
  const data = await getAllRecords<ProcEnvelope>(MISC_REPORT_API.SMS_SUMMARY, {
    in_from_date: params.fromDate,
    in_to_date: params.toDate,
    in_clg_id: params.collegeId,
  });
  return firstResultGroup(data);
}

/**
 * Angular studentcount-drilldown-report → `s_rep_std_details`
 * Flags: std_details_college | std_details_course | std_details_course_group |
 *        std_details_course_year | std_details_students
 */
export async function getStudentCountDrilldown(params: {
  flag: string;
  collegeId?: number;
  academicYear?: string;
  courseId?: number;
  courseGroupId?: number;
  courseYearId?: number;
  employeeId?: number;
}): Promise<AnyRow[]> {
  const empId =
    params.employeeId ??
    Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);
  const data = await getAllRecords<ProcEnvelope>(DASHBOARD_API.STUDENTS_COUNT, {
    in_flag: params.flag,
    in_college_id: params.collegeId ?? 0,
    in_academic_year: params.academicYear ?? "",
    in_course_id: params.courseId ?? 0,
    in_course_group_id: params.courseGroupId ?? 0,
    in_course_year_id: params.courseYearId ?? 0,
    in_loginuser_empid: empId,
    in_student_id: 0,
  });
  return firstResultGroup(data);
}
