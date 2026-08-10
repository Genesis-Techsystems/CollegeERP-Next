/**
 * Angular `reports/student-attendance-reports/*` (routes under
 * `/reports/admin-attendance-reports/*`) — thin wrappers over existing Spring procs.
 * Query param names match Angular exactly.
 */

import {
  ATTENDANCE_API,
  COUNSELOR_API,
  MENTORSHIP_API,
  NEXT_API,
} from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { fetchDetails, getAllRecords } from "./crud";

type AnyRow = Record<string, unknown>;
type ProcEnvelope = { result?: unknown[][] };

export type AttendanceFiltersResult = {
  filtersData: AnyRow[];
  academicData: AnyRow[];
  departmentData: AnyRow[];
  /** `clg_subject_filters` / course-subject rows (kept separate from college filters). */
  subjectData: AnyRow[];
};

function firstResultGroup(data: ProcEnvelope | null | undefined): AnyRow[] {
  const groups = Array.isArray(data?.result) ? data.result : [];
  const first = groups[0];
  return Array.isArray(first) ? (first as AnyRow[]) : [];
}

function splitAttendanceFilterGroups(groups: AnyRow[][]): AttendanceFiltersResult {
  let filtersData: AnyRow[] = [];
  let academicData: AnyRow[] = [];
  let departmentData: AnyRow[] = [];
  let subjectData: AnyRow[] = [];

  for (const group of groups) {
    if (!Array.isArray(group) || group.length === 0) continue;
    const first = group[0] ?? {};
    const flag = String(first.flag ?? "")
      .trim()
      .toLowerCase();
    if (first.clg_filters_ay === "clg_filters_ay") {
      academicData = group;
      continue;
    }
    if (flag === "clg_dept_filters" || flag.includes("dept_filters")) {
      departmentData = group;
      continue;
    }
    if (
      flag === "clg_subject_filters" ||
      flag.includes("cou_subject") ||
      (flag.includes("subject_filters") && !flag.includes("timtable"))
    ) {
      subjectData = group;
      // Faculty-subjects report uses subject-filter rows as the college source too.
      if (filtersData.length === 0) filtersData = group;
      continue;
    }
    if (
      flag === "clg_filters" ||
      flag === "cls_timtable_filters" ||
      flag.includes("timtable") ||
      flag.includes("timetable")
    ) {
      // Prefer classic clg_filters when present; otherwise take first class set.
      if (flag === "clg_filters" || filtersData.length === 0) {
        filtersData = group;
      }
    }
  }

  if (filtersData.length === 0) {
    const fallback = groups.find(
      (g) =>
        Array.isArray(g) &&
        g.length > 0 &&
        g[0]?.clg_filters_ay !== "clg_filters_ay",
    );
    if (fallback) filtersData = fallback;
  }

  return { filtersData, academicData, departmentData, subjectData };
}

async function collegeWiseByFlag(
  orgId: number,
  employeeId: number,
  inFlag: string,
): Promise<AttendanceFiltersResult> {
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: inFlag,
      in_org_id: orgId || 0,
      in_college_id: 0,
      in_course_id: 0,
      in_course_group_id: 0,
      in_course_year_id: 0,
      in_group_section_id: 0,
      in_academic_year_id: 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: "",
    },
  );
  const groups = Array.isArray(data?.result) ? data.result : [];
  return splitAttendanceFilterGroups(groups);
}

/** Timetable / class cascade filters (`cls_timtable_filters`). */
export async function getAttendanceTimetableFilters(
  orgId: number,
  employeeId: number,
) {
  return collegeWiseByFlag(orgId, employeeId, "cls_timtable_filters");
}

/** College + department filters. */
export async function getAttendanceCollegeDeptFilters(
  orgId: number,
  employeeId: number,
) {
  return collegeWiseByFlag(orgId, employeeId, "clg_filters,clg_dept_filters");
}

/** College + department + subject filters. */
export async function getAttendanceCollegeDeptSubjectFilters(
  orgId: number,
  employeeId: number,
) {
  return collegeWiseByFlag(
    orgId,
    employeeId,
    "clg_filters,clg_dept_filters,clg_subject_filters",
  );
}

/** Subject-only college filters. */
export async function getAttendanceSubjectFilters(
  orgId: number,
  employeeId: number,
) {
  return collegeWiseByFlag(orgId, employeeId, "clg_subject_filters");
}

/**
 * Course/subject filters for subject-wise faculty attendance.
 * Angular `selectedSection` passes cascade IDs (All=0 allowed).
 */
