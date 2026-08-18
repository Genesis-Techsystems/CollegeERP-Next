/**
 * HOD Dashboard — Angular `hod-dashboard.component.ts` API parity.
 */
import { DASHBOARD_API, LEAVE_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import {
  BIOMETRIC_COLOR_CODES,
  type EmpAttendanceDay,
  type LeaveApplicationRow,
} from "./staff-dashboard";
import {
  buildQuery,
  domainList,
  getAllRecords,
} from "./crud";
import {
  leaveApplicationDateYmd,
  toLeaveSlashYmd,
} from "./staff-faculty-leaves";
import { listStaffProxiesByEmpDept } from "./proxy-workload";

export type HodDashRow = Record<string, unknown>;

export interface HodDayType {
  type: string;
  colorCode: string;
}

export interface HodAttendanceCell {
  in: string;
  out: string;
  Is_Present: string;
  Day: string;
  Late_By: string | number;
  Early_By: string | number;
  Running_Late_Minutes: string | number;
  Is_Afternoon_Leaves: string | number | null;
  Is_Forenoon_Leaves?: string | number | null;
  Remarks: string | null;
  running_late_color: string;
  date: string;
  dayTypes: HodDayType[];
}

export interface HodEmpAttendanceRow {
  firstName: string;
  empNumber: string;
  pk_emp_id: number;
  subjectAttendance: HodAttendanceCell[];
}

export interface HodLeaveKey {
  leaveCode: string;
  leaveName: string;
}

export interface HodLeaveCell {
  bal: number;
  con: number;
  leaveCode: string;
}

export interface HodEmpLeaveRow {
  employeeId: number;
  firstName: string;
  empNumber: string;
  subjectAttendance: HodLeaveCell[];
}

export interface HodAppliedLeaveRow extends LeaveApplicationRow {
  firstName?: string;
  empNumber?: string;
  employeeFirstName?: string;
  employeeNumber?: string;
  leaveprocessStatusId?: number;
  reason?: string;
  noOfLeaves?: number | string;
  isForenoonAfternoon?: string | null;
  employeeId?: number;
  leaveFromDate?: string;
  leaveToDate?: string;
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

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

/** Angular `momentYMD` / `momentFormatYCur` year from presentDate. */
export function hodPresentYmd(): string {
  return leaveApplicationDateYmd();
}

export function hodLeaveYear(): string {
  return hodPresentYmd().split("-")[0] ?? String(new Date().getFullYear());
}

/** Angular `momentFormatYMD(momentYMD())` → YYYY/MM/DD */
export function hodPresentSlashYmd(): string {
  return toLeaveSlashYmd(hodPresentYmd()) ?? hodPresentYmd().replaceAll("-", "/");
}

/**
 * Angular `listByFourIds(managmentReportUrl, 'HOD', collegeId, 0, empDepartmentId, …)`.
 * UI no longer renders empPerformances; still called for API parity.
 */
export async function getHodManagementReport(params: {
  collegeId: number;
  departmentId: number;
}): Promise<unknown> {
  return getAllRecords(procName(DASHBOARD_API.MANAGEMENT_REPORT), {
    in_flg: "HOD",
    in_college_id: params.collegeId,
    in_emp_id: 0,
    in_dept_id: params.departmentId,
  });
}

/**
 * Angular `listByFiveIds(empAttendanceSummaryReportUrl, 'M', departmentId, momentYMD(), 0, 0, …)`.
 * Pie widget is commented out in Angular HTML; keep the call.
 */
export async function getHodDeptAttendanceSummary(params: {
  departmentId: number;
  attendanceDate: string;
}): Promise<{ present: number; absent: number; year?: string; month?: string }> {
  const data = await getAllRecords(
    procName(LEAVE_API.EMP_ATTENDANCE_SUMMARY_DETAIL),
    {
      in_frequency_flag: "M",
      in_dept_id: params.departmentId,
      in_attendance_Date: params.attendanceDate,
      in_is_Manager: 0,
      in_emp_id: 0,
    },
  );
  const rows = asArray<HodDashRow>(procResultSets(data)[0] ?? []);
  let present = 0;
  let absent = 0;
  for (const row of rows) {
    present += Number(row.Present ?? 0);
    absent += Number(row.Absent ?? 0);
  }
  const first = rows[0];
  return {
    present,
    absent,
    year: first ? String(first.year ?? "") : undefined,
    month: first ? String(first.month ?? "") : undefined,
  };
}

/**
 * Angular `listByEightIds(empAttendanceReportUrl, collegeId, 'L7D', departmentId,
 *   date, date, 1, 0, 0, …)` — last 7 days, manager view.
 */
export async function getHodDeptAttendanceLast7Days(params: {
  collegeId: number;
  departmentId: number;
  attendanceDate: string;
}): Promise<EmpAttendanceDay[]> {
  const data = await getAllRecords(procName(LEAVE_API.EMP_ATTENDANCE_DETAIL), {
    in_college_id: params.collegeId,
    in_frequency_flag: "L7D",
    in_dept_id: params.departmentId,
    in_attendance_Date: params.attendanceDate,
    in_attendance_to_Date: params.attendanceDate,
    in_is_Manager: 1,
    in_emp_id: 0,
    in_only_absent: 0,
  });
  return asArray<EmpAttendanceDay>(procResultSets(data)[0] ?? []);
}

function emptyAttendanceCell(date: string): HodAttendanceCell {
  return {
    in: "--",
    out: "--",
    Is_Present: "--",
    Day: "--",
    Late_By: "--",
    Early_By: "--",
    Running_Late_Minutes: "--",
    Is_Afternoon_Leaves: "--",
    Remarks: "--",
    running_late_color: "--",
    date,
    dayTypes: [],
  };
}

function splitDayTypes(day: unknown): string[] {
  if (day == null) return [];
  const raw = String(day);
  if (!raw) return [];
  return raw.includes("~") ? raw.split("~") : [raw];
}

/**
 * Angular `getEmpAttendanceReport` pivot: employees × unique dates,
 * with day-type color badges from `CONSTANTS.colorCodes`.
 */
export function pivotHodWeeklyAttendance(rows: EmpAttendanceDay[]): {
  attKeys: { date: string }[];
  empAttendance: HodEmpAttendanceRow[];
} {
  const attKeys: { date: string }[] = [];
  const dayTypeIndexes: { id: number; type: string }[] = [];
  let no = 1;

  for (const row of rows) {
    const date = String(row.Attendance_Date ?? "");
    if (date && !attKeys.some((k) => k.date === date)) {
      attKeys.push({ date });
    }
    for (const type of splitDayTypes(row.Day)) {
      if (type && !dayTypeIndexes.some((x) => x.type === type)) {
        dayTypeIndexes.push({ id: no, type });
        no += 1;
      }
    }
  }

  const selectColor = (typ: string): string => {
    const idx = dayTypeIndexes.find((y) => y.type === typ);
    if (!idx) return "#fff";
    return (
      BIOMETRIC_COLOR_CODES.find((c) => c.id === idx.id)?.code ?? "#fff"
    );
  };

  const empAttendance: HodEmpAttendanceRow[] = [];

  const findEmp = (empNumber: string) =>
    empAttendance.find((x) => x.empNumber === empNumber);

  for (const row of rows) {
    const empNumber = String(row.Emp_Number ?? "");
    if (!empNumber) continue;

    for (const key of attKeys) {
      let emp = findEmp(empNumber);
      if (!emp) {
        emp = {
          firstName: String(row.Employee_Name ?? ""),
          empNumber,
          pk_emp_id: Number(row.pk_emp_id ?? 0),
          subjectAttendance: [emptyAttendanceCell(key.date)],
        };
        empAttendance.push(emp);
      } else if (!emp.subjectAttendance.some((y) => y.date === key.date)) {
        emp.subjectAttendance.push(emptyAttendanceCell(key.date));
      }
    }

    const emp = findEmp(empNumber);
    const cell = emp?.subjectAttendance.find(
      (y) => y.date === String(row.Attendance_Date ?? ""),
    );
    if (!emp || !cell) continue;

    cell.dayTypes = splitDayTypes(row.Day).map((type) => ({
      type,
      colorCode: selectColor(type),
    }));
    cell.in = String(row.Login ?? "--");
    cell.out = String(row.Logout ?? "--");
    cell.Is_Present = String(row.Is_Present ?? "--");
    cell.Day = String(row.Day ?? "--");
    cell.Late_By = (row.Late_By as number | string | undefined) ?? "--";
    cell.Early_By = (row.Early_By as number | string | undefined) ?? "--";
    cell.Running_Late_Minutes =
      (row.Running_Late_Minutes as number | string | undefined) ?? "--";
    cell.Is_Afternoon_Leaves =
      (row.Is_Afternoon_Leaves as string | number | null | undefined) ?? "--";
    cell.Is_Forenoon_Leaves =
      (row.Is_Forenoon_Leaves as string | number | null | undefined) ?? null;
    cell.Remarks = (row.Remarks as string | null | undefined) ?? "--";
    cell.running_late_color = String(
      (row as HodDashRow).running_late_color ?? "--",
    );
  }

  return { attKeys, empAttendance };
}

/**
 * Angular `listDetailsByThreeIds(EmployeeRunningLeave, empDepartmentId, year, 'true',
 *   'employeeDetail.employeeDepartment.departmentId', 'leaveYear', 'isActive')`.
 */
export async function getHodDeptLeaveSummary(params: {
  departmentId: number;
  leaveYear: string;
}): Promise<HodDashRow[]> {
  const { departmentId, leaveYear } = params;
  if (!departmentId) return [];
  const queries = [
    buildQuery({
      "employeeDetail.employeeDepartment.departmentId": departmentId,
      leaveYear,
      isActive: true,
    }),
    buildQuery({
      "employeeDetail.employeeDepartment.departmentId": departmentId,
      leaveYear: Number(leaveYear),
      isActive: true,
    }),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<HodDashRow>(
        LEAVE_API.EMPLOYEE_RUNNING_LEAVE,
        q,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

/** Angular `getEmployeesLeaveSummary` pivot: employee × leaveCode → consumed/balance. */
export function pivotHodLeaveSummary(rows: HodDashRow[]): {
  lvKeys: HodLeaveKey[];
  empLv: HodEmpLeaveRow[];
} {
  const lvKeys: HodLeaveKey[] = [];
  for (const row of rows) {
    const leaveCode = String(row.leaveCode ?? "");
    if (leaveCode && !lvKeys.some((k) => k.leaveCode === leaveCode)) {
      lvKeys.push({
        leaveCode,
        leaveName: String(row.leaveName ?? leaveCode),
      });
    }
  }

  const empLv: HodEmpLeaveRow[] = [];
  const findEmp = (employeeId: number) =>
    empLv.find((x) => x.employeeId === employeeId);

  for (const row of rows) {
    const employeeId = Number(row.employeeId ?? 0);
    if (!employeeId) continue;

    for (const key of lvKeys) {
      let emp = findEmp(employeeId);
      if (!emp) {
        emp = {
          employeeId,
          firstName: String(row.employeeFirstName ?? ""),
          empNumber: String(row.empNumber ?? ""),
          subjectAttendance: [{ bal: 0, con: 0, leaveCode: key.leaveCode }],
        };
        empLv.push(emp);
      } else if (
        !emp.subjectAttendance.some((y) => y.leaveCode === key.leaveCode)
      ) {
        emp.subjectAttendance.push({
          bal: 0,
          con: 0,
          leaveCode: key.leaveCode,
        });
      }
    }

    const emp = findEmp(employeeId);
    const cell = emp?.subjectAttendance.find(
      (y) => y.leaveCode === String(row.leaveCode ?? ""),
    );
    if (!emp || !cell) continue;
    cell.bal = Number(row.balanceLeaves ?? 0);
    cell.con = Number(row.consumedLeaves ?? 0);
  }

  return { lvKeys, empLv };
}

/**
 * Angular `listByTwoIds(staffproxiesbyempdept, departmentId, YYYY/MM/DD, 'departmentId', 'proxyDate')`.
 */
export async function getHodTodayProxies(params: {
  departmentId: number;
  proxyDate: string;
}): Promise<HodDashRow[]> {
  if (!params.departmentId || !params.proxyDate) return [];
  return listStaffProxiesByEmpDept({
    isPrincipal: false,
    departmentId: params.departmentId,
    proxyDate: params.proxyDate,
  });
}

/**
 * Angular `listDetailsByThreeIdsWithSort(LeaveApplication, collegeId, employeeId, year, 'ASC',
 *   'College.collegeId', 'assignedEmployeeDetail.employeeId', 'leaveYear', 'createdDt')`.
 */
export async function getHodAssignedLeaveApplications(params: {
  collegeId: number;
  employeeId: number;
  leaveYear: string;
}): Promise<HodAppliedLeaveRow[]> {
  const { collegeId, employeeId, leaveYear } = params;
  if (!collegeId || !employeeId || !leaveYear) return [];
  const queries = [
    buildQuery(
      {
        "College.collegeId": collegeId,
        "assignedEmployeeDetail.employeeId": employeeId,
        leaveYear,
      },
      { field: "createdDt", direction: "ASC" },
    ),
    buildQuery(
      {
        "College.collegeId": collegeId,
        "assignedEmployeeDetail.employeeId": employeeId,
        leaveYear: Number(leaveYear),
      },
      { field: "createdDt", direction: "ASC" },
    ),
  ];
  for (const q of queries) {
    try {
      const rows = await domainList<HodAppliedLeaveRow>(
        ENTITIES.LEAVE_APPLICATION.name,
        q,
      );
      if (rows.length > 0) return rows;
    } catch {
      // try next query shape
    }
  }
  return [];
}

/** Angular: keep LPSAPPLIED only, then `sortDataAss` by applicationDate ASC. */
export function filterHodAppliedLeaves(
  rows: HodAppliedLeaveRow[],
): HodAppliedLeaveRow[] {
  const applied = rows
    .filter((r) => String(r.leaveprocessStatusCode ?? "") === "LPSAPPLIED")
    .map((r) => ({
      ...r,
      firstName: String(r.employeeFirstName ?? r.firstName ?? ""),
      empNumber: String(r.employeeNumber ?? r.empNumber ?? ""),
    }));
  return applied.sort((a, b) => {
    const da = new Date(String(a.applicationDate ?? 0)).getTime();
    const db = new Date(String(b.applicationDate ?? 0)).getTime();
    return da - db;
  });
}

/** Angular `employeeFilter` pipe — firstName / empNumber. */
export function filterHodByEmployee<
  T extends { firstName?: string; empNumber?: string; first_name?: string; emp_number?: string },
>(rows: T[], query: string): T[] {
  const search = query.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => {
    const firstName = String(row.firstName ?? "").toLowerCase();
    const first_name = String(row.first_name ?? "").toLowerCase();
    const empNumber = String(row.empNumber ?? "").toLowerCase();
    const emp_number = String(row.emp_number ?? "").toLowerCase();
    return (
      firstName.includes(search) ||
      empNumber.includes(search) ||
      first_name.includes(search) ||
      emp_number.includes(search)
    );
  });
}

export function filterHodProxyRows(
  rows: HodDashRow[],
  query: string,
): HodDashRow[] {
  const search = query.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) =>
    Object.values(row).some((v) =>
      String(v ?? "")
        .toLowerCase()
        .includes(search),
    ),
  );
}

