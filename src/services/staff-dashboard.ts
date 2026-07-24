/**
 * Staff / Main Dashboard - Angular parity
 * (`main-dashboard` shell + `staff-dashboard` widgets).
 */
import {
  EMPLOYEE_API,
  EVENTS_API,
  LEAVE_API,
  TIMETABLE_MGMT_API,
} from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { GM_CODES } from "@/config/constants/ui";
import type { ApiResponse } from "@/types/api";
import {
  buildQuery,
  domainList,
  fetchDetailsEnvelope,
  getAllRecords,
  postDetailsEnvelope,
} from "./crud";

export type StaffDashRow = Record<string, unknown>;

export interface LeaveTotalRow {
  leave_code?: string;
  leave_name?: string;
  balance_leaves?: number;
  consumed_leaves?: number;
  total_leaves?: number;
  leavetypeId?: number;
  /** Running-leave shape when loaded from EmployeeRunningLeave */
  balanceLeaves?: number;
  consumedLeaves?: number;
  totalLeaves?: number;
  leaveCode?: string;
  leaveName?: string;
}

export interface EmpAttendanceDay extends StaffDashRow {
  Attendance_Date?: string;
  Day?: string | null;
  Login?: string | null;
  Logout?: string | null;
  Late_By?: number;
  Early_By?: number;
  Running_Late_Minutes?: number;
  Employee_Name?: string;
  Emp_Number?: string;
  pk_emp_id?: number;
  fk_reporting_manager_id?: number | null;
  Is_Forenoon_Leaves?: unknown;
  Is_Afternoon_Leaves?: unknown;
  Remarks?: string | null;
  start?: Date;
  end?: Date;
  title?: string;
  dayTypes?: { type: string; color: string }[];
}

export interface StaffSubjectClass extends StaffDashRow {
  collegeCode?: string;
  courseCode?: string;
  courseYearName?: string;
  section?: string;
  subjectName?: string;
  subjectType?: string;
  batchName?: string;
  groupSectionId?: number;
  subjectId?: number;
  meetingId?: string | number | null;
  joinUrl?: string;
  token?: string;
  fromTime?: string;
  toTime?: string;
  isValid?: boolean;
}

export interface LiveScheduleRow extends StaffDashRow {
  groupSectionId?: number;
  subjectId?: number;
  timetableScheduleId?: number;
  agenda?: string;
  topic?: string;
  fromTime?: string;
  toTime?: string;
  collegeCode?: string;
  courseCode?: string;
  courseGroupName?: string;
  courseYearName?: string;
  section?: string;
  codiisMeetingId?: string | number;
  codiisHostUrl?: string;
  token?: string;
  zoomMeetingId?: string | number;
  zoomStartUrl?: string;
  teamEventId?: string | number;
  teamJoinUrl?: string;
  meetingId?: string | number;
  joinUrl?: string;
  isValid?: boolean;
}

export interface DashboardNotification extends StaffDashRow {
  notificationTitle?: string;
  notificationMessage?: string;
  publishDate?: string;
}

export interface LeaveApplicationRow extends StaffDashRow {
  leaveApplictionId?: number;
  leaveApplicationId?: number;
  leaveName?: string;
  leaveDescription?: string;
  leaveFromDate?: string;
  leaveToDate?: string;
  assignedEmployeeFirstName?: string;
  leaveprocessStatusCode?: string;
  leaveprocessStatusDisplayName?: string;
  applicationDate?: string;
}

/** Angular `CONSTANTS.colorCodes` for biometric day badges */
export const BIOMETRIC_COLOR_CODES = [
  { id: 1, code: "#ffdf00" },
  { id: 2, code: "#27e427" },
  { id: 3, code: "pink" },
  { id: 4, code: "violet" },
  { id: 5, code: "brown" },
  { id: 6, code: "red" },
  { id: 7, code: "orange" },
  { id: 8, code: "#dedede" },
  { id: 9, code: "#dedede" },
  { id: 10, code: "rgb(255, 110, 159)" },
  { id: 11, code: "rgb(165, 241, 64)" },
  { id: 12, code: "#dedede" },
] as const;

/** Angular `CONSTANTS.leaveDays` */
export const LEAVE_DAY_OPTIONS = [
  { name: "Fore Noon", code: "F", time: "9 AM to 1 PM" },
  { name: "After Noon", code: "A", time: "1 PM to 4 PM" },
  { name: "Full Day", code: "H", time: "9 AM to 4 PM" },
] as const;

