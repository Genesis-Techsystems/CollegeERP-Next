/**
 * HR Reports — Angular `reports/admin-hr-reports/*` parity.
 */

import { EMPLOYEE_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { getErrorMessage } from "@/lib/errors";
import { buildQuery, domainList, getAllRecords } from "./crud";

type AnyRow = Record<string, unknown>;

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

function isNoRecordsError(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  return (
    msg.includes("no record") ||
    msg.includes("no data") ||
    msg.includes("not found")
  );
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

/**
 * Employee List By Campus —
 * `s_get_new_employee_list?in_collegeId=&in_dept=&in_from_Date=&in_to_Date=&in_emp_id=0`
 */
export async function getEmployeeListByCampusReport(params: {
  collegeId: number;
  departmentId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(EMPLOYEE_API.GET_NEW_EMPLOYEE_LIST),
      {
        in_collegeId: params.collegeId,
        in_dept: params.departmentId,
        in_from_Date: params.fromDate,
        in_to_Date: params.toDate,
        in_emp_id: 0,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Employee Detail Report —
 * Angular `listDetailsById('EmployeeDetail', collegeId, 'College.collegeId')`
 * excluding `deptName === 'EXAMINATION'`.
 */
export async function getEmployeeDetailReport(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  try {
    const rows = await domainList<AnyRow>(
      ENTITIES.EMPLOYEE_DETAIL.name,
      buildQuery({ "College.collegeId": collegeId }),
    );
    return rows.filter(
      (r) => String(r.deptName ?? "").toUpperCase() !== "EXAMINATION",
    );
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}
