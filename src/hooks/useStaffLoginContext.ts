"use client";

import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import {
  resolveStaffDeptId,
  resolveStaffIsHod,
  type EmployeeLoginContext,
} from "@/lib/employee-login-context";
import { resolveLoginEmployeeId } from "@/lib/user-context";
import { getEmployeeLoginContextByUserId } from "@/services/auth";
import type { SessionUser } from "@/types/user";

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Angular login parity: `employeedetailsbyid` → `isHOD`, `empDeptId`, `uName`.
 * Used by assignments (HOD radios + employee search) and similar staff pages.
 */
export function useStaffLoginContext(
  user: SessionUser | null,
  sessionLoading: boolean,
) {
  const cachedEmployeeId = resolveLoginEmployeeId(user);

  const { data: loginCtx, isLoading: ctxLoading } =
    useQuery<EmployeeLoginContext | null>({
      queryKey: QK.staffLoginContext(user?.userId ?? 0),
      queryFn: () => getEmployeeLoginContextByUserId(user!.userId),
      enabled: !sessionLoading && Boolean(user?.userId),
      staleTime: Number.POSITIVE_INFINITY,
    });

  const employeeId = positiveId(
    loginCtx?.employeeId,
    cachedEmployeeId,
    user?.employeeId,
  );
  const isHod = resolveStaffIsHod(user, loginCtx);
  const deptId = resolveStaffDeptId(loginCtx);

  return {
    employeeId,
    isHod,
    deptId,
    loginCtx,
    isResolving: sessionLoading || ctxLoading,
  };
}