/** Match Angular `CONSTANTS.digitalLiveClasses` (currently ZOOM in Angular constants). */
export type DigitalLiveClassEnv = "ZOOM" | "TEAMS" | "CODIIS";

export function getDigitalLiveClassEnv(): DigitalLiveClassEnv {
  const env = (
    process.env.NEXT_PUBLIC_DIGITAL_LIVE_CLASSES ?? "ZOOM"
  ).toUpperCase();
  if (env === "TEAMS" || env === "CODIIS" || env === "ZOOM") return env;
  return "ZOOM";
}

/** Angular staff-dashboard date: `YYYY-M-D` (no zero-padding). */
export function formatAttendanceProcDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Angular `moment().format('YYYY/MM/DD')` for staffSubjects.classDate */
export function formatClassDateYmdSlash(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** Angular `momentFormatYMD1` for live schedules (`YYYY-MM-DD`). */
export function formatScheduleDateYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function asArray<T>(data: unknown): T[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object" && data !== null && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (list == null || list === "") return [];
    if (Array.isArray(list)) return list as T[];
    return [list as T];
  }
  if (typeof data === "object") return [data as T];
  return [];
}

function procResultSets(data: unknown): unknown[][] {
  if (data == null) return [];
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return data as unknown[][];
  }
  if (typeof data === "object" && data !== null && "result" in data) {
    const result = (data as { result?: unknown }).result;
    if (Array.isArray(result)) {
      if (result.length > 0 && Array.isArray(result[0])) {
        return result as unknown[][];
      }
      return [result as unknown[]];
    }
  }
  if (Array.isArray(data)) return [data as unknown[]];
  return [];
}

function enrichAttendanceDays(rows: EmpAttendanceDay[]): EmpAttendanceDay[] {
  const typeKeys: { id: number; type: string }[] = [];
  let no = 1;
  const enriched: EmpAttendanceDay[] = [];

  for (const raw of rows) {
    const row: EmpAttendanceDay = { ...raw };
    const dateStr = String(row.Attendance_Date ?? "");
    const start = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
    row.start = start;
    row.end = start;
    row.title = "login - logout";
    row.dayTypes = [];

    const dayRaw = row.Day;
    if (dayRaw != null && String(dayRaw).includes("~")) {
      for (const part of String(dayRaw).split("~")) {
        if (!typeKeys.some((x) => x.type === part)) {
          typeKeys.push({ id: no, type: part });
          no += 1;
        }
        const val = typeKeys.find((x) => x.type === part)?.id ?? 1;
        const color =
          BIOMETRIC_COLOR_CODES.find((c) => c.id === val)?.code ?? "#dedede";
        row.dayTypes.push({ type: part, color });
      }
    } else if (dayRaw != null) {
      const type = String(dayRaw);
      if (!typeKeys.some((x) => x.type === type)) {
        typeKeys.push({ id: no, type });
        no += 1;
      }
      const val = typeKeys.find((x) => x.type === type)?.id ?? 1;
      const color =
        BIOMETRIC_COLOR_CODES.find((c) => c.id === val)?.code ?? "#dedede";
      row.dayTypes.push({ type, color });
    }
    enriched.push(row);
  }
  return enriched;
}

/**
 * Angular `listByEightIds(empAttendanceReportUrl, ...)`
 * -> getAllRecords/s_rep_emp_attendanace_detail?in_college_id=&in_frequency_flag=M&...
 */
export async function getEmpAttendanceDetail(params: {
  collegeId: number;
  employeeId: number;
  attendanceDate: string;
}): Promise<{ days: EmpAttendanceDay[]; employeeInfo: StaffDashRow[] }> {
  const data = await getAllRecords<unknown>("s_rep_emp_attendanace_detail", {
    in_college_id: params.collegeId,
    in_frequency_flag: "M",
    in_dept_id: 0,
    in_attendance_Date: params.attendanceDate,
    in_attendance_to_Date: params.attendanceDate,
    in_is_Manager: 0,
    in_emp_id: params.employeeId,
    in_only_absent: "0",
  });

  const sets = procResultSets(data);
  const dayRows = asArray<EmpAttendanceDay>(sets[0] ?? []);
  const employeeInfo = asArray<StaffDashRow>(sets[1] ?? []);
  const days = enrichAttendanceDays(dayRows);

  if (days.length === 0) {
    const start = new Date(`${params.attendanceDate}T00:00:00`);
    days.push({
      start,
      end: start,
      title: "login - logout",
      dayTypes: [],
      Attendance_Date: params.attendanceDate,
    });
  }

  return { days, employeeInfo };
}