export async function getAttendanceCourseSubjectFilters(
  orgId: number,
  employeeId: number,
  cascade?: {
    collegeId?: number;
    courseId?: number;
    courseGroupId?: number;
    courseYearId?: number;
    groupSectionId?: number;
    academicYearId?: number;
  },
): Promise<AttendanceFiltersResult> {
  if (!cascade) {
    return collegeWiseByFlag(orgId, employeeId, "clg_cou_subject_filters");
  }
  const data = await getAllRecords<{ result: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_cou_subject_filters",
      in_org_id: orgId || 0,
      in_college_id: cascade.collegeId ?? 0,
      in_course_id: cascade.courseId ?? 0,
      in_course_group_id: cascade.courseGroupId ?? 0,
      in_course_year_id: cascade.courseYearId ?? 0,
      in_group_section_id: cascade.groupSectionId ?? 0,
      in_academic_year_id: cascade.academicYearId ?? 0,
      in_dept_id: 0,
      in_isadmin: 0,
      in_loginuser_empid: employeeId || 0,
      in_loginuser_roleid: 0,
      in_subject: "",
      in_employee: "",
      in_gm_codes: "",
    },
  );
  const groups = Array.isArray(data?.result) ? data.result : [];
  const split = splitAttendanceFilterGroups(groups);
  // Angular uses result[0] as the subject list when flag rows are absent.
  if (split.subjectData.length === 0) {
    split.subjectData = firstResultGroup(data);
  }
  return split;
}

