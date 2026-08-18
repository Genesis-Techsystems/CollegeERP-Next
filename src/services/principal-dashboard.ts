/**
 * Principal Dashboard — Angular `principal-dashboard.component.ts` API parity.
 */
import { ATTENDANCE_API, DASHBOARD_API, FEE_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import type { FeeConcessionApprovalRow } from "@/types/fees-collection";
import {
  buildQuery,
  domainList,
  domainListPaginated,
  getAllRecords,
  getAllRecordsEnvelope,
} from "./crud";
import { listFeeConcessionApprovals } from "./fees-collection";
import { leaveApplicationDateYmd } from "./staff-faculty-leaves";
import {
  getVcDashboardReport,
  persistDashboardReport,
  type VcDashRow,
} from "./vc-dashboard";
import type { LeaveApplicationRow } from "./staff-dashboard";

export type PrincipalDashRow = Record<string, unknown>;

export interface PrincipalLeaveRow extends LeaveApplicationRow {
  firstName?: string;
  empNumber?: string;
  employeeFirstName?: string;
  employeeNumber?: string;
  leaveprocessStatusId?: number;
  reason?: string;
  academicYearId?: number | null;
  noOfLeaves?: number | string;
  isForenoonAfternoon?: string | null;
  employeeId?: number;
}

export interface PrincipalEmpPerformance {
  Tag?: string;
  Color?: string;
  emp_name?: string;
  avg_rating?: number | string;
  [key: string]: unknown;
}

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

async function procRows(
  path: string,
  params: Record<string, string | number>,
): Promise<VcDashRow[]> {
  try {
    const envelope = await getAllRecordsEnvelope<{
      result?: Array<Array<VcDashRow>> | VcDashRow[];
    }>(procName(path), params);
    if (!envelope.success) return [];
    const result = envelope.data?.result;
    if (!Array.isArray(result) || result.length === 0) return [];
    const first = result[0];
    if (Array.isArray(first)) return first;
    return result as VcDashRow[];
  } catch {
    return [];
  }
}

export function principalLeaveYear(): string {
  return (
    leaveApplicationDateYmd().split("-")[0] ??
    String(new Date().getFullYear())
  );
}

/** Angular `listAllMasterDetails(dashboardreport)` — sets title year. */
export async function getPrincipalDashboardCounts(): Promise<{
  year: string;
  counts: PrincipalDashRow | null;
}> {
  try {
    const counts = await getVcDashboardReport();
    persistDashboardReport(counts);
    const date = String(counts?.date ?? "");
    const parts = date.split("-");
    const year = parts[2] || principalLeaveYear();
    return { year, counts };
  } catch {
    return { year: principalLeaveYear(), counts: null };
  }
}

/**
 * Angular `listByFourIds(managmentReportUrl, 'PRINCIPAL', collegeId, 0, 0, …)`.
 */
export async function getPrincipalManagementReport(collegeId: number): Promise<{
  empPerformances: PrincipalEmpPerformance[];
  keys: PrincipalEmpPerformance[];
}> {
  if (!collegeId) return { empPerformances: [], keys: [] };
  let data: { result?: PrincipalEmpPerformance[][] } | null = null;
  try {
    data = await getAllRecords<{
      result?: PrincipalEmpPerformance[][];
    }>(procName(DASHBOARD_API.MANAGEMENT_REPORT), {
      in_flg: "PRINCIPAL",
      in_college_id: collegeId,
      in_emp_id: 0,
      in_dept_id: 0,
    });
  } catch {
    return { empPerformances: [], keys: [] };
  }
  const raw = data?.result;
  const sets: PrincipalEmpPerformance[][] = Array.isArray(raw)
    ? Array.isArray(raw[0])
      ? (raw as PrincipalEmpPerformance[][])
      : [raw as unknown as PrincipalEmpPerformance[]]
    : [];
  let empPerformances: PrincipalEmpPerformance[] = [];
  const keys: PrincipalEmpPerformance[] = [];
  for (const set of sets) {
    if (!Array.isArray(set) || set.length === 0) continue;
    if (set[0]?.Tag) {
      empPerformances = set;
      for (const row of set) {
        if (!keys.some((k) => k.Tag === row.Tag)) keys.push(row);
      }
    }
  }
  return { empPerformances, keys };
}

/**
 * Angular `listDetailsByTwoIdsWithSortLtd(LeaveApplication, collegeId, year, DESC,
 *   College.collegeId, leaveYear, createdDt)` — size 100.
 */
export async function getPrincipalLeaveApplications(params: {
  collegeId: number;
  leaveYear: string;
}): Promise<PrincipalLeaveRow[]> {
  const { collegeId, leaveYear } = params;
  if (!collegeId || !leaveYear) return [];
  const queries = [
    buildQuery(
      { "College.collegeId": collegeId, leaveYear },
      { field: "createdDt", direction: "DESC" },
    ),
    buildQuery(
      { "College.collegeId": collegeId, leaveYear: Number(leaveYear) },
      { field: "createdDt", direction: "DESC" },
    ),
  ];
  for (const q of queries) {
    try {
      const page = await domainListPaginated<PrincipalLeaveRow>(
        ENTITIES.LEAVE_APPLICATION.name,
        0,
        100,
        q,
      );
      if (page.rows.length > 0) return page.rows;
    } catch {
      // try next
    }
  }
  return [];
}

/** Angular: LPSAPPLIED or LPSRECOMMENDED, then sort by applicationDate ASC. */
export function filterPrincipalAppliedLeaves(
  rows: PrincipalLeaveRow[],
): PrincipalLeaveRow[] {
  const applied = rows
    .filter((r) => {
      const code = String(r.leaveprocessStatusCode ?? "");
      return code === "LPSAPPLIED" || code === "LPSRECOMMENDED";
    })
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

/**
 * Angular employee-attendance-chart:
 * `s_get_emp_attendance_summary?in_district_id=0&in_clg_id=&in_year=0&in_month=0`
 */
export async function getPrincipalEmpAttendanceChart(
  collegeId: number,
  _year?: string,
): Promise<VcDashRow[]> {
  return procRows(ATTENDANCE_API.EMP_ATTENDANCE_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_year: 0,
    in_month: 0,
  });
}

/**
 * Angular student-attendance-chart — values live on `Absent_Classes` / `Present_Classes`.
 */
export async function getPrincipalStdAttendanceChart(
  collegeId: number,
  _year?: string,
): Promise<VcDashRow[]> {
  const rows = await procRows(ATTENDANCE_API.STD_ATTENDANCE_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_year: 0,
    in_month: 0,
  });
  return rows.map((r) => ({
    ...r,
    Absent: r.Absent_Classes ?? r.Absent,
    Present: r.Present_Classes ?? r.Present,
  }));
}

/**
 * Angular discount-approvals-grid:
 * `FeeStudentwiseDiscount?query=isActive==true.and.college.collegeId==…`
 */
export async function getPrincipalDiscountApprovals(
  collegeId: number,
): Promise<FeeConcessionApprovalRow[]> {
  if (!collegeId) return [];
  try {
    const rows = await domainList<FeeConcessionApprovalRow>(
      FEE_API.FEE_STUDENTWISE_DISCOUNT,
      buildQuery({ isActive: true, "college.collegeId": collegeId }),
    );
    if (rows.length > 0) return rows;
  } catch {
    // fall through
  }
  return listFeeConcessionApprovals(collegeId);
}