/**
 * Angular `listByFiveIds('getAllRecords/s_rep_emp_leave_totals', ...)`
 */
export async function getEmpLeaveTotals(params: {
  collegeId: number;
  employeeId: number;
}): Promise<LeaveTotalRow[]> {
  const data = await getAllRecords<unknown>("s_rep_emp_leave_totals", {
    in_college_id: params.collegeId,
    in_emp_id: params.employeeId,
    in_academicYear_id: 0,
    in_dept_id: 0,
    in_leavetype_id: 0,
  });
  const sets = procResultSets(data);
  return asArray<LeaveTotalRow>(sets[0] ?? []);
}

/**
 * Angular leave applications:
 * `College.collegeId==...and.employeeDetail.employeeId==....and.leaveYear==....order(applicationDate=asc)`
 */
export async function getLeaveApplicationsForEmployee(params: {
  collegeId: number;
  employeeId: number;
  leaveYear: number;
}): Promise<LeaveApplicationRow[]> {
  const query = buildQuery(
    {
      "College.collegeId": params.collegeId,
      "employeeDetail.employeeId": params.employeeId,
      leaveYear: params.leaveYear,
    },
    { field: "applicationDate", direction: "ASC" },
  );
  const rows = await domainList<LeaveApplicationRow>(
    LEAVE_API.LEAVE_APPLICATION,
    query,
  );
  return [...rows].sort((a, b) => {
    const da = new Date(String(a.applicationDate ?? 0)).getTime();
    const db = new Date(String(b.applicationDate ?? 0)).getTime();
    return db - da;
  });
}

/** Angular `EmployeeRunningLeave` fallback when leaveHistory empty on Apply Leave. */
export async function getEmployeeRunningLeaves(params: {
  collegeId: number;
  employeeId: number;
  leaveYear: number;
}): Promise<LeaveTotalRow[]> {
  const query = buildQuery({
    "College.collegeId": params.collegeId,
    "employeeDetail.employeeId": params.employeeId,
    leaveYear: params.leaveYear,
  });
  return domainList<LeaveTotalRow>(LEAVE_API.EMPLOYEE_RUNNING_LEAVE, query);
}

/**
 * Angular staffSubjects?employeeId=&status=true&classDate=YYYY/MM/DD
 */
export async function getStaffSubjectsForToday(params: {
  employeeId: number;
  classDate?: string;
}): Promise<StaffSubjectClass[]> {
  const envelope = await fetchDetailsEnvelope<StaffSubjectClass[]>(
    EMPLOYEE_API.STAFF_SUBJECTS,
    {
      employeeId: params.employeeId,
      status: "true",
      classDate: params.classDate ?? formatClassDateYmdSlash(),
    },
  );
  if (!envelope.success) return [];
  return asArray<StaffSubjectClass>(envelope.data);
}

function liveSchedulePath(env: DigitalLiveClassEnv): string {
  if (env === "CODIIS") return "codissLiveClassSchedule/findDetails";
  if (env === "TEAMS") return "teamMeetingSchedule/findDetails";
  return "liveClassSchedule/findDetails";
}

/**
 * Angular live schedules: `.../findDetails?employeeId=&scheduledOnDate=`
 */
export async function getLiveClassSchedules(params: {
  employeeId: number;
  scheduledOnDate?: string;
  env?: DigitalLiveClassEnv;
}): Promise<LiveScheduleRow[]> {
  const env = params.env ?? getDigitalLiveClassEnv();
  const envelope = await fetchDetailsEnvelope<LiveScheduleRow[]>(
    liveSchedulePath(env),
    {
      employeeId: params.employeeId,
      scheduledOnDate: params.scheduledOnDate ?? formatScheduleDateYmd(),
    },
  );
  if (!envelope.success) return [];
  return asArray<LiveScheduleRow>(envelope.data);
}

