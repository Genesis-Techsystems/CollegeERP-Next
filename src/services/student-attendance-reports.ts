/**
 * Angular `reports/student-attendance-reports/*` — list wrappers.
 * Reuses `getAllRecords` / `studentsList` / college filter SP (no new backend APIs).
 */

import { getAllRecords, fetchDetails } from "./crud";

export type AttendanceReportRow = Record<string, unknown>;

type AnyRow = AttendanceReportRow;

function storageNum(key: string): number {
  if (typeof globalThis.localStorage === "undefined") return 0;
  const n = Number(globalThis.localStorage.getItem(key) ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asResultSets(data: unknown): AnyRow[][] {
  if (!data || typeof data !== "object") return [];
  const result = (data as { result?: unknown }).result;
  if (!Array.isArray(result)) return [];
  if (result.length > 0 && Array.isArray(result[0])) {
    return result.map((g) =>
      Array.isArray(g)
        ? g.filter((r): r is AnyRow => !!r && typeof r === "object")
        : [],
    );
  }
  if (result.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
    return [result as AnyRow[]];
  }
  return [];
}

function firstResultSet(data: unknown): AnyRow[] {
  return asResultSets(data)[0] ?? [];
}

function emptyOnNoRecord(error: unknown): null {
  const msg = String(error instanceof Error ? error.message : (error ?? ""));
  if (msg.toLowerCase().includes("no record")) return null;
  throw error;
}

/** Angular attendance reports — `cls_timtable_filters` with empty `in_gm_codes`. */
export async function fetchAttendanceReportFilterRows(): Promise<AnyRow[]> {
  const orgId = storageNum("organizationId");
  const employeeId = storageNum("employeeId");
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "cls_timtable_filters",
        in_org_id: orgId,
        in_college_id: 0,
        in_course_id: 0,
        in_course_group_id: 0,
        in_course_year_id: 0,
        in_group_section_id: 0,
        in_academic_year_id: 0,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: employeeId,
        in_loginuser_roleid: 0,
        in_employee: "",
        in_subject: "",
        in_gm_codes: "",
      },
    );
    const sets = asResultSets(data);
    for (const group of sets) {
      if (
        group.length > 0 &&
        String(group[0]?.flag ?? "") === "cls_timtable_filters"
      ) {
        return group;
      }
    }
    return sets.flat();
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/** Angular subject-wise — `clg_cou_subject_filters` on same SP. */
export async function fetchAttendanceSubjectFilterRows(params: {
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  const orgId = storageNum("organizationId");
  const employeeId = storageNum("employeeId");
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_cou_subject_filters",
        in_org_id: orgId,
        in_college_id: params.collegeId,
        in_course_id: params.courseId,
        in_course_group_id: params.courseGroupId,
        in_course_year_id: params.courseYearId,
        in_group_section_id: params.groupSectionId,
        in_academic_year_id: params.academicYearId,
        in_dept_id: 0,
        in_isadmin: 0,
        in_loginuser_empid: employeeId,
        in_loginuser_roleid: 0,
        in_subject: "",
        in_employee: "",
        in_gm_codes: "",
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/** Angular `dialyAttedanceReportUrl` → `s_rep_tt_std_attendance_Daily`. */
export async function fetchDailyAttendancePeriodWiseReport(params: {
  collegeId: number;
  academicYearId: number;
  courseYearId: number;
  courseGroupId: number;
  sectionId: number;
  clsDate: string;
}): Promise<{ rows: AnyRow[]; summary: AnyRow[] }> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_rep_tt_std_attendance_Daily",
      {
        in_collegeId: params.collegeId,
        in_academic_year_id: params.academicYearId,
        in_course_year_id: params.courseYearId,
        in_course_group_id: params.courseGroupId,
        in_sectionId: params.sectionId,
        in_studentId: 0,
        in_empId: 0,
        in_clsDate: params.clsDate,
      },
    );
    const sets = asResultSets(data);
    return { rows: sets[0] ?? [], summary: sets[1] ?? [] };
  } catch (error) {
    return emptyOnNoRecord(error) ?? { rows: [], summary: [] };
  }
}

