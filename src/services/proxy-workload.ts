/**
 * Workload Adjustment / Proxy Workload — Angular
 * `proxy-workload` + `staff-faculty-leaves/workload-adjustment` parity.
 */
import {
  ATTENDANCE_API,
  EMPLOYEE_API,
  EVENTS_API,
  SUBJECT_API,
} from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import {
  domainCreate,
  domainUpdate,
  fetchDetails,
  fetchDetailsEnvelope,
  getAllRecords,
  postDetailsEnvelope,
} from "./crud";
import { listGeneralDetailsByCode } from "./student-information";
import {
  listLeaveHolidayEvents,
  toLeaveSlashYmd,
  toLeaveYmd,
} from "./staff-faculty-leaves";

type AnyRow = Record<string, unknown>;

export const WORKLOAD_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Workload",
] as const;

/** Angular `CONSTANTS.weekdays` dno ↔ moment().day() (0=Sun). */
export const WORKLOAD_WEEKDAY_DNOS = [
  { dno: 1, fullName: "Monday" },
  { dno: 2, fullName: "Tuesday" },
  { dno: 3, fullName: "Wednesday" },
  { dno: 4, fullName: "Thursday" },
  { dno: 5, fullName: "Friday" },
  { dno: 6, fullName: "Saturday" },
] as const;

/** Angular `momentWeekday` — uses presentDate (DD-MM-YYYY) when set. */
export function getWorkloadWeekdayNumber(date?: Date): number {
  if (typeof window !== "undefined") {
    const present = window.localStorage.getItem("presentDate");
    if (present) {
      const parts = present.split("-");
      if (parts.length === 3 && parts[2]?.length === 4) {
        const [d, m, y] = parts.map(Number);
        const dt = new Date(y, m - 1, d);
        if (!Number.isNaN(dt.getTime())) return dt.getDay();
      }
    }
  }
  return (date ?? new Date()).getDay();
}

export function getDefaultWorkloadTabIndex(): number {
  const day = getWorkloadWeekdayNumber();
  // Sunday → Workload tab (index 6); Mon–Sat → 0–5
  return day === 0 ? 6 : day - 1;
}

export type WorkloadWeekday = (typeof WORKLOAD_WEEKDAYS)[number];

export function getDefaultWorkloadDayName(): WorkloadWeekday {
  const idx = getDefaultWorkloadTabIndex();
  return WORKLOAD_WEEKDAYS[idx] ?? "Monday";
}

/** Angular `tConvert` — HH:mm[:ss] → h:mm AM/PM. */
export function tConvert(time: unknown): string {
  const raw = String(time ?? "");
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return raw;
  let h = Number(match[1]);
  const mins = match[2];
  const ampm = h < 12 ? "AM" : "PM";
  h = h % 12 || 12;
  return `${h}:${mins} ${ampm}`;
}

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

/**
 * Angular `getSubjectResourcesSchedules1Url(subjectresourcesschedules, staffId)`.
 */