export function mergeClassesWithSchedules(params: {
  myClasses: StaffSubjectClass[];
  liveSchedules: LiveScheduleRow[];
  userName: string;
  env?: DigitalLiveClassEnv;
}): {
  myClasses: StaffSubjectClass[];
  specialActivities: LiveScheduleRow[];
  proxySchedules: LiveScheduleRow[];
  isZoom: boolean;
} {
  const env = params.env ?? getDigitalLiveClassEnv();
  const isZoom = env === "ZOOM";
  const userName = params.userName;
  const myClasses = params.myClasses.map((c) => ({ ...c }));
  const specialActivities: LiveScheduleRow[] = [];
  const proxySchedules: LiveScheduleRow[] = [];

  for (let i = 0; i < myClasses.length; i++) {
    myClasses[i].meetingId = null;
    myClasses[i].isValid = false;
    const match = params.liveSchedules.find(
      (x) =>
        x.groupSectionId === myClasses[i].groupSectionId &&
        x.subjectId === myClasses[i].subjectId &&
        Number(x.timetableScheduleId) > 0 &&
        x.agenda !== "Proxy",
    );
    if (!match) continue;

    if (env === "CODIIS") {
      myClasses[i].meetingId = match.codiisMeetingId ?? null;
      myClasses[i].token = match.token;
      myClasses[i].joinUrl =
        `${match.codiisHostUrl}?token=${match.token}&&userName=${userName}&&role=1`;
    } else if (env === "ZOOM") {
      myClasses[i].meetingId = match.zoomMeetingId ?? null;
      myClasses[i].joinUrl = match.zoomStartUrl;
    } else {
      myClasses[i].meetingId = match.teamEventId ?? null;
      myClasses[i].joinUrl = match.teamJoinUrl;
    }
    myClasses[i].fromTime = match.fromTime;
    myClasses[i].toTime = match.toTime;
    myClasses[i].isValid = true;
  }

  for (const raw of params.liveSchedules) {
    const row: LiveScheduleRow = { ...raw };
    if (Number(row.timetableScheduleId) === 0) {
      if (env === "CODIIS") {
        row.meetingId = row.codiisMeetingId;
        row.joinUrl = `${row.codiisHostUrl}?token=${row.token}&&userName=${userName}&&role=1`;
      } else if (env === "ZOOM") {
        row.meetingId = row.zoomMeetingId;
        row.joinUrl = row.zoomStartUrl;
      } else {
        row.meetingId = row.teamEventId;
        row.joinUrl = row.teamJoinUrl;
      }
      row.isValid = true;
      specialActivities.push(row);
    } else if (row.agenda === "Proxy") {
      if (env === "CODIIS") {
        row.meetingId = row.codiisMeetingId;
        row.joinUrl = `${row.codiisHostUrl}?token=${row.token}&&userName=${userName}&&role=1`;
      } else if (env === "ZOOM") {
        row.meetingId = row.zoomMeetingId;
        row.joinUrl = row.zoomStartUrl;
      } else {
        row.meetingId = row.teamEventId;
        row.joinUrl = row.teamJoinUrl;
      }
      row.isValid = true;
      proxySchedules.push(row);
    }
  }

  return { myClasses, specialActivities, proxySchedules, isZoom };
}

/** Angular Zoom host check-in before opening join-live. */
export async function meetingCheckIn(params: {
  meetingNumber: string | number;
  role?: number;
}): Promise<StaffDashRow | null> {
  const envelope = await fetchDetailsEnvelope<StaffDashRow>(
    TIMETABLE_MGMT_API.MEETING_CHECK_IN,
    {
      meetingNumber: params.meetingNumber,
      role: params.role ?? 1,
    },
  );
  if (!envelope.success) return null;
  return (envelope.data as StaffDashRow) ?? null;
}

/**
 * Angular management report (called on staff dashboard; result unused in UI).
 * Kept for API parity.
 */
export async function getManagementReport(params: {
  collegeId: number;
  employeeId: number;
}): Promise<unknown> {
  return getAllRecords("s_db_managment", {
    in_flg: "STAFF",
    in_college_id: params.collegeId,
    in_emp_id: params.employeeId,
    in_dept_id: 0,
  });
}

