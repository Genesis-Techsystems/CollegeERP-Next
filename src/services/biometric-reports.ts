/**
 * Angular `reports/student-attendance-reports/{admin-biometric-jobs,biometric-tablelist,
 * student-biometric-device-report}` parity.
 */

import {
  ATTENDANCE_API,
  ROOM_DETAILS_API,
  SETUP_API,
} from "@/config/constants/api";
import { domainList, domainListPaginated, getAllRecords } from "./crud";

export type BiometricReportRow = Record<string, unknown>;

type AnyRow = BiometricReportRow;

function asResultSets(data: unknown): AnyRow[][] {
  if (!data || typeof data !== "object") return [];
  const result = (data as { result?: unknown }).result;
  if (!Array.isArray(result)) return [];
  if (result.length > 0 && Array.isArray(result[0])) {
    return result.map((g) =>
      Array.isArray(g)
        ? g.filter((r): r is AnyRow => !!r && typeof r === "object")
        : [],
    );
  }
  if (result.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
    return [result as AnyRow[]];
  }
  return [];
}

function firstResultSet(data: unknown): AnyRow[] {
  return asResultSets(data)[0] ?? [];
}

function emptyOnNoRecord(error: unknown): null {
  const msg = String(error instanceof Error ? error.message : (error ?? ""));
  if (msg.toLowerCase().includes("no record")) return null;
  throw error;
}

/**
 * Angular `JobsUrl` → `domain/list/Jobs?query=order(createdDt=desc)&page=0&size=9999`
 * (`admin-biometric-jobs`). From/To dates are shown in the header only — not
 * sent to the API, matching Angular's `getDetailsByDetailsWithPageNation`.
 */
export async function fetchBiometricJobs(): Promise<AnyRow[]> {
  try {
    const { rows } = await domainListPaginated<AnyRow>(
      SETUP_API.JOBS,
      0,
      9999,
      "order(createdDt=desc)",
    );
    return rows;
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/**
 * Angular `TableListUrl` → `domain/list/TableList?query=order(createdDt=desc)&page=0&size=9999`
 * (`admin-biometric-tablelist`).
 */
export async function fetchBiometricTableList(): Promise<AnyRow[]> {
  try {
    const { rows } = await domainListPaginated<AnyRow>(
      SETUP_API.TABLE,
      0,
      9999,
      "order(createdDt=desc)",
    );
    return rows;
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/** Angular `EttlDevicesUrl` — biometric device dropdown (`student-biometric-device-report`). */
export async function fetchBiometricDevices(): Promise<AnyRow[]> {
  try {
    return await domainList<AnyRow>(ROOM_DETAILS_API.ETTL_DEVICES);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/**
 * Angular `getBiometricUsersUrl` → `getAllRecords/s_get_biometric_users`
 * — employee/student search-as-you-type, only fired after 4+ characters typed
 * (mirrors Angular `enteredStudent`).
 */
export async function searchBiometricUsers(params: {
  userId?: number | string;
  searchStr: string;
  isEmployeeStudent: "" | "EMP" | "STD";
}): Promise<AnyRow[]> {
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      ATTENDANCE_API.GET_BIOMETRIC_USERS,
      {
        in_flag: "",
        in_user_id: params.userId ?? 0,
        in_search_str: params.searchStr,
        in_is_employee_student: params.isEmployeeStudent,
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}

/**
 * Angular `combinedDeviceLogsUrl` → `getAllRecords/s_get_combined_device_logs`
 * (`student-biometric-device-report` / Biometric Device Log Report).
 * `is_std_flag`: ''→2 (all), 'STD'→1, 'EMP'→0.
 */
export async function fetchCombinedDeviceLogs(params: {
  userId: number | string;
  startDate: string;
  endDate: string;
  deviceId: number | string;
  isFor: "" | "EMP" | "STD";
}): Promise<AnyRow[]> {
  const stdFlag = params.isFor === "" ? 2 : params.isFor === "STD" ? 1 : 0;
  try {
    const data = await getAllRecords<{ result?: unknown }>(
      ATTENDANCE_API.COMBINED_DEVICE_LOGS,
      {
        in_user_id: params.userId,
        in_start_date: params.startDate,
        in_end_date: params.endDate,
        in_device_id: params.deviceId,
        is_std_flag: stdFlag,
      },
    );
    return firstResultSet(data);
  } catch (error) {
    return emptyOnNoRecord(error) ?? [];
  }
}
