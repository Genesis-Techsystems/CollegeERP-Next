/**
 * Timetable Reports — Angular `admin-timetable-reports/*`.
 * Uses existing Spring `s_rep_tt_get_timetable_details`.
 */

import { MISC_REPORT_API, TIMETABLE_REPORT_API } from "@/config/constants/api";
import { fetchDetails, getAllRecords } from "./crud";

type AnyRow = Record<string, unknown>;

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
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
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.result)) {
      const first = obj.result[0];
      if (Array.isArray(first)) {
        return first.filter(
          (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
        );
      }
      return obj.result.filter(
        (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
      );
    }
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
  }
  return [];
}

function allResultGroups(data: unknown): AnyRow[][] {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.result)) {
      return obj.result.map((group) =>
        Array.isArray(group)
          ? group.filter(
              (r): r is AnyRow =>
                !!r && typeof r === "object" && !Array.isArray(r),
            )
          : [],
      );
    }
  }
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      return (data as unknown[][]).map((group) =>
        group.filter(
          (r): r is AnyRow =>
            !!r && typeof r === "object" && !Array.isArray(r),
        ),
      );
    }
    return [firstResultGroup(data)];
  }
  return [[]];
}

/** Staff Proxy → `Faculty_Work_Load`. */
export async function getStaffProxyReport(params: {
  fromDate: string;
  toDate: string;
  collegeId: number;
  employeeId: number;
  departmentId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "Faculty_Work_Load",
      in_fdate: params.fromDate,
      in_tdate: params.toDate,
      in_collegeId: params.collegeId,
      in_courseId: "0",
      in_CourseGroupId: 0,
      in_CourseYearId: 0,
      in_academicYearId: "0",
      in_sectionId: "0",
      in_empId: params.employeeId || 0,
      in_academicYearName: 0,
      in_deptId: params.departmentId,
    },
  );
  return firstResultGroup(data);
}

/**
 * Angular staff-proxy employees:
 * `employeedetails?collegeId=&empDeptId=&isActive=true`
 */
export async function listEmployeesForStaffProxyReport(
  collegeId: number,
  departmentId: number,
): Promise<AnyRow[]> {
  if (!collegeId || !departmentId) return [];
  const data = await fetchDetails<unknown>("employeedetails", {
    collegeId,
    empDeptId: departmentId,
    isActive: "true",
  });
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const list = obj.resultList ?? obj.result ?? obj.data;
    if (Array.isArray(list)) return list as AnyRow[];
  }
  return [];
}

/** Angular daily-timetable-report → `DailyTimeTable`. */
export async function getDailyTimetableReport(params: {
  fromDate: string;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  sectionId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "DailyTimeTable",
      in_fdate: params.fromDate,
      in_tdate: params.fromDate,
      in_collegeId: params.collegeId,
      in_courseId: params.courseId,
      in_CourseGroupId: params.courseGroupId,
      in_CourseYearId: params.courseYearId,
      in_academicYearId: params.academicYearId,
      in_sectionId: params.sectionId,
      in_empId: "0",
      in_academicYearName: "",
      in_deptId: "0",
    },
  );
  return firstResultGroup(data);
}

/** Angular weekly-timetable-report → `WeeklyTimeTable`. */
export async function getWeeklyTimetableReport(params: {
  fromDate: string;
  toDate: string;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  sectionId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "WeeklyTimeTable",
      in_fdate: params.fromDate,
      in_tdate: params.toDate,
      in_collegeId: params.collegeId,
      in_courseId: params.courseId,
      in_CourseGroupId: params.courseGroupId,
      in_CourseYearId: params.courseYearId,
      in_academicYearId: params.academicYearId,
      in_sectionId: params.sectionId,
      in_empId: "0",
      in_academicYearName: "",
      in_deptId: "0",
    },
  );
  return firstResultGroup(data);
}

/** Angular daily-statistical-report → `Daily_Statistical_Report`. */
export async function getDailyStatisticalReport(params: {
  fromDate: string;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  sectionId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "Daily_Statistical_Report",
      in_fdate: params.fromDate,
      in_tdate: params.fromDate,
      in_collegeId: params.collegeId,
      in_courseId: params.courseId,
      in_CourseGroupId: params.courseGroupId,
      in_CourseYearId: params.courseYearId,
      in_academicYearId: params.academicYearId,
      in_sectionId: params.sectionId,
      in_empId: "0",
      in_academicYearName: "",
      in_deptId: "0",
    },
  );
  return firstResultGroup(data);
}

