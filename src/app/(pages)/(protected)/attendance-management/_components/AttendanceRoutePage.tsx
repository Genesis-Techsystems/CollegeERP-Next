"use client";

import { getAttendanceConfig } from "../_lib/route-config";
import { AttendanceDashboardPage } from "./AttendanceDashboardPage";
import { AttendancePlaceholder } from "./AttendancePlaceholder";
import { MarkAttendanceParentPage } from "./MarkAttendanceParentPage";
import { StaffAttendanceNotMarkedListPage } from "./StaffAttendanceNotMarkedListPage";
import { WorkloadAdjustmentPage } from "@/app/(pages)/(protected)/staff-faculty-leaves/workload-adjustment/_components/WorkloadAdjustmentPage";
import { MarkClassAttendancePage } from "@/app/(pages)/(protected)/staff-classes/_components/MarkClassAttendancePage";
import { ViewStudentAttendancePage } from "@/app/(pages)/(protected)/staff-classes/_components/ViewStudentAttendancePage";

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

  // Angular staff-classes/attendance-update (update-mark-attendance)
  if (slug === "mark-attendance") {
    return <MarkAttendanceParentPage />;
  }
  if (slug === "mark-attendance/mark-attendance") {
    return <MarkClassAttendancePage mode="mark" />;
  }
  if (slug === "mark-attendance/view-attendance") {
    return <ViewStudentAttendancePage />;
  }

  return <AttendancePlaceholder slug={slug} />;
}
