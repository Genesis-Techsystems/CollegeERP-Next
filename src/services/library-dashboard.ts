/**
 * Librarian Dashboard — Angular `library-dashboard` API parity.
 */
import { AFFILIATED_COLLEGES_API } from "@/config/constants/api";
import { getAllRecords } from "./crud";
import { getLibraryConsolidatedReport } from "./library-reports";
import { leaveApplicationDateYmd } from "./staff-faculty-leaves";
import {
  getLeaveApplicationsForEmployee,
  type LeaveApplicationRow,
} from "./staff-dashboard";

export type LibrarianDashRow = Record<string, unknown>;

export type LibrarianLibrary = {
  fk_library_id: number;
  library_code: string;
  library_name?: string;
  flag?: string;
  [key: string]: unknown;
};

function procName(path: string): string {
  return path.startsWith("getAllRecords/")
    ? path.slice("getAllRecords/".length)
    : path;
}

/** Angular `momentYMD().split('-')[0]` / `counts.date` year for LeaveApplication. */
export function librarianLeaveYear(): number {
  const ymd = leaveApplicationDateYmd();
  const year = Number(ymd.split("-")[0]);
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

/**
 * Angular `getfilterDetails` — `s_get_collegewisedetails_bycode` `in_flag=lib_filters`,
 * keep result sets whose first row `flag === 'library_list'`.
 */
export async function getLibrarianLibraries(params: {
  organizationId: number;
  employeeId: number;
}): Promise<LibrarianLibrary[]> {
  const { organizationId, employeeId } = params;
  try {
    const data = await getAllRecords<{ result?: unknown[] }>(
      procName(AFFILIATED_COLLEGES_API.COLLEGE_WISE_DETAILS),
      {
        in_flag: "lib_filters",
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
    const result = Array.isArray(data?.result) ? data.result : [];
    for (const group of result) {
      if (!Array.isArray(group) || group.length === 0) continue;
      const first = group[0] as LibrarianDashRow;
      if (first?.flag !== "library_list") continue;
      return group
        .filter((row): row is LibrarianDashRow => !!row && typeof row === "object")
        .map((row) => ({
          ...row,
          fk_library_id: Number(row.fk_library_id ?? 0),
          library_code: String(row.library_code ?? ""),
          library_name: String(row.library_name ?? ""),
          flag: String(row.flag ?? ""),
        }));
    }
  } catch {
    return [];
  }
  return [];
}

/** Angular `listByIds(s_books_consolidated_report, libraryId, 'in_lib_id')`. */
export async function getLibrarianBooksReport(
  libraryId: number,
): Promise<LibrarianDashRow[]> {
  if (!libraryId) return [];
  try {
    return (await getLibraryConsolidatedReport(libraryId)) as LibrarianDashRow[];
  } catch {
    return [];
  }
}

export function sumLibrarianBookCounts(rows: LibrarianDashRow[]): {
  TotalBooksCount: number;
  InLibrary: number;
  IssuedBooks: number;
  DueBooks: number;
} {
  let TotalBooksCount = 0;
  let InLibrary = 0;
  let IssuedBooks = 0;
  let DueBooks = 0;
  for (const row of rows) {
    TotalBooksCount += Number(row.Total_Books ?? 0) || 0;
    InLibrary += Number(row.In_Library ?? 0) || 0;
    IssuedBooks += Number(row.Issued_Books ?? 0) || 0;
    DueBooks += Number(row.Due_Books ?? 0) || 0;
  }
  return { TotalBooksCount, InLibrary, IssuedBooks, DueBooks };
}

/** Angular unique `library_code` columns for the consolidated table. */
export function uniqueLibrarianCodes(
  rows: LibrarianDashRow[],
): LibrarianDashRow[] {
  const seen = new Set<string>();
  const out: LibrarianDashRow[] = [];
  for (const row of rows) {
    const code = String(row.library_code ?? "");
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(row);
  }
  return out;
}

/**
 * Angular leave history:
 * `LeaveApplication` `College.collegeId` + `employeeDetail.employeeId` + `leaveYear`
 * `order(applicationDate=asc)` then client sort DESC.
 */
export async function getLibrarianLeaveApplications(params: {
  collegeId: number;
  employeeId: number;
  leaveYear: number;
}): Promise<LeaveApplicationRow[]> {
  const { collegeId, employeeId, leaveYear } = params;
  if (!collegeId || !employeeId || !leaveYear) return [];
  try {
    return await getLeaveApplicationsForEmployee({
      collegeId,
      employeeId,
      leaveYear,
    });
  } catch {
    return [];
  }
}
