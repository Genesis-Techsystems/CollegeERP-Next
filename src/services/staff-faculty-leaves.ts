/**
 * Staff Faculty Leaves — Angular `staff-faculty-leaves` parity
 * (`apply-leave`, `leave-summary`).
 */
import {
  EMPLOYEE_API,
  EVENTS_API,
  LEAVE_API,
  SETUP_API,
  TIMETABLE_REPORT_API,
  NEXT_API,
} from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { GM_CODES } from "@/config/constants/ui";
import { getErrorMessage, parseApiError } from "@/lib/errors";
import {
  buildQuery,
  domainList,
  fetchDetails,
  getAllRecords,
  postDetailsEnvelope,
} from "./crud";
import { listGeneralDetailsByCode } from "./student-information";

// Not exported — conflicts with pre-examination AnyRow on the services barrel.
type AnyRow = Record<string, unknown>;

/** Angular leave day options (`CONSTANTS.leaveDays`). */
export const LEAVE_DAYS = [
  { name: "Fore Noon", code: "F", time: "9 AM to 1 PM" },
  { name: "After Noon", code: "A", time: "1 PM to 4 PM" },
  { name: "Full Day", code: "H", time: "9 AM to 4 PM" },
] as const;

function normalizeListPayload(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.content)) return obj.content as AnyRow[];
    if (Array.isArray(obj.result)) return obj.result as AnyRow[];
    if (Array.isArray(obj.data)) return obj.data as AnyRow[];
  }
  return [];
}

/** Angular `employeedetailsbyid?employeeId=`. */
export async function getStaffEmployeeDetailsById(
  employeeId: number,
): Promise<AnyRow | null> {
  if (!employeeId) return null;
  const data = await fetchDetails<AnyRow>(EMPLOYEE_API.DETAILS_BY_USER_ID, {
    employeeId,
  });
  return data && typeof data === "object" ? data : null;
}

/** Angular leave process statuses — GeneralDetail `LEAVEPS`. */
export async function listLeaveProcessStatuses(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.LEAVE_STATUS);
}

/**
 * Angular `listDetailsByThreeIds(EmployeeRunningLeave, collegeId, employeeId, leaveYear, …)`.
 */
