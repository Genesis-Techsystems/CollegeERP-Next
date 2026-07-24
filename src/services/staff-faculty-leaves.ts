/**
 * Staff Faculty Leaves — Angular `staff-faculty-leaves/apply-leave` parity.
 */
import {
  EMPLOYEE_API,
  EVENTS_API,
  LEAVE_API,
  SETUP_API,
} from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { GM_CODES } from "@/config/constants/ui";
import {
  buildQuery,
  domainList,
  fetchDetails,
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

/** Angular POST `employeeleaveapplication`. */
export async function submitEmployeeLeaveApplication(
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
