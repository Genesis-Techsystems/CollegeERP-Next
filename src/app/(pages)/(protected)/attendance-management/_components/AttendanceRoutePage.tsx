"use client";

import { getAttendanceConfig } from "../_lib/route-config";
import { AttendanceDashboardPage } from "./AttendanceDashboardPage";
import { AttendancePlaceholder } from "./AttendancePlaceholder";
import { StaffAttendanceNotMarkedListPage } from "./StaffAttendanceNotMarkedListPage";
import { WorkloadAdjustmentPage } from "@/app/(pages)/(protected)/staff-faculty-leaves/workload-adjustment/_components/WorkloadAdjustmentPage";

type AttendanceRoutePageProps = { slug: string };

export function AttendanceRoutePage({ slug }: AttendanceRoutePageProps) {
  const config = getAttendanceConfig(slug);

  if (config.kind === "hub" || slug === "" || slug === "attendance-dashboard") {
    return <AttendanceDashboardPage />;
  }

  if (slug === "staff-attendance-not-markedlist") {
    return <StaffAttendanceNotMarkedListPage />;
  }

  if (slug === "workload-adjustment") {
    return <WorkloadAdjustmentPage />;
  }

  return <AttendancePlaceholder slug={slug} />;
}
