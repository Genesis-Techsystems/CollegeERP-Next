/**
 * Angular parity for four report screens:
 *  - `student-admission-reports/student-photo-signature-report`
 *  - `student-attendance-reports/course-delivery-plan-report`
 *  - `student-attendance-reports/course-delivary-tracking-report` (Angular folder typo kept)
 *  - `hr-reports/employee-count-drilldown-report`
 *
 * College/course/course-group/course-year/academic-year/regulation filters reuse
 * `getFeeMasterCollegeFilters` (`s_get_collegewisedetails_bycode`, `in_flag=clg_filters`) —
 * see `@/services/fee-masters`. This file only adds the section/subject cascade calls and
 * the report-specific procedures that don't exist elsewhere.
 */

import { DASHBOARD_API, MISC_REPORT_API } from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { getAllRecords } from "./crud";

type AnyRow = Record<string, unknown>;

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

function isNoRecordsError(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes("no record") ||
    msg.includes("no data") ||
    msg.includes("not found")
  );
}

function firstResultGroup(data: unknown): AnyRow[] {
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data[0] as unknown[]).filter(
        (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
      );
    }
    return data.filter(
      (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
    );
  }
  if (data && typeof data === "object") {
    const obj = data as AnyRow;
    if (Array.isArray(obj.result)) {
      const first = obj.result[0];
      if (Array.isArray(first)) {
        return (first as unknown[]).filter(
          (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
        );
      }
      return (obj.result as unknown[]).filter(
        (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
      );
    }
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
  }
  return [];
}

// ── Student Photo Signature Report ────────────────────────────────────────────
// Angular `studentSubjectReportUrl` (`s_get_std_sub_report`) with
// `in_flag=std_photo_sign_path`. Filters reuse `getFeeMasterCollegeFilters`.

export async function getStudentPhotoSignatureReport(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      procName(MISC_REPORT_API.STUDENT_SUBJECT_REPORT),
      {
        in_flag: "std_photo_sign_path",
        in_college_id: params.collegeId,
        in_course_id: params.courseId,
        in_course_group_id: params.courseGroupId,
        in_course_year_id: params.courseYearId,
        in_academic_year_id: params.academicYearId,
        in_batch_id: 0,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

// ── Course Delivery Plan / Tracking Report ────────────────────────────────────
// Angular `s_get_collegewisedetails_bycode` cascade — `clg_sec_filters` (sections)
// then `clg_cou_subject_filters` (subjects) — plus `s_get_subject_unit_topics` main report.

export async function getCourseDeliverySectionFilters(params: {
  orgId: number;
  employeeId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const {
    orgId,
    employeeId,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    academicYearId,
  } = params;
  if (
    !collegeId ||
    !courseId ||
    !courseGroupId ||
    !courseYearId ||
    !academicYearId
  ) {
    return [];
  }
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_sec_filters",
        in_org_id: orgId || 0,
        in_college_id: collegeId,
        in_course_id: courseId,
        in_course_group_id: courseGroupId,
        in_course_year_id: courseYearId,
        in_group_section_id: 0,
        in_academic_year_id: academicYearId,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: employeeId || 0,
        in_loginuser_roleid: 0,
        in_subject: "",
        in_employee: "",
        in_gm_codes: "",
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

export async function getCourseDeliverySubjectFilters(params: {
  orgId: number;
  employeeId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const {
    orgId,
    employeeId,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    groupSectionId,
    academicYearId,
  } = params;
  if (
    !collegeId ||
    !courseId ||
    !courseGroupId ||
    !courseYearId ||
    !groupSectionId ||
    !academicYearId
  ) {
    return [];
  }
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_cou_subject_filters",
        in_org_id: orgId || 0,
        in_college_id: collegeId,
        in_course_id: courseId,
        in_course_group_id: courseGroupId,
        in_course_year_id: courseYearId,
        in_group_section_id: groupSectionId,
        in_academic_year_id: academicYearId,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: employeeId || 0,
        in_loginuser_roleid: 0,
        in_subject: "",
        in_employee: "",
        in_gm_codes: "",
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Angular `Course_Delivery_Plan` / `Course_delivery_Tracking` flags — same SP. */
export type CourseDeliveryReportFlag =
  | "Course_Delivery_Plan"
  | "Course_delivery_Tracking";

export async function getCourseDeliveryReport(params: {
  flag: CourseDeliveryReportFlag;
  orgId: number;
  universityId: number;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  academicYearId: number;
  regulationId: number;
  subjectId: number;
  employeeId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      procName(MISC_REPORT_API.SUBJECT_UNIT_TOPICS_REPORT),
      {
        in_flag: params.flag,
        in_org_id: params.orgId || 0,
        // Angular localStorage key is `univeristyId` (typo) — kept in the page layer.
        in_university_id: params.universityId || 0,
        in_college_id: params.collegeId,
        in_course_id: params.courseId,
        in_course_group_id: params.courseGroupId,
        in_course_year_id: params.courseYearId,
        in_group_section_id: params.groupSectionId,
        in_academic_year_id: params.academicYearId,
        in_timetable_id: 0,
        in_timetable_schedule_id: 0,
        in_regulation_id: params.regulationId,
        in_subject_id: params.subjectId,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: params.employeeId || 0,
        in_loginuser_roleid: 0,
        in_gm_codes: "",
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

// ── Employee Count Drilldown Report ───────────────────────────────────────────
// Angular `facultyCounturl` (`s_rep_emp_details`) via `listByThreeIds`
// (`in_flag`, `in_college_id`, `in_dept`).

export type EmployeeDrilldownFlag =
  | "Total_Count_of_employees"
  | "Total_Count_of_employees_by_college"
  | "Emp_details_of_deptid";

export async function getEmployeeCountDrilldown(params: {
  flag: EmployeeDrilldownFlag;
  collegeId: number;
  deptId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      procName(DASHBOARD_API.FACULTY_COUNT),
      {
        in_flag: params.flag,
        in_college_id: params.collegeId,
        in_dept: params.deptId,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}