/** Angular semester-wise-timetable-report → `SemWiseTimeTable`. */
export async function getSemesterWiseTimetableReport(params: {
  fromDate: string;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  sectionId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "SemWiseTimeTable",
      in_fdate: params.fromDate,
      in_tdate: params.fromDate,
      in_collegeId: params.collegeId,
      in_courseId: params.courseId,
      in_CourseGroupId: params.courseGroupId,
      in_CourseYearId: params.courseYearId,
      in_academicYearId: params.academicYearId,
      in_sectionId: params.sectionId,
      in_empId: "0",
      in_academicYearName: "",
      in_deptId: "0",
    },
  );
  return firstResultGroup(data);
}

/** Angular department-wise-timetable → `Dept_Wise_emp_TT`. */
export async function getDepartmentWiseTimetableReport(params: {
  fromDate: string;
  collegeId: number;
  academicYearId: number;
  departmentId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "Dept_Wise_emp_TT",
      in_fdate: params.fromDate,
      in_tdate: params.fromDate,
      in_collegeId: params.collegeId,
      in_courseId: "0",
      in_CourseGroupId: 0,
      in_CourseYearId: 0,
      in_academicYearId: params.academicYearId,
      in_sectionId: "0",
      in_empId: "0",
      in_academicYearName: "",
      in_deptId: params.departmentId,
    },
  );
  return firstResultGroup(data);
}

/** Angular staff-timetable-report → `facult_individual_tt`. */
export async function getStaffTimetableReport(params: {
  fromDate: string;
  toDate: string;
  collegeId: number;
  academicYearId: number;
  employeeId: number;
  academicYearName: string;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "facult_individual_tt",
      in_fdate: params.fromDate,
      in_tdate: params.toDate,
      in_collegeId: params.collegeId,
      in_courseId: "0",
      in_CourseGroupId: 0,
      in_CourseYearId: 0,
      in_academicYearId: params.academicYearId,
      in_sectionId: "0",
      in_empId: params.employeeId,
      in_academicYearName: params.academicYearName,
      in_deptId: "0",
    },
  );
  return firstResultGroup(data);
}

/**
 * Angular staff-timetable `enteredEmployee` —
 * `employeesearch?q=&empStatus=ACTV` when term length > 4.
 */
export async function searchEmployeesForStaffTimetableReport(
  term: string,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length <= 4) return [];
  const data = await fetchDetails<unknown>("employeesearch", {
    q,
    empStatus: "ACTV",
  });
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const list = obj.resultList ?? obj.result ?? obj.data;
    if (Array.isArray(list)) return list as AnyRow[];
  }
  return [];
}

/** Angular staffworkload → `s_rep_emp_workload`. Result[0]=rows, result[1]=holidays. */
export async function getStaffWorkloadReport(params: {
  departmentId: number;
  fromDate: string;
  toDate: string;
}): Promise<{ rows: AnyRow[]; holidays: AnyRow[] }> {
  const data = await getAllRecords(
    procName(MISC_REPORT_API.EMP_WORKLOAD),
    {
      in_deptid: params.departmentId,
      in_fromDate: params.fromDate,
      in_toDate: params.toDate,
    },
  );
  const groups = allResultGroups(data);
  return {
    rows: groups[0] ?? [],
    holidays: groups[1] ?? [],
  };
}

/** Angular cca-activity-report → `s_get_std_ccactivities_report`. */
export async function getCcaActivityReport(params: {
  collegeId: number;
  courseId: number;
  courseYearId: number;
  courseGroupId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(MISC_REPORT_API.GET_STD_CC_ACTIVITIES),
    {
      in_clg_id: params.collegeId,
      in_course_id: params.courseId,
      in_course_year_id: params.courseYearId,
      in_course_group_id: params.courseGroupId,
      in_emp_id: 0,
    },
  );
  return firstResultGroup(data);
}

/** Angular master-timetable → `Master_TimeTable_Report` (`in_tdate=1990-01-01`). */
export async function getMasterTimetableReport(params: {
  fromDate: string;
  collegeId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  academicYearId: number;
  employeeId: number;
  departmentId: number;
}): Promise<AnyRow[]> {
  const data = await getAllRecords(
    procName(TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS),
    {
      in_flag: "Master_TimeTable_Report",
      in_fdate: params.fromDate,
      in_tdate: "1990-01-01",
      in_collegeId: params.collegeId,
      in_courseId: params.courseId,
      in_CourseGroupId: params.courseGroupId,
      in_CourseYearId: params.courseYearId,
      in_academicYearId: params.academicYearId,
      in_sectionId: 0,
      in_empId: params.employeeId,
      in_academicYearName: 0,
      in_deptId: params.departmentId,
    },
  );
  return firstResultGroup(data);
}
