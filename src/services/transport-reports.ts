/**
 * Transport Reports — Angular `reports/admin-transport-reports/*` parity.
 * Thin wrappers over existing Spring `getAllRecords` endpoints.
 */

import { TRANSPORT_API } from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { getAllRecords } from "./crud";

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

/** Vehicle Details — `s_get_vehicle_details?in_clg_id=` */
export async function getVehicleDetailsReport(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  try {
    const data = await getAllRecords(
      procName(TRANSPORT_API.GET_VEHICLE_DETAILS),
      { in_clg_id: collegeId },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Driver Details — `s_get_driver_details?in_clg_id=` */
export async function getDriverDetailsReport(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  try {
    const data = await getAllRecords(
      procName(TRANSPORT_API.GET_DRIVER_DETAILS),
      { in_clg_id: collegeId },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/** Route Details — `s_get_route_details?in_clg_id=` */
export async function getRouteDetailsReport(
  collegeId: number,
): Promise<AnyRow[]> {
  if (!collegeId) return [];
  try {
    const data = await getAllRecords(
      procName(TRANSPORT_API.GET_ROUTE_DETAILS),
      { in_clg_id: collegeId },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Transport Details By Class/Sec —
 * `s_get_std_transport` with Angular six-id keys.
 */
export async function getStudentTransportByClassReport(params: {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(TRANSPORT_API.GET_STUDENT_TRANSPORT),
      {
        in_clg_id: params.collegeId,
        in_academic_year_id: params.academicYearId,
        in_course_id: params.courseId,
        in_course_group_id: params.courseGroupId,
        in_course_year_id: params.courseYearId,
        in_group_section_id: params.groupSectionId,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}

/**
 * Route-Wise Students Details By Month —
 * `s_get_routewise_std_transport`
 */
export async function getRouteWiseStudentsByMonthReport(params: {
  collegeId: number;
  academicYearId: number;
  routeId: number;
  stopId: number;
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords(
      procName(TRANSPORT_API.GET_ROUTEWISE_STD_TRANSPORT),
      {
        in_clg_id: params.collegeId,
        in_acyear_id: params.academicYearId,
        in_route_id: params.routeId,
        in_stop_id: params.stopId,
      },
    );
    return firstResultGroup(data);
  } catch (error) {
    if (isNoRecordsError(error)) return [];
    throw error;
  }
}
