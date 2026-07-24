/**
 * Angular parity: user-management/user-logs
 *
 * GET `{MAINAPI}api/auth/authdetails?loginTime={YYYY/MM/DD}&logoutTime={YYYY/MM/DD}&size=50`
 * via `listByThreeIds(securityAuthorizationCrudUrl, fdate, tdate, 50, 'loginTime', 'logoutTime', 'size')`
 *
 * Response: envelope `data` is the log array when `success` is true.
 * Print/download is commented out in Angular — not implemented.
 */

import { AUTH_API } from "@/config/constants/api";
import { toExamApiDate } from "@/common/generic-functions";
import { fetchDetailsEnvelope } from "@/services/crud";

export interface UserLog {
  userName?: string | null;
  loginTime?: string | null;
  logoutTime?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface UserLogsResult {
  rows: UserLog[];
  message?: string;
  success: boolean;
}

const USER_LOGS_PAGE_SIZE = 50;

function asRows(data: unknown): UserLog[] {
  if (Array.isArray(data)) return data as UserLog[];
  if (data && typeof data === "object") return [data as UserLog];
  return [];
}

/**
 * Angular `getUserLogs` — dates sent as `YYYY/MM/DD` under loginTime / logoutTime keys.
 */
export async function listUserLogs(
  fromDate: Date | string,
  toDate: Date | string,
): Promise<UserLogsResult> {
  const loginTime = toExamApiDate(fromDate);
  const logoutTime = toExamApiDate(toDate);
  if (!loginTime || !logoutTime) {
    return { rows: [], success: false, message: "Invalid date range" };
  }

  const envelope = await fetchDetailsEnvelope<UserLog[] | UserLog>(
    AUTH_API.AUTH_DETAILS,
    {
      loginTime,
      logoutTime,
      size: USER_LOGS_PAGE_SIZE,
    },
  );

  return {
    rows: envelope.success ? asRows(envelope.data) : [],
    message: envelope.message,
    success: Boolean(envelope.success),
  };
}
