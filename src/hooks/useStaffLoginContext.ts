"use client";

import { useQuery } from "@tanstack/react-query";
import { QK } from "@/lib/query-keys";
import {
  isEmployeeDepartmentHead,
  resolveStaffDeptId,
  resolveStaffIsHod,
  syncEmployeeLoginContextToStorage,
  type EmployeeLoginContext,
} from "@/lib/employee-login-context";
import { resolveLoginEmployeeId } from "@/lib/user-context";
import {
  getEmployeeLoginContextByUserId,
  listDepartmentHeads,
} from "@/services";
import type { SessionUser } from "@/types/user";

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

/**
 * Angular login parity: `employeedetailsbyid` + EmpDeptHeads → `isHOD`, `empDeptId`.
 * Assignments radios use `isHod === true` the same way Angular uses
 * `localStorage.getItem('isHOD') === 'true'`.
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

  // Angular login also marks HOD when the employee is in EmpDeptHeads.
  const { data: deptHeadMatch, isLoading: headsLoading } = useQuery({
    queryKey: QK.staffLoginDeptHead(employeeId),
    queryFn: async () => {
      const heads = await listDepartmentHeads();
      return isEmployeeDepartmentHead(
        employeeId,
        heads as Array<Record<string, unknown>>,
      );
    },
    enabled: !sessionLoading && employeeId > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const headsResolved = employeeId <= 0 || !headsLoading;
  const loginResolved = !ctxLoading;

  const mergedCtx: EmployeeLoginContext | null = (() => {
    if (!loginResolved || !headsResolved) return loginCtx ?? null;

    const base: EmployeeLoginContext = loginCtx ?? {
      employeeId,
      empDeptId: 0,
      isHod: false,
      uName: "",
      empNumber: "",
    };
    const isHod = base.isHod || Boolean(deptHeadMatch?.isHod);
    const empDeptId = positiveId(base.empDeptId, deptHeadMatch?.empDeptId);
    const next = { ...base, employeeId, isHod, empDeptId };
    // Always sync after settle — clears stale isHODDashboard from a prior login.
    if (employeeId > 0) syncEmployeeLoginContextToStorage(next);
    return next;
  })();

  const isHod = resolveStaffIsHod(user, mergedCtx);
  const deptId = resolveStaffDeptId(mergedCtx);

  return {
    employeeId,
    isHod,
    deptId,
    loginCtx: mergedCtx,
    isResolving:
      sessionLoading || ctxLoading || (employeeId > 0 && headsLoading),
  };
}