/** Angular `studentAttendancePercentageReportUrl` → `s_rep_tt_std_attendance_per`. */
export async function fetchStudentAttendancePercentageReport(params: {
  collegeId: number;
  courseYearId: number;
  courseGroupId: number;
  academicYearId: number;
  sectionId: number;
  fromPercentage: number;
  toPercentage: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_rep_tt_std_attendance_per",
      {
        in_collegeId: params.collegeId,
        in_course_year_id: params.courseYearId,
        in_course_group_id: params.courseGroupId,
        in_academic_year_id: params.academicYearId,
        in_sectionId: params.sectionId,
        in_studentId: 0,
        in_empId: 0,
        in_from_percentage: params.fromPercentage,
        in_to_percentage: params.toPercentage,
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/** Angular `subjectWiseAttedanceReportUrl` → `s_rep_tt_std_subwise_attendance`. */
export async function fetchSubjectWiseAttendanceReport(params: {
  collegeId: number;
  courseYearId: number;
  courseGroupId: number;
  academicYearId: number;
  sectionId: number;
  fromDate: string;
  toDate: string;
  subjectId: number;
  fromPercentage: number;
  toPercentage: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_rep_tt_std_subwise_attendance",
      {
        in_collegeId: params.collegeId,
        in_course_year_id: params.courseYearId,
        in_course_group_id: params.courseGroupId,
        in_academic_year_id: params.academicYearId,
        in_sectionId: params.sectionId,
        in_studentId: 0,
        in_empId: 0,
        in_frm_clsDate: params.fromDate,
        in_to_clsDate: params.toDate,
        in_subjectId: params.subjectId,
        in_from_percentage: params.fromPercentage,
        in_to_percentage: params.toPercentage,
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/** Angular `studentAttedanceReportUrl` → `s_rep_tt_std_daywise_attendance`. */
export async function fetchStudentAttendanceDaywiseReport(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  sectionId: number;
  studentId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_rep_tt_std_daywise_attendance",
      {
        in_collegeId: params.collegeId,
        in_academic_year_id: params.academicYearId,
        in_course_id: params.courseId,
        in_course_group_id: params.courseGroupId,
        in_course_year_id: params.courseYearId,
        in_sectionId: params.sectionId,
        in_studentId: params.studentId,
        in_empId: 0,
        in_frm_clsDate: params.fromDate,
        in_to_clsDate: params.toDate,
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/**
 * Angular student-attendance-report students dropdown:
 * `studentsList?collegeId=&courseGroupId=&groupSectionId=`
 */
export async function fetchAttendanceReportStudents(params: {
  collegeId: number;
  courseGroupId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.courseGroupId || !params.groupSectionId) {
    return [];
  }
  try {
    const data = await fetchDetails<unknown>("studentsList", {
      collegeId: params.collegeId,
      courseGroupId: params.courseGroupId,
      groupSectionId: params.groupSectionId,
    });
    if (Array.isArray(data)) return data as AnyRow[];
    if (data && typeof data === "object") {
      const o = data as AnyRow;
      if (Array.isArray(o.resultList)) return o.resultList as AnyRow[];
      if (Array.isArray(o.content)) return o.content as AnyRow[];
      if (Array.isArray(o.result)) return o.result as AnyRow[];
    }
    return [];
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/**
 * Angular `getDailyAttendanceReportUrl` → `s_get_daily_attendance_report`
 * (Daily Attendance of Students / student-daily-attendance-count-report).
 */
export async function fetchDailyAttendanceOfStudentsReport(params: {
  collegeId: number;
  courseId: number;
  academicYearId: number;
  attendanceDate: string;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      "s_get_daily_attendance_report",
      {
        in_college_id: params.collegeId,
        in_course_id: params.courseId,
        in_academic_year_id: params.academicYearId,
        in_attendance_date: params.attendanceDate,
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}