export async function listEmployeeRunningLeaves(
  collegeId: number,
  employeeId: number,
  leaveYear: number | string,
): Promise<AnyRow[]> {
  if (!collegeId || !employeeId || leaveYear == null || leaveYear === "") {
    return [];
  }
  const year = String(leaveYear);
  const queries = [
    buildQuery({
      "College.collegeId": collegeId,
      "employeeDetail.employeeId": employeeId,
      leaveYear: year,
    }),
    buildQuery({
      "College.collegeId": collegeId,
      "employeeDetail.employeeId": employeeId,
      leaveYear: Number(year),
    }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(LEAVE_API.RUNNING_LEAVE, q);
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

/**
 * Angular `listDetailsByThreeIdsWithSort(LeaveApplication, …, applicationDate ASC)`.
 * Client still re-sorts DESC by applicationDate (Angular `sortDataDes`).
 */
export async function listStaffLeaveApplications(
  collegeId: number,
  employeeId: number,
  leaveYear: number | string,
): Promise<AnyRow[]> {
  if (!collegeId || !employeeId || leaveYear == null || leaveYear === "") {
    return [];
  }
  const year = String(leaveYear);
  const queries = [
    buildQuery(
      {
        "College.collegeId": collegeId,
        "employeeDetail.employeeId": employeeId,
        leaveYear: year,
      },
      { field: "applicationDate", direction: "ASC" },
    ),
    buildQuery(
      {
        "College.collegeId": collegeId,
        "employeeDetail.employeeId": employeeId,
        leaveYear: Number(year),
      },
      { field: "applicationDate", direction: "ASC" },
    ),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LEAVE_APPLICATION.name, q);
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

/**
 * Angular principal leave-approvals:
 * `listDetailsByTwoIdsWithSort(LeaveApplication, collegeId, leaveYear, 'DESC',
 *  getDetailsByCollegeIdUrl, 'leaveYear', 'createdDt')`.
 * Client still re-sorts DESC by applicationDate (Angular `sortDataDes`).
 */
export async function listCollegeLeaveApplications(
  collegeId: number,
  leaveYear: number | string,
): Promise<{ rows: AnyRow[]; message?: string }> {
  if (!collegeId || leaveYear == null || leaveYear === "") return { rows: [] };
  const year = String(leaveYear);
  const queries = [
    buildQuery(
      { "College.collegeId": collegeId, leaveYear: year },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      { "College.collegeId": collegeId, leaveYear: Number(year) },
      { field: "createdDt", direction: "DESC" },
    ),
  ];
  let message: string | undefined;
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LEAVE_APPLICATION.name, q);
      if (rows.length > 0) return { rows };
      message ??= "No Record(s) found.";
    } catch (error) {
      message = getErrorMessage(error);
    }
  }
  return { rows: [], message };
}

/**
 * Angular principal leave-application (Leave Requests):
 * `listDetailsByTwoIdsWithSort(LeaveApplication, employeeId, leaveYear, 'DESC',
 *  'assignedEmployeeDetail.employeeId', 'leaveYear', 'createdDt')`.
 */
export async function listAssignedLeaveApplications(
  assignedEmployeeId: number,
  leaveYear: number | string,
): Promise<AnyRow[]> {
  if (!assignedEmployeeId || leaveYear == null || leaveYear === "") return [];
  const year = String(leaveYear);
  const queries = [
    buildQuery(
      {
        "assignedEmployeeDetail.employeeId": assignedEmployeeId,
        leaveYear: year,
      },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      {
        "assignedEmployeeDetail.employeeId": assignedEmployeeId,
        leaveYear: Number(year),
      },
      { field: "createdDt", direction: "DESC" },
    ),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<AnyRow>(ENTITIES.LEAVE_APPLICATION.name, q);
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

/**
 * Angular `listByTwoIds(getEmpLeaveCount, leaveFromDate, employeeId, 'date', 'empId')`.
 */
export async function getEmpLeaveCount(
  date: string | number,
  empId: number,
): Promise<AnyRow[]> {
  if (!date || !empId) return [];
  try {
    const data = await fetchDetails<unknown>(LEAVE_API.GET_EMP_LEAVE_COUNT, {
      date: String(date),
      empId,
    });
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular leave-approvals `viewProxies`:
 * `listByTwelveIds(getAllRecords/s_rep_tt_get_timetable_details, Faculty_Work_Load, …)`.
 */
export async function listFacultyWorkloadProxies(params: {
  leaveFromDate: string;
  leaveToDate: string;
  employeeId: number;
}): Promise<AnyRow[]> {
  const { leaveFromDate, leaveToDate, employeeId } = params;
  if (!leaveFromDate || !leaveToDate || !employeeId) return [];

  const procName = TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS.startsWith(
    "getAllRecords/",
  )
    ? TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS.slice(
        "getAllRecords/".length,
      )
    : TIMETABLE_REPORT_API.REP_TT_GET_TIMETABLE_DETAILS;

  try {
    const raw = await getAllRecords<unknown>(procName, {
      in_flag: "Faculty_Work_Load",
      in_fdate: leaveFromDate,
      in_tdate: leaveToDate,
      in_collegeId: 0,
      in_courseId: "0",
      in_CourseGroupId: 0,
      in_CourseYearId: 0,
      in_academicYearId: "0",
      in_sectionId: "0",
      in_empId: employeeId,
      in_academicYearName: 0,
      in_deptId: 0,
    });
    return unwrapFacultyWorkloadRows(raw);
  } catch {
    return [];
  }
}

/** Angular `result.data.result[0]` for Faculty_Work_Load. */
function unwrapFacultyWorkloadRows(data: unknown): AnyRow[] {
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

/** Angular POST `employeeleaveapplication` (staff-faculty-leaves apply flow). */
export async function submitFacultyLeaveApplication(
  payload: AnyRow,
): Promise<{ success: boolean; message?: string }> {
  const res = await postDetailsEnvelope<unknown>(
    LEAVE_API.LEAVE_APPLICATION_POST,
    payload,
  );
  return {
    success: Boolean(res.success),
    message: res.message,
  };
}

/** Angular POST `cancelemployeeleaveapplication`. */
export async function cancelEmployeeLeaveApplication(
  payload: AnyRow,
): Promise<{ success: boolean; message?: string }> {
  const res = await postDetailsEnvelope<unknown>(
    LEAVE_API.CANCEL_LEAVE_APPLICATION,
    payload,
  );
  return {
    success: Boolean(res.success),
    message: res.message,
  };
}

/**
 * Angular `listDetailsByTwoIds(GeneralSetting, 'LEAVEDAYCAL', 'true', 'settingCode', 'isActive')`.
 */
export async function listLeaveDayCalSettings(): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>(
      SETUP_API.GENERAL_SETTING,
      buildQuery({ settingCode: "LEAVEDAYCAL", isActive: true }),
    );
  } catch {
    return [];
  }
}

/**
 * Angular `eventsbydate?collegeId&startDate&endDate&isHoliday=true&isweekoff=true`
 * (dates as YYYY/MM/DD).
 */
export async function listLeaveHolidayEvents(params: {
  collegeId: number;
  startDate: string;
  endDate: string;
}): Promise<AnyRow[]> {
  const { collegeId, startDate, endDate } = params;
  if (!collegeId || !startDate || !endDate) return [];
  try {
    const data = await fetchDetails<unknown>(EVENTS_API.EVENTS_BY_DATE, {
      collegeId,
      startDate,
      endDate,
      isHoliday: "true",
      isweekoff: "true",
    });
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular `empproxydetails?empId&fromDate&toDate&ishalfday`
 * (from/to as `YYYY/MM/DD-HH:mm:ss`).
 */
export async function listEmpProxyDetails(params: {
  empId: number;
  fromDate: string;
  toDate: string;
  ishalfday: number;
}): Promise<AnyRow[]> {
  const { empId, fromDate, toDate, ishalfday } = params;
  if (!empId || !fromDate || !toDate) return [];
  try {
    const data = await fetchDetails<unknown>(EMPLOYEE_API.EMP_PROXY_DETAILS, {
      empId,
      fromDate,
      toDate,
      ishalfday,
    });
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/** Sort leave applications newest-first (Angular `sortDataDes`). */
export function sortLeaveApplicationsDesc(rows: AnyRow[]): AnyRow[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(String(a.applicationDate ?? 0)).getTime();
    const tb = new Date(String(b.applicationDate ?? 0)).getTime();
    return tb - ta;
  });
}

/** Angular `momentYMD` — application date from `presentDate` (DD-MM-YYYY) or today. */
export function leaveApplicationDateYmd(): string {
  if (typeof window !== "undefined") {
    const present = window.localStorage.getItem("presentDate");
    if (present) {
      const parts = present.split("-");
      if (parts.length === 3 && parts[2]?.length === 4) {
        const [d, m, y] = parts;
        return `${y}-${m}-${d}`;
      }
    }
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Format date as YYYY-MM-DD (Angular `momentWithDateFormatYMD`). */
export function toLeaveYmd(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return toLeaveYmd(d);
}

/** Format date as YYYY/MM/DD (Angular `momentFormatYMD`). */
export function toLeaveSlashYmd(value: unknown): string | null {
  const ymd = toLeaveYmd(value);
  return ymd ? ymd.replaceAll("-", "/") : null;
}

// ── Leave Summary (Angular `staff-faculty-leaves/leave-summary`) ────────────

function leaveSummaryProcName(constant: string): string {
  return constant.startsWith("getAllRecords/")
    ? constant.slice("getAllRecords/".length)
    : constant.startsWith("getAllRecordsDownload/")
      ? constant.slice("getAllRecordsDownload/".length)
      : constant;
}

/**
 * Angular `getFiltersList` —
 * `s_get_collegewisedetails_bycode?in_flag=clg_filters,clg_dept_filters`
 * (also returns academic-year rows tagged `clg_filters_ay`).
 */
export async function getLeaveSummaryFilters(
  organizationId: number,
  employeeId: number,
): Promise<{
  colleges: AnyRow[];
  departments: AnyRow[];
  academicYears: AnyRow[];
}> {
  const data = await getAllRecords<{ result?: AnyRow[][] }>(
    "s_get_collegewisedetails_bycode",
    {
      in_flag: "clg_filters,clg_dept_filters",
      in_org_id: organizationId || 0,
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
      in_employee: "",
      in_subject: "",
      in_gm_codes: "",
    },
  );

  const groups = Array.isArray(data?.result) ? data.result : [];
  let collegesRaw: AnyRow[] = [];
  let departmentsRaw: AnyRow[] = [];
  let academicYearsRaw: AnyRow[] = [];

  for (const arr of groups) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const first = arr[0] ?? {};
    const flag = String(first.flag ?? "")
      .trim()
      .toLowerCase();
    if (flag === "clg_filters") collegesRaw = arr;
    else if (flag === "clg_dept_filters") departmentsRaw = arr;
    if (first.clg_filters_ay === "clg_filters_ay") academicYearsRaw = arr;
  }

  return {
    colleges: collegesRaw,
    departments: departmentsRaw,
    academicYears: academicYearsRaw,
  };
}

/**
 * Angular leave-summary employee typeahead —
 * `employeesearch?collegeId&q&empStatus=ACTV` or with `deptId` when scoped.
 */
export async function searchEmployeesForLeaveSummary(
  collegeId: number,
  term: string,
  departmentId?: number,
): Promise<AnyRow[]> {
  const q = term.trim();
  if (!collegeId || q.length <= 4) return [];

  const params: Record<string, string | number> = {
    collegeId,
    q,
    empStatus: "ACTV",
  };
  if (departmentId && departmentId > 0) params.deptId = departmentId;

  const paths = [EMPLOYEE_API.EMPLOYEE_SEARCH, "employeesearch"] as const;
  for (const path of paths) {
    try {
      const data = await fetchDetails<unknown>(path, params);
      return normalizeListPayload(data);
    } catch {
      // try next path
    }
  }
  return [];
}

/**
 * Angular `getLeavSummaryReport` —
 * `getAllRecords/s_emp_leave_report` with Angular query key names.
 * Note: Angular hardcodes `in_academicYear_id` to `0` on the list call.
 */
export async function getEmpLeaveSummaryReport(params: {
  collegeId: number;
  employeeId: number;
  departmentId: number;
  fromDate: string;
  toDate: string;
  leaveTypeId: number;
}): Promise<AnyRow[]> {
  const { collegeId, employeeId, departmentId, fromDate, toDate, leaveTypeId } =
    params;
  if (!collegeId || !fromDate || !toDate) return [];

  const procName = leaveSummaryProcName(LEAVE_API.LEAVE_SUMMARY_REPORTS);
  const raw = await getAllRecords<unknown>(procName, {
    in_college_id: collegeId,
    in_emp_id: employeeId || 0,
    in_academicYear_id: 0,
    in_dept_id: departmentId || 0,
    in_fromdate: fromDate,
    in_todate: toDate,
    in_leaveType_id: leaveTypeId || 0,
    in_date: fromDate,
  });
  return unwrapFacultyWorkloadRows(raw);
}

/**
 * Angular `download()` —
 * `getAllRecordsDownload/s_emp_leave_report` Excel blob.
 */
export async function downloadEmpLeaveSummaryReport(params: {
  collegeId: number;
  employeeId: number;
  academicYearId: number;
  departmentId: number;
  leaveTypeId: number;
  fromDate: string;
}): Promise<void> {
  const {
    collegeId,
    employeeId,
    academicYearId,
    departmentId,
    leaveTypeId,
    fromDate,
  } = params;

  const qs = new URLSearchParams({
    in_date: fromDate,
    in_leaveType_id: String(leaveTypeId || 0),
    in_college_id: String(collegeId || 0),
    in_dept_id: String(departmentId || 0),
    in_academicYear_id: String(academicYearId || 0),
    in_emp_id: String(employeeId || 0),
  });

  const res = await fetch(
    `${NEXT_API.PROXY(LEAVE_API.LEAVE_SUMMARY_DOWNLOAD)}?${qs}`,
    { credentials: "include" },
  );
  if (!res.ok) throw parseApiError(res, await res.json().catch(() => null));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Leave Summary Report";
  a.click();
  URL.revokeObjectURL(url);
}
