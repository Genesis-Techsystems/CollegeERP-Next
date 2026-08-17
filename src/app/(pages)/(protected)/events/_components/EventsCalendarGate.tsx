"use client";

import { useSessionContext } from "@/context/SessionContext";
import { isRegistrarLogin } from "@/lib/erp-modules-navigation-utils";
import { CollegeEventsPage } from "./CollegeEventsPage";
import { RegistrarEventsCalendarPage } from "./RegistrarEventsCalendarPage";

function isRegistrarSession(
  user: {
    userRole?: string;
    roleName?: string;
  } | null,
): boolean {
  if (isRegistrarLogin()) return true;
  const role = String(user?.userRole ?? "").toUpperCase();
  const name = String(user?.roleName ?? "").toUpperCase();
  return role.includes("REGISTRAR") || name.includes("REGISTRAR");
}

type EventsCalendarGateProps = {
  /** Used when this gate also wraps staff-events; other logins keep that variant. */
  fallbackVariant?: "student" | "staff";
};

/** Registrar uses Angular student-events APIs only; other logins keep CollegeEventsPage. */
export function EventsCalendarGate({
  fallbackVariant = "student",
}: EventsCalendarGateProps) {
  const { user, isLoading } = useSessionContext();

  if (isRegistrarSession(user)) {
    return <RegistrarEventsCalendarPage />;
  }

  // Do not mount CollegeEventsPage until role is known — that page fires extra APIs.
  if (isLoading) return null;

  return (
    <CollegeEventsPage title="Events Calendar" variant={fallbackVariant} />
  );
}
