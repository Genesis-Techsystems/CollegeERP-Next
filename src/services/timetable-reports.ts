/**
 * Staff Proxy Report — Angular `admin-timetable-reports/staff-proxy-report`.
 * Uses existing Spring `s_rep_tt_get_timetable_details` (Faculty_Work_Load).
 */

import { TIMETABLE_REPORT_API } from "@/config/constants/api";
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
    isActive: true,
  });
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const list = obj.resultList ?? obj.result ?? obj.data;
    if (Array.isArray(list)) return list as AnyRow[];
  }
  return [];
}