async function downloadProcExcel(
  pathConstant: string,
  params: Record<string, string | number>,
  fileName: string,
): Promise<void> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    qs.set(k, String(v ?? ""));
  }
  const res = await fetch(`${NEXT_API.PROXY(pathConstant)}?${qs}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getErrorMessage(body) || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Mentor Fortnight → `s_get_counselor_report` */
export async function getMentorFortnightReport(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  fromDate: string;
  toDate: string;
  fromPercentage: number;
  toPercentage: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId) return [];
  const data = await getAllRecords<ProcEnvelope>(COUNSELOR_API.FORTNIGHT_REPORT, {
    in_collegeId: params.collegeId,
    in_academicYearId: params.academicYearId,
    in_courseId: params.courseId,
    in_CoursegroupId: params.courseGroupId,
    in_courseYearId: params.courseYearId,
    in_Section: 0,
    in_CounselorId: 0,
    in_fdate: params.fromDate,
    in_tdate: params.toDate,
    in_from_percentage: params.fromPercentage,
    in_to_percentage: params.toPercentage,
  });
  return firstResultGroup(data);
}

export async function downloadMentorFortnightReport(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  fromDate: string;
  toDate: string;
  fromPercentage: number;
  toPercentage: number;
}): Promise<void> {
  await downloadProcExcel(
    COUNSELOR_API.FORTNIGHT_DOWNLOAD,
    {
      in_collegeId: params.collegeId,
      in_academicYearId: params.academicYearId,
      in_courseId: params.courseId,
      in_CoursegroupId: params.courseGroupId,
      in_courseYearId: params.courseYearId,
      in_Section: 0,
      in_CounselorId: 0,
      in_fdate: params.fromDate,
      in_tdate: params.toDate,
      in_from_percentage: params.fromPercentage,
      in_to_percentage: params.toPercentage,
    },
    "Mentor Fortnight Report.xls",
  );
}

/** Counselor Activity → `s_get_counselor_Activity_report` */
export async function getCounselorActivityReport(params: {
  collegeId: number;
  departmentId: number;
  attendanceDate: string;
  zeroCounselling: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.attendanceDate) return [];
  const data = await getAllRecords<ProcEnvelope>(COUNSELOR_API.ACTIVITY_REPORT, {
    in_college_id: params.collegeId,
    in_emp_dept_id: params.departmentId,
    in_attendance_date: params.attendanceDate,
    in_zero_counselling: params.zeroCounselling,
  });
  return firstResultGroup(data);
}

export async function downloadCounselorActivityReport(params: {
  collegeId: number;
  departmentId: number;
  attendanceDate: string;
  zeroCounselling: number;
}): Promise<void> {
  await downloadProcExcel(
    COUNSELOR_API.ACTIVITY_REPORT_DOWNLOAD,
    {
      in_college_id: params.collegeId,
      in_emp_dept_id: params.departmentId,
      in_attendance_date: params.attendanceDate,
      in_zero_counselling: params.zeroCounselling,
    },
    "Counselor Activity Report.xls",
  );
}

/** Employee / Faculty Subjects Attendance → `s_get_emp_attendance_report` */
export async function getEmpAttendanceReport(params: {
  collegeId: number;
  departmentId: number;
  subjectId: number;
  fromDate: string;
  toDate: string;
  employeeId?: number;
}): Promise<AnyRow[]> {
  if (!params.fromDate || !params.toDate) return [];
  const data = await getAllRecords<ProcEnvelope>(
    ATTENDANCE_API.EMP_ATTENDANCE_REPORT,
    {
      in_clg_id: params.collegeId,
      in_dept_id: params.departmentId,
      in_subject_id: params.subjectId,
      in_from_Date: params.fromDate,
      in_to_Date: params.toDate,
      in_emp_id: params.employeeId ?? 0,
    },
  );
  return firstResultGroup(data);
}

/** Employee Attendance Summary → `s_get_emp_attendance_summary_report` */
export async function getEmpAttendanceSummaryReport(params: {
  collegeId: number;
  departmentId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.fromDate || !params.toDate) return [];
  const data = await getAllRecords<ProcEnvelope>(
    ATTENDANCE_API.EMP_ATTENDANCE_SUMMARY_REPORT,
    {
      in_clg_id: params.collegeId,
      in_dept_id: params.departmentId,
      in_from_Date: params.fromDate,
      in_to_Date: params.toDate,
    },
  );
  return firstResultGroup(data);
}

/** Subject-wise Faculty Attendance → `s_rep_tt_std_subwise_attendance` */
export async function getSubjectWiseFacultyAttendanceReport(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  sectionId: number;
  courseGroupId: number;
  courseYearId: number;
  subjectId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.fromDate || !params.toDate) return [];
  const data = await getAllRecords<ProcEnvelope>(
    ATTENDANCE_API.SUBJECT_WISE_FACULTY_ATTENDANCE,
    {
      in_collegeId: params.collegeId,
      in_academic_year_id: params.academicYearId,
      in_course_id: params.courseId,
      in_sectionId: params.sectionId,
      in_studentId: 0,
      in_empId: 0,
      in_frm_clsDate: params.fromDate,
      in_to_clsDate: params.toDate,
      in_course_group_id: params.courseGroupId,
      in_course_year_id: params.courseYearId,
      in_subjectId: params.subjectId,
      in_from_percentage: 0,
      in_to_percentage: 100,
    },
  );
  return firstResultGroup(data);
}

/** Day-wise Attendance Summary → `s_get_daywise_std_attendance_summary` */
export async function getDayWiseStdAttendanceSummary(params: {
  classDate: string;
  collegeId: number;
  courseId: number;
  academicYearId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId || !params.classDate) return [];
  const data = await getAllRecords<ProcEnvelope>(
    ATTENDANCE_API.GET_DAYWISE_STD_ATTENDANCE,
    {
      in_cls_date: params.classDate,
      in_clg_id: params.collegeId,
      in_course_year_id: 0,
      in_course_id: params.courseId,
      in_ayear_id: params.academicYearId,
    },
  );
  return firstResultGroup(data);
}

/** Course-wise Students Attendance → `s_get_classwise_std_attendance_summary` */
export async function getCourseWiseStudentsAttendanceReport(params: {
  month: string;
  year: string | number;
  collegeId: number;
  courseId: number;
  courseYearId: number;
  sectionId: number;
  courseGroupId: number;
}): Promise<AnyRow[]> {
  if (!params.collegeId) return [];
  const data = await getAllRecords<ProcEnvelope>(
    ATTENDANCE_API.GET_CLASSWISE_STD_ATTENDANCE,
    {
      in_month: params.month,
      in_year: params.year,
      in_clg_id: params.collegeId,
      in_academic_year_id: 0,
      in_course_year_id: params.courseYearId,
      in_course_id: params.courseId,
      in_section_id: params.sectionId,
      in_course_group_id: params.courseGroupId,
    },
  );
  return firstResultGroup(data);
}

/** Parent Teacher Meeting → `s_get_counselor_summary` */
export async function getParentTeacherMeetingReport(params: {
  fromActivityDate: string;
  toActivityDate: string;
  employeeId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords<ProcEnvelope>(COUNSELOR_API.GET_SUMMARY, {
    in_from_activity_date: params.fromActivityDate,
    in_to_activity_date: params.toActivityDate,
    in_emp_id: params.employeeId,
  });
  return firstResultGroup(data);
}

/** Angular `momentFormatYMD` → `YYYY/MM/DD` for counselormappings date params. */
function toCounselorMappingsYmd(value: string): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return s;
}

/**
 * Class & Student Wise PTM → `counselormappings?studentId=&collegeId=&toDate=&fromDate=`
 * Dates must be `YYYY/MM/DD` (Angular `momentFormatYMD`).
 */
export async function getClassStudentWisePtmReport(params: {
  studentId: number;
  collegeId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  if (!params.studentId) return [];
  const data = await fetchDetails<unknown>(MENTORSHIP_API.COUNSELOR_MAPPINGS, {
    studentId: params.studentId,
    collegeId: params.collegeId,
    toDate: toCounselorMappingsYmd(params.toDate),
    fromDate: toCounselorMappingsYmd(params.fromDate),
  });
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const list =
      obj.resultList ?? obj.result ?? obj.data ?? obj.content ?? obj.list;
    if (Array.isArray(list)) return list as AnyRow[];
  }
  return [];
}
