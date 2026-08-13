"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionUser } from "@/types/user";
import { useSession } from "@/hooks/useSession";

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  refetch: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  isLoading: true,
  refetch: () => {},
});

/** Last userId we synced role flags for — resets sticky HOD flags on account switch. */
let lastSyncedRoleUserId: number | null = null;

// Mirror the logged-in user's key fields into localStorage so the many pages
// that read localStorage.getItem('employeeId'/'organizationId'/…) (Angular
// convention) get real values from the /api/authorization session — not 0.
// Done in render (idempotent, only writes when changed) so the values are set
// before child pages' effects fire.
function syncUserToLocalStorage(user: SessionUser): void {
  if (typeof window === "undefined") return;
  const pairs: Array<[string, unknown]> = [
    ["employeeId", user.employeeId],
    ["organizationId", user.organizationId],
    // Angular login: localStorage.orgCode = organizationCode
    ["orgCode", user.organizationCode],
    ["universityId", user.universityId],
    ["universityCode", user.universityCode],
    ["collegeId", user.collegeId],
    ["collegeName", user.collegeName],
    // Angular login: localStorage.currentCollege = college name (school-calender print/header)
    ["currentCollege", user.collegeName],
    ["academicYearId", user.academicYearId],
    ["userId", user.userId],
    ["userName", user.userName],
    ["userRole", user.userRole],
    ["studentId", user.studentId],
    // rollNumber comes from Angular login getStudent() / page fetch — not userName.
  ];
  for (const [key, value] of pairs) {
    if (value == null || value === "") continue;
    // Never overwrite Angular localStorage IDs with 0 from a partial session.
    if (typeof value === "number" && value <= 0) {
      if (window.localStorage.getItem(key) === "0") {
        window.localStorage.removeItem(key);
      }
      continue;
    }
    const next = String(value);
    if (window.localStorage.getItem(key) !== next)
      window.localStorage.setItem(key, next);
  }
}

function syncSessionRoleFlags(user: SessionUser): void {
  if (typeof globalThis.window === "undefined") return;
  const storage = globalThis.localStorage;
  storage.setItem("isAdmin", user.isAdmin ? "true" : "false");
  storage.setItem("isDeprtAdmin", user.isDeptAdmin ? "true" : "false");
  storage.setItem("roleName", user.roleName ?? "");

  const userId = Number(user.userId) || 0;
  const userChanged = lastSyncedRoleUserId !== userId;
  if (userChanged) {
    lastSyncedRoleUserId = userId;
    // Fresh login / account switch: drop prior session's HOD/Principal sticky flags.
    // EmpDeptHeads may re-set isHOD=true later in this session via useStaffLoginContext.
    storage.setItem("isHOD", user.isHod ? "true" : "false");
    storage.setItem("isHODDashboard", user.isHod ? "true" : "false");
    storage.setItem("isPRINCIPAL", user.isPrincipal ? "true" : "false");
    return;
  }

  // Same user: only upgrade to true (EmpDeptHeads can set HOD after JWT session).
  if (user.isHod) {
    storage.setItem("isHOD", "true");
    storage.setItem("isHODDashboard", "true");
  }
  if (user.isPrincipal) {
    storage.setItem("isPRINCIPAL", "true");
  }
}

function SessionProviderInner({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  const session = useSession();

  // Use initialUser from server-side props to avoid loading flash
  const user = session.user ?? initialUser ?? null;
  const isLoading = session.isLoading && !initialUser;

  if (user) {
    syncUserToLocalStorage(user);
    syncSessionRoleFlags(user);
  } else {
    lastSyncedRoleUserId = null;
  }

  return (
    <SessionContext.Provider
      value={{ user, isLoading, refetch: session.refetch }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function SessionProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  return (
    <SessionProviderInner initialUser={initialUser}>
      {children}
    </SessionProviderInner>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