/** Audience types - Angular `AUDTYPE` GeneralDetail. */
export async function getAudienceTypes(): Promise<StaffDashRow[]> {
  const queries = [
    buildQuery({
      "GeneralMaster.generalMasterCode": GM_CODES.AUDIENCE,
      isActive: true,
    }),
    buildQuery({
      generalMasterCode: GM_CODES.AUDIENCE,
      isActive: true,
    }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<StaffDashRow>(
        ENTITIES.GENERAL_DETAIL.name,
        q,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

/**
 * Angular `notificationbyaudience` - 6 params (NON TEACHING) or 7 (with dept).
 */
export async function getNotificationsByAudience(params: {
  notificationAudienceId: number;
  academicYearId: number;
  collegeId: number;
  employeeId: number;
  deptId?: number | null;
  includeDept: boolean;
}): Promise<DashboardNotification[]> {
  const query: Record<string, string | number | boolean> = {
    notificationFor: "E",
    notificationAudienceId: params.notificationAudienceId,
    academicYearId: params.academicYearId,
    collegeId: params.collegeId,
    employeeId: params.employeeId,
    status: true,
  };
  if (params.includeDept && params.deptId != null && params.deptId > 0) {
    query.deptId = params.deptId;
  }

  const envelope = await fetchDetailsEnvelope<DashboardNotification[]>(
    EVENTS_API.NOTIFICATIONBYAUDIENCE,
    query as Record<string, string | number>,
  );
  if (!envelope.success) return [];
  return asArray<DashboardNotification>(envelope.data);
}

/** Leave types for apply-late-leave - Angular Organization.organizationId + isActive. */
export async function getLeaveTypesForOrg(
  organizationId: number,
): Promise<StaffDashRow[]> {
  return domainList<StaffDashRow>(
    ENTITIES.LEAVE_TYPE.name,
    buildQuery({
      "Organization.organizationId": organizationId,
      isActive: true,
    }),
  );
}

/** Leave process statuses - Angular LEAVEPS. */
export async function getLeaveProcessStatuses(): Promise<StaffDashRow[]> {
  const queries = [
    buildQuery({
      "GeneralMaster.generalMasterCode": GM_CODES.LEAVE_STATUS,
      isActive: true,
    }),
    buildQuery({
      generalMasterCode: GM_CODES.LEAVE_STATUS,
      isActive: true,
    }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<StaffDashRow>(
        ENTITIES.GENERAL_DETAIL.name,
        q,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next
    }
  }
  return [];
}

/**
 * Angular POST `employeeleaveapplication` - soft success:false -> toast info.
 */
export async function submitEmployeeLeaveApplication(
  payload: StaffDashRow,
): Promise<ApiResponse<unknown>> {
  return postDetailsEnvelope(LEAVE_API.LEAVE_APPLICATION_POST, payload);
}

/** Convert `HH:mm` / `HH:mm:ss` â†’ 12h display (Angular `tConvert`). */
export function tConvert(time: unknown): string {
  if (time == null || time === "") return "";
  const matched = String(time).match(
    /^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/,
  );
  if (!matched) return String(time);
  const parts = matched.slice(1);
  const hour = Number(parts[0]);
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 || 12;
  return `${h12}${parts[1]}${parts[2]} ${ampm}`;
}

/** Format YYYY-MM-DD for leave application dates (Angular momentWithDateFormatYMD). */
export function formatLeaveYmd(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build doughnut chart rows from leave totals (Angular leaveSummary.data). */
export function buildLeaveSummaryChartData(rows: LeaveTotalRow[]): {
  data: { name: string; value: number }[];
  totalLeaves: number;
} {
  const data: { name: string; value: number }[] = [];
  let totalLeaves = 0;
  for (const row of rows) {
    const code = String(row.leave_code ?? row.leaveCode ?? "Leave");
    const balance = Number(row.balance_leaves ?? row.balanceLeaves ?? 0);
    const consumed = Number(row.consumed_leaves ?? row.consumedLeaves ?? 0);
    totalLeaves += Number(row.total_leaves ?? row.totalLeaves ?? 0);
    data.push({ name: code, value: balance });
    data.push({ name: `${code} Consumed`, value: consumed });
  }
  return { data, totalLeaves };
}

/**
 * Resolve Zoom join URL via check-in (Angular hostLiveClass for Zoom proxy).
 * Opens Angular-style query params in a new tab under `/staff-classes/join-live`
 * when that route exists; otherwise opens zoom start URL if already on class.
 */
export async function resolveZoomHostUrl(
  meetingId: string | number,
): Promise<string | null> {
  const details = await meetingCheckIn({ meetingNumber: meetingId, role: 1 });
  if (!details) return null;
  const qs = new URLSearchParams({
    signature: String(details.signature ?? ""),
    meetingNumber: String(details.zoomMeetingId ?? meetingId),
    apiKey: String(details.apiKey ?? ""),
    userEmail: String(details.email ?? ""),
    passWord: String(details.password ?? ""),
  });
  return `/staff-classes/join-live?${qs.toString()}`;
}

/** Safe localStorage string read (Angular parity fields). */
export function readDashStorage(key: string): string | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }
  try {
    const v = globalThis.localStorage.getItem(key);
    if (v == null || v === "null" || v === "undefined") return null;
    return v;
  } catch {
    return null;
  }
}

export function readDashStorageNum(key: string): number {
  const v = readDashStorage(key);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
