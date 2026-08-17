"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CardHeadingTitle } from "@/common/components/data-display";
import { usePageNavLabel } from "@/common/components/breadcrumb";
import { PageContainer } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { GM_CODES } from "@/config/constants/ui";
import { resolveLoginEmployeeId } from "@/lib/user-context";
import {
  getUserAccess,
  listEmployeeDataSecurityByEmployeeId,
  listGeneralDetailsByMaster,
} from "@/services";
import { EventsCalendarPanel } from "./EventsCalendarPanel";

function readStorageNum(key: string): number {
  if (typeof globalThis.window === "undefined") return 0;
  const n = Number(globalThis.localStorage.getItem(key) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readUserDetails(): Record<string, unknown> {
  if (typeof globalThis.window === "undefined") return {};
  try {
    const raw = globalThis.localStorage.getItem("userDetails");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resolveUserId(user: { userId?: number } | null): number {
  const details = readUserDetails();
  const n = Number(
    user?.userId || readStorageNum("userId") || details.userId || 0,
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Registrar Login — Angular `event-calendar/student-events` on open:
 * 1. domain/list/EmployeeDataSecurity?query=employeeDetailId.employeeId=={id}.and.isActive==true
 * 2. api/useraccess?userId={id}&status=true
 * 3. domain/list/GeneralDetail?query=GeneralMaster.generalMasterCode==AUDTYPE.and.isActive==true
 */
export function RegistrarEventsCalendarPage() {
  const navLabel = usePageNavLabel();
  const pageTitle = navLabel ?? "Events Calendar";
  const { user } = useSessionContext();
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const employeeId = resolveLoginEmployeeId(user);
  const userId = resolveUserId(user);

  useQuery({
    queryKey: ["registrar-events-calendar", "EmployeeDataSecurity", employeeId],
    queryFn: () => listEmployeeDataSecurityByEmployeeId(employeeId),
    enabled: employeeId > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useQuery({
    queryKey: ["registrar-events-calendar", "useraccess", userId],
    queryFn: () => getUserAccess(userId),
    enabled: userId > 0,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useQuery({
    queryKey: ["registrar-events-calendar", "AUDTYPE"],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.AUDIENCE),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <PageContainer className="space-y-3">
      <div className="app-card overflow-hidden">
        <div className="app-data-table-heading">
          <CardHeadingTitle>{pageTitle}</CardHeadingTitle>
        </div>
      </div>

      <EventsCalendarPanel
        variant="staff"
        embedded
        splitCards
        viewMonth={viewMonth}
        onViewMonthChange={(month) => {
          setViewMonth(month);
          setSelectedDate(month);
        }}
        events={[]}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        readOnly
        sidebarEmptyMessage="No Events in this month."
      />
    </PageContainer>
  );
}
