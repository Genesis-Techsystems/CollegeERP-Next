/**
 * Library Reports — Angular `reports/admin-library-reports/*` parity.
 * Thin wrappers over existing Spring `getAllRecords` / `titlesreport` endpoints.
 */

import { CERTIFICATE_API, LIBRARY_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import { getErrorMessage } from "@/lib/errors";
import { buildQuery, domainList, fetchDetails, getAllRecords } from "./crud";

type AnyRow = Record<string, unknown>;

/** Angular library reports college lookup — `domain/list/College?query=isActive==true`. */
export async function listActiveCollegesForLibraryReports(): Promise<AnyRow[]> {
  return domainList<AnyRow>(
    ENTITIES.COLLEGE.name,
    buildQuery({ isActive: true }),
  );
}

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
    if (Array.isArray(obj.data)) {
      return firstResultGroup(obj.data);
    }
  }
  return [];
}

function asRowList(data: unknown): AnyRow[] {
  if (Array.isArray(data)) {
    return data.filter(
      (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
    );
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.result)) {
      if (obj.result.length > 0 && Array.isArray(obj.result[0])) {
        return firstResultGroup(obj);
      }
      return obj.result.filter(
        (r): r is AnyRow => !!r && typeof r === "object" && !Array.isArray(r),
      );
    }
    if (Array.isArray(obj.data)) return asRowList(obj.data);
  }
  return [];
}

/** Day Wise Book Issues — `s_rep_lib_day_wise_book_issue` */
export async function getDayWiseBookIssueReport(params: {
  fromDate: string;
  toDate: string;
  libraryId: number;
  bookcatId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(LIBRARY_API.DAY_WISE_BOOK_ISSUE),
      {
        in_fdate: params.fromDate,
        in_tdate: params.toDate,
        in_lib_id: params.libraryId,
        in_lib_bookcat_id: params.bookcatId,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Day Wise Book Returns — `s_rep_day_wise_book_returns` (single date) */
export async function getDayWiseBookReturnReport(params: {
  fromDate: string;
  libraryId: number;
  bookcatId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(LIBRARY_API.DAY_WISE_BOOK_RETURNS),
      {
        in_fdate: params.fromDate,
        in_lib_id: params.libraryId,
        in_lib_bookcat_id: params.bookcatId,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Day Wise Library Fine Collection report —
 * Angular `libraruFineCollectionUrl` → `s_rep_lib_fine_collection`
 * (distinct from fee-collection UI `s_rep_lib_fee_collection`).
 */
export async function getLibraryFineCollectionDayWiseReport(params: {
  libraryId: number;
  studentId: number;
  fromDate: string;
  toDate: string;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(LIBRARY_API.LIB_FINE_COLLECTION_REPORT),
      {
        in_libId: params.libraryId,
        in_studentId: params.studentId,
        in_fdate: params.fromDate,
        in_tdate: params.toDate,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Titles Report — Angular `titlesreport?bookcatId=&size=99999`
 * (`listByIdWithPagination`).
 */
export async function getTitlesReport(bookcatId: number): Promise<AnyRow[]> {
  if (!bookcatId) return [];
  try {
    const data = await fetchDetails<unknown>(CERTIFICATE_API.TITLES_REPORT, {
      bookcatId,
      size: 99999,
    });
    return asRowList(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Book Count by Course/Author — `s_rep_lib_book_wise_count` */
export async function getLibBookWiseCountReport(params: {
  libraryId: number;
  bookcatId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(LIBRARY_API.LIB_BOOK_WISE_COUNT),
      {
        in_lib_id: params.libraryId,
        in_bookcat: params.bookcatId,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Angular fine-collection student search:
 * `studentsearch?q=` (min 5 chars).
 */
export async function searchStudentsForLibraryFineReport(
  q: string,
): Promise<AnyRow[]> {
  const term = q.trim();
  if (term.length < 5) return [];
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.STUDENT_SEARCH, {
      q: term,
    });
    return asRowList(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Book Wise Count — Angular `bookwisecountreport?bookcatId=`
 * (UI list endpoint; not `s_rep_lib_book_wise_count`).
 */
export async function getBookWiseCountReport(
  bookcatId: number,
): Promise<AnyRow[]> {
  if (!bookcatId) return [];
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.BOOK_WISE_REPORT, {
      bookcatId,
      page: 0,
      size: 99999,
    });
    return asRowList(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Total Books Reports — Angular `totalbookreport?bookcatId=` */
export async function getTotalBooksReport(
  bookcatId: number,
): Promise<AnyRow[]> {
  if (!bookcatId) return [];
  try {
    const data = await fetchDetails<unknown>(LIBRARY_API.TOTAL_BOOK_REPORT, {
      bookcatId,
    });
    return asRowList(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Library Books / Consolidated Report —
 * Angular `getAllRecords/s_books_consolidated_report?in_lib_id=`
 */
export async function getLibraryConsolidatedReport(
  libraryId: number,
): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(LIBRARY_API.BOOKS_CONSOLIDATED_REPORT),
      { in_lib_id: libraryId },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Book Search Report —
 * Angular `bookdetailsearchreport?q=&filter=`
 */
export async function getBookDetailSearchReport(params: {
  q: string;
  filter: string;
}): Promise<AnyRow[]> {
  const term = params.q.trim();
  if (!term || !params.filter) return [];
  try {
    const data = await fetchDetails<unknown>(
      CERTIFICATE_API.BOOK_DETAIL_SEARCH_REPORT,
      { q: term, filter: params.filter },
    );
    return asRowList(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Periodical Reports — Angular `getAllRecords/s_rep_lib_periodcalls` */
export async function getPeriodicalReports(): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(LIBRARY_API.LIB_PERIODICALS_REPORT),
      {},
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}
