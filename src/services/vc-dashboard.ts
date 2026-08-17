/**
 * Vice Chancellor dashboard — Angular `vice-chancellor-dashboard` +
 * `highchart-dashboard` widget APIs.
 */
import { DASHBOARD_API } from "@/config/constants/api";
import type { ApiResponse } from "@/types/api";
import {
  fetchDetailsEnvelope,
  getAllRecords,
  getAllRecordsEnvelope,
} from "./crud";
import { readDashStorage, readDashStorageNum } from "./staff-dashboard";

export type VcDashRow = Record<string, unknown>;

export interface VcAcademicYear {
  academic_year: string;
  is_curr_ay?: number | boolean;
  [key: string]: unknown;
}

type ProcResponse = { result?: Array<Array<VcDashRow>> | VcDashRow[] };

function unwrapProcRows(data: unknown): VcDashRow[] {
  if (!data || typeof data !== "object") return [];
  const result = (data as ProcResponse).result;
  if (!Array.isArray(result) || result.length === 0) return [];
  const first = result[0];
  if (Array.isArray(first)) return first as VcDashRow[];
  return result as VcDashRow[];
}

async function procRows(
  path: string,
  params: Record<string, string | number>,
): Promise<VcDashRow[]> {
  try {
    const envelope = await getAllRecordsEnvelope<ProcResponse>(path, params);
    if (!envelope.success) return [];
    return unwrapProcRows(envelope.data);
  } catch {
    return [];
  }
}

export function resolveVcChartCollegeId(): number {
  if (readDashStorage("isPRINCIPAL") === "true") {
    return readDashStorageNum("collegeId");
  }
  return 0;
}

export function isPrincipalDashboard(): boolean {
  return readDashStorage("isPRINCIPAL") === "true";
}

/**
 * Angular `getfilterDetails()` — `s_get_collegewisedetails_bycode`
 * with `in_flag=clg_filters`, then distinct academic years.
 */
export async function getVcDashboardAcademicYears(
  organizationId: number,
  employeeId: number,
): Promise<VcAcademicYear[]> {
  try {
    const data = await getAllRecords<ProcResponse>(
      "s_get_collegewisedetails_bycode",
      {
        in_flag: "clg_filters",
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
        in_subject: "",
        in_employee: "",
        in_gm_codes: "",
      },
    );

    const groups = Array.isArray(data?.result) ? data.result : [];
    let filtersdata: VcDashRow[] = [];
    for (const arr of groups) {
      if (
        Array.isArray(arr) &&
        arr.length > 0 &&
        (arr[0] as VcDashRow).clg_filters_ay === "clg_filters_ay"
      ) {
        filtersdata = arr;
        break;
      }
    }

    const seen = new Set<string>();
    const years: VcAcademicYear[] = [];
    for (const row of filtersdata) {
      const label = String(row.academic_year ?? "");
      if (!label || seen.has(label)) continue;
      seen.add(label);
      years.push(row as VcAcademicYear);
    }

    years.sort(
      (a, b) =>
        parseInt(String(b.academic_year), 10) -
        parseInt(String(a.academic_year), 10),
    );
    years.sort((a, b) => Number(b.is_curr_ay ?? 0) - Number(a.is_curr_ay ?? 0));
    return years;
  } catch {
    return [];
  }
}

/** Angular `listAllMasterDetails(dashboardreport)`. */
export async function getVcDashboardReport(): Promise<VcDashRow | null> {
  const envelope = await fetchDetailsEnvelope<VcDashRow>(
    DASHBOARD_API.DASHBOARD_REPORT,
  );
  if (!envelope.success || !envelope.data) return null;
  return envelope.data;
}

export async function getFeeSummaryChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.FEE_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_fee_category_id: 0,
    in_year: year || "",
  });
}

export async function getApplicationSummaryChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.APPLICATION_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_academic_year_id: 0,
    in_course_year_id: 0,
    in_year: year || 0,
  });
}

export async function getScholarshipSummaryChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.FEE_SCH_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_year: year || "",
    in_course_code: "",
  });
}

export async function getSchoolWiseSalariesChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.SCHOOL_WISE_SALARIES, {
    in_districtId: 0,
    in_collegeId: collegeId,
    in_year: year || "",
    in_month: 0,
  });
}

export async function getSchoolWiseEmployeesChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.SCHOOL_WISE_EMPLOYEES, {
    in_districtId: 0,
    in_collegeId: collegeId,
    in_year: year || "",
  });
}

export async function getSchoolWiseStudentsChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.SCHOOL_WISE_STUDENTS, {
    in_districtId: 0,
    in_collegeId: collegeId,
    in_genderId: 0,
    in_year: year || "",
  });
}

export async function getIncomeExpenseSummaryChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.INCOME_EXPENSE_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_year: year || "",
    in_month: 0,
  });
}

export async function getFeeDiscountSummaryChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.FEE_DISCOUNT_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_fee_category_id: 0,
    in_year: year || "",
  });
}

export async function getExpenseSummaryChart(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.EXPENSE_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_year: year || "",
    in_month: 0,
  });
}

export async function getInventoryStockSummary(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.INVENTORY_STOCK_SUMMARY, {
    in_district_id: 0,
    in_clg_id: collegeId,
    in_year: year || "",
  });
}

export async function getLibrarySummary(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.LIBRARY_SUMMARY, {
    in_districtId: 0,
    in_collegeId: collegeId,
    in_year: year || "",
  });
}

export async function getTransportSummary(
  collegeId: number,
  year: string,
): Promise<VcDashRow[]> {
  return procRows(DASHBOARD_API.TRANSPORT_SUMMARY, {
    in_districtId: 0,
    in_collegeId: collegeId,
    in_year: year || "",
  });
}

export function persistDashboardReport(counts: VcDashRow | null): void {
  if (!counts || typeof counts !== "object") return;
  const date = String(counts.date ?? "");
  if (date) {
    try {
      globalThis.localStorage?.setItem("presentDate", date);
      const parts = date.split("-");
      if (parts[2]) globalThis.localStorage?.setItem("currentYear", parts[2]);
    } catch {
      // ignore
    }
  }
}