export async function listSubjectResourceSchedulesForStaff(
  staffId: number,
): Promise<AnyRow[]> {
  if (!staffId) return [];
  try {
    const data = await fetchDetails<unknown>(
      SUBJECT_API.SUBJECT_RESOURCES_SCHEDULES,
      { staffId },
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular `staffproxies?assignedbyEmployeeId=&isActive=true`
 * or `?proxyEmpId=&isActive=true`
 * or `?timetableScheduleId=&proxyFormat=day&proxyDate=&isActive=true`.
 */
export async function listStaffProxies(
  params: Record<string, string | number>,
): Promise<AnyRow[]> {
  try {
    const data = await fetchDetails<unknown>(
      EMPLOYEE_API.STAFF_PROXIES,
      params,
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/** Angular POST `staffproxieslist` (array payload). */
export async function saveStaffProxiesList(
  rows: AnyRow[],
): Promise<{ success: boolean; message?: string }> {
  const res = await postDetailsEnvelope<unknown>(
    EMPLOYEE_API.STAFF_PROXIES_2,
    rows,
  );
  return { success: Boolean(res.success), message: res.message };
}

/** Angular domain create `StaffProxy` (Take Proxy single). */
export async function createStaffProxy(
  payload: AnyRow,
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  try {
    const data = await domainCreate<unknown>(EMPLOYEE_API.STAFF_PROXY, payload);
    return { success: true, data, message: "Success" };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to save proxy",
    };
  }
}

/** Angular `updateDetails(StaffProxy, …, staffProxyId)`. */
export async function updateStaffProxy(
  staffProxyId: number,
  payload: AnyRow,
): Promise<{ success: boolean; message?: string }> {
  try {
    await domainUpdate(
      EMPLOYEE_API.STAFF_PROXY,
      "staffProxyId",
      staffProxyId,
      payload,
    );
    return { success: true, message: "Updated successfully" };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to update proxy",
    };
  }
}

/**
 * Angular `getStaffPrxy(getAllRecords/staff_for_proxy, …)`.
 */
export async function listStaffForProxy(params: {
  groupSectionId: number;
  weekdayName: string;
  startTime: string;
  endTime: string;
  empId: number;
}): Promise<AnyRow[]> {
  const { groupSectionId, weekdayName, startTime, endTime, empId } = params;
  if (!groupSectionId || !weekdayName || !empId) return [];
  try {
    const data = await getAllRecords<{ result?: unknown[][] } | unknown>(
      EMPLOYEE_API.STAFF_FOR_PROXY,
      {
        groupSectionId,
        weekdayName,
        startTime,
        endTime,
        empId,
      },
    );
    if (data && typeof data === "object" && "result" in data) {
      const result = (data as { result?: unknown[][] }).result;
      if (Array.isArray(result?.[0])) return result[0] as AnyRow[];
    }
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/**
 * Angular `staffSubjects?collegeId&academicYearId&employeeId&groupSectionId&status=true`.
 */
export async function listStaffSubjectsForProxy(params: {
  collegeId: number;
  academicYearId: number;
  employeeId: number;
  groupSectionId: number;
  withStatus?: boolean;
}): Promise<AnyRow[]> {
  const {
    collegeId,
    academicYearId,
    employeeId,
    groupSectionId,
    withStatus = true,
  } = params;
  if (!collegeId || !academicYearId || !employeeId || !groupSectionId) {
    return [];
  }
  const query: Record<string, string | number> = {
    collegeId,
    academicYearId,
    employeeId,
    groupSectionId,
  };
  if (withStatus) query.status = "true";
  try {
    const data = await fetchDetails<unknown>(
      EMPLOYEE_API.STAFF_SUBJECTS,
      query,
    );
    return normalizeListPayload(data);
  } catch {
    return [];
  }
}

/** Angular `studentattendancedetails?timetableScheduleId&attendanceDate`. */
export async function checkAttendanceTaken(
  timetableScheduleId: number,
  attendanceDate: string,
): Promise<boolean> {
  if (!timetableScheduleId || !attendanceDate) return false;
  try {
    const res = await fetchDetailsEnvelope<unknown>(
      ATTENDANCE_API.STUDENT_STTENDANCE_DETAILS,
      { timetableScheduleId, attendanceDate },
    );
    return Boolean(res.success);
  } catch {
    return false;
  }
}

export async function listProxyProcessStatuses(): Promise<AnyRow[]> {
  return listGeneralDetailsByCode(GM_CODES.PROCESS_STATUS);
}

/** Group LAB proxies by subjectCourseyearId + proxyDate (Angular Workload tab). */
export function groupLabProxies(rows: AnyRow[]): AnyRow[] {
  const out: AnyRow[] = [];
  for (const row of rows) {
    const copy: AnyRow = { ...row };
    const time = {
      startTime: row.startTime,
      endTime: row.endTime,
      timetableScheduleId: row.timetableScheduleId,
    };
    if (String(row.proxySubjecttypeDisplayName) === "LAB") {
      const match = out.find(
        (x) =>
          Number(x.reason) === Number(row.subjectCourseyearId) &&
          String(x.proxyDate) === String(row.proxyDate),
      );
      if (match) {
        const times = (match.times as AnyRow[]) ?? [];
        times.push(time);
        match.times = times;
      } else {
        copy.times = [time];
        out.push(copy);
      }
    } else {
      copy.times = [time];
      out.push(copy);
    }
  }
  return out.sort((a, b) => {
    const tb = new Date(String(b.proxyDate ?? 0)).getTime();
    const ta = new Date(String(a.proxyDate ?? 0)).getTime();
    return tb - ta;
  });
}

export function subjectResourceOf(detail: AnyRow): AnyRow {
  const resources = detail.subjectResource;
  if (Array.isArray(resources) && resources[0]) {
    return resources[0] as AnyRow;
  }
  return {};
}
