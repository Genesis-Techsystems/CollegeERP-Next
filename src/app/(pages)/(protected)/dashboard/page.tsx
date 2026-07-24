"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { Breadcrumb, useBreadcrumb } from "@/common/components/breadcrumb";
import { PageContainer } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { getDigitalLiveClassEnv, readDashStorage } from "@/services";
import type { SessionUser, UserRoleEntry } from "@/types/user";
import { StaffDashboard } from "./_components/StaffDashboard";

// ─── Role tab visibility (Angular main-dashboard.component.ts) ───────────────

interface DashboardTabs {
  showMy: boolean;
  showAdmin: boolean;
  showHod: boolean;
  hodLabel: string;
  showPrincipal: boolean;
  principalLabel: string;
  showEvaluator: boolean;
  showModerator: boolean;
  showManagement: boolean;
  showVc: boolean;
  vcLabel: string;
  showVision: boolean;
}

function readUserRolesFromStorage(): UserRoleEntry[] {
  try {
    const raw = readDashStorage("userDetails");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { userRoles?: UserRoleEntry[] };
    return Array.isArray(parsed.userRoles) ? parsed.userRoles : [];
  } catch {
    return [];
  }
}

/**
 * Angular main-dashboard tab flags come from login `userRoles[]` + localStorage
 * (`isHODDashboard`, `isPRINCIPAL`, `isMgnt`) — NOT from SessionUser.isAdmin.
 * SUPERADMIN alone must NOT show Admin Dashboard (`*ngIf="userRole === 'ADMIN'"`
 * is only set when roleName === "ADMIN").
 */
function resolveDashboardTabs(user: SessionUser): DashboardTabs {
  const roles = readUserRolesFromStorage();
  const roleNames = roles.map((r) => String(r.roleName ?? ""));
  const hasRole = (name: string) =>
    roleNames.some((r) => r.toUpperCase() === name.toUpperCase());

  // Angular: userRole = 'ADMIN' only when userRoles contains roleName ADMIN
  // Do NOT use SessionUser.isAdmin (true for SUPERADMIN) — that was showing an extra tab
  const showAdmin =
    hasRole("ADMIN") || user.userRole === "ADMIN" || user.roleName === "ADMIN";

  let showHod =
    readDashStorage("isHODDashboard") === "true" ||
    hasRole("HOD") ||
    hasRole("CHAIRPERSON");
  let showPrincipal =
    readDashStorage("isPRINCIPAL") === "true" ||
    hasRole("PRINCIPAL") ||
    hasRole("DEAN");
  const showEvaluator = hasRole("Online Evaluator") || hasRole("Evaluator");
  const showModerator =
    hasRole("Moderator") || roles.some((r) => Number(r.roleId) === 116);
  const showManagement = readDashStorage("isMgnt") === "true";
  const showVc =
    hasRole("VICECHANCELLOR") ||
    hasRole("CENTER INCHARGE") ||
    readDashStorage("roleName") === "VICECHANCELLOR" ||
    readDashStorage("roleName") === "CENTER INCHARGE";

  const hodLabel = hasRole("CHAIRPERSON")
    ? "Chairperson Dashboard"
    : "HOD Dashboard";
  const principalLabel = hasRole("DEAN")
    ? "Dean Dashboard"
    : "Principal Dashboard";
  const vcLabel =
    readDashStorage("roleName") === "CENTER INCHARGE"
      ? "Center Incharge Dashboard"
      : "Vice Chancellor Dashboard";

  // Angular starts isStaff = 'true'; only Evaluator/Moderator-only can hide it
  let showMy = true;
  if (showEvaluator && !roleNames.some((r) => r === "STAFF") && !showAdmin) {
    const onlyEval =
      roleNames.length > 0 &&
      roleNames.every((r) => r === "Online Evaluator" || r === "Evaluator");
    if (onlyEval) showMy = false;
  }
  if (showModerator && !roleNames.some((r) => r === "STAFF") && !showAdmin) {
    const onlyMod =
      roleNames.length > 0 && roleNames.every((r) => r === "Moderator");
    if (onlyMod) showMy = false;
  }
  // Always show My Dashboard for typical login users (Angular default isStaff)
  if (user.userTypeCode === "STAFF" || user.userRole === "STAFF" || showAdmin) {
    showMy = true;
  }
  // SUPERADMIN / ACCOUNTS / etc. still get My Dashboard when isStaff default
  if (!showEvaluator && !showModerator) showMy = true;

  const showVision = getDigitalLiveClassEnv() === "TEAMS";

  return {
    showMy,
    showAdmin,
    showHod,
    hodLabel,
    showPrincipal,
    principalLabel,
    showEvaluator,
    showModerator,
    showManagement,
    showVc,
    vcLabel,
    showVision,
  };
}

function RoleDashboardPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
        This role dashboard lived in a separate Angular module and is not yet
        migrated. Use My Dashboard for leave, biometric, sessions, and
        notifications (Angular staff-dashboard parity).
      </p>
    </div>
  );
}

function VisionMissionPanel({ deptName }: { deptName: string | null }) {
  return (
    <div className="space-y-4 bg-card rounded-md border border-border p-4 leading-relaxed">
      <div>
        <p className="text-lg font-semibold text-foreground">
          <span className="text-blue-600 font-medium">Institution</span> Vision
          and Mission
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium text-orange-600">VISION :</span>
          <br />
          To produce ethical, socially conscious and innovative professionals
          who would contribute to sustainable technological development of the
          society
        </p>
        <p className="mt-2 text-sm">
          <span className="font-medium text-cyan-600">MISSION :</span>
          <br />
          To impart quality engineering education with latest technological
          developments and interdisciplinary skills to make students succeed in
          professional practice.
          <br />
          To encourage research culture among faculty and students by
          establishing state of art laboratories and exposing them to modern
          industrial and organizational practices.
          <br />
          To inculcate humane qualities like environmental consciousness,
          leadership, social values, professional ethics and engage in
          independent and lifelong learning for sustainable contribution to the
          society.
        </p>
      </div>
      {deptName ? (
        <p className="text-xs text-muted-foreground">
          Department vision/mission for <strong>{deptName}</strong> is
          configured in Angular constants when available for the college.
        </p>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <PageContainer className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-[420px] w-full" />
    </PageContainer>
  );
}

const QUICK_LINKS = [
  {
    label: "My Timetable",
    href: "/time-table-management/view-timetable",
  },
  {
    label: "Workload",
    href: "/hr-payroll/leave-management/workload-adjustment",
  },
  {
    label: "My Classes",
    href: "/attendance-management/my-classes",
  },
  { label: "Events", href: "/events/staff-events" },
  {
    label: "Counseling",
    href: "/staff-reports/ptm-summary-report",
  },
] as const;

export default function DashboardPage() {
  const { user, isLoading } = useSessionContext();
  const breadcrumbs = useBreadcrumb();
  const { employeeId, isResolving } = useLoginEmployeeId(user, isLoading);
  const [tab, setTab] = useState("my");

  const tabs = useMemo(
    () => (user ? resolveDashboardTabs(user) : null),
    [user],
  );

  const showReportLink =
    readDashStorage("isHODDashboard") === "true" || Boolean(user?.isHod);
  const deptName = readDashStorage("deptName");

  if (isLoading || isResolving) return <DashboardSkeleton />;
  if (!user || !tabs) return null;

  const defaultTab = tabs.showMy
    ? "my"
    : tabs.showAdmin
      ? "admin"
      : tabs.showHod
        ? "hod"
        : "my";

  return (
    <PageContainer className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Breadcrumb items={breadcrumbs} maxItems={5} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quick links"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {QUICK_LINKS.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
            {showReportLink ? (
              <DropdownMenuItem asChild>
                <Link href="/staff-reports/student-result-summary-report">
                  Report
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={tab || defaultTab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0 border-b border-border rounded-none w-full">
          {tabs.showMy ? (
            <TabsTrigger
              value="my"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:bg-amber-400/90 data-[state=active]:text-slate-900 px-4"
            >
              My Dashboard
            </TabsTrigger>
          ) : null}
          {tabs.showAdmin ? (
            <TabsTrigger value="admin" className="rounded-none px-4">
              Admin Dashboard
            </TabsTrigger>
          ) : null}
          {tabs.showHod ? (
            <TabsTrigger value="hod" className="rounded-none px-4">
              {tabs.hodLabel}
            </TabsTrigger>
          ) : null}
          {tabs.showPrincipal ? (
            <TabsTrigger value="principal" className="rounded-none px-4">
              {tabs.principalLabel}
            </TabsTrigger>
          ) : null}
          {tabs.showEvaluator ? (
            <TabsTrigger value="examiner" className="rounded-none px-4">
              Examiner Dashboard
            </TabsTrigger>
          ) : null}
          {tabs.showModerator ? (
            <TabsTrigger value="moderator" className="rounded-none px-4">
              Moderator Dashboard
            </TabsTrigger>
          ) : null}
          {tabs.showManagement ? (
            <TabsTrigger value="management" className="rounded-none px-4">
              Management Dashboard
            </TabsTrigger>
          ) : null}
          {tabs.showVc ? (
            <TabsTrigger value="vc" className="rounded-none px-4">
              {tabs.vcLabel}
            </TabsTrigger>
          ) : null}
          {tabs.showVision ? (
            <TabsTrigger value="vision" className="rounded-none px-4">
              Vision and Mission
            </TabsTrigger>
          ) : null}
        </TabsList>

        {tabs.showMy ? (
          <TabsContent value="my" className="mt-4">
            <StaffDashboard user={user} employeeId={employeeId} />
          </TabsContent>
        ) : null}

        {tabs.showAdmin ? (
          <TabsContent value="admin" className="mt-4">
            <RoleDashboardPlaceholder title="Admin Dashboard" />
          </TabsContent>
        ) : null}
        {tabs.showHod ? (
          <TabsContent value="hod" className="mt-4">
            <RoleDashboardPlaceholder title={tabs.hodLabel} />
          </TabsContent>
        ) : null}
        {tabs.showPrincipal ? (
          <TabsContent value="principal" className="mt-4">
            <RoleDashboardPlaceholder title={tabs.principalLabel} />
          </TabsContent>
        ) : null}
        {tabs.showEvaluator ? (
          <TabsContent value="examiner" className="mt-4">
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <p className="text-sm">
                Examiner dashboard is available at{" "}
                <Link
                  className="text-primary underline"
                  href="/dashboards/evaluation-dashboard"
                >
                  Evaluation Dashboard
                </Link>
                .
              </p>
            </div>
          </TabsContent>
        ) : null}
        {tabs.showModerator ? (
          <TabsContent value="moderator" className="mt-4">
            <RoleDashboardPlaceholder title="Moderator Dashboard" />
          </TabsContent>
        ) : null}
        {tabs.showManagement ? (
          <TabsContent value="management" className="mt-4">
            <RoleDashboardPlaceholder title="Management Dashboard" />
          </TabsContent>
        ) : null}
        {tabs.showVc ? (
          <TabsContent value="vc" className="mt-4">
            <RoleDashboardPlaceholder title={tabs.vcLabel} />
          </TabsContent>
        ) : null}
        {tabs.showVision ? (
          <TabsContent value="vision" className="mt-4">
            <VisionMissionPanel deptName={deptName} />
          </TabsContent>
        ) : null}
      </Tabs>
    </PageContainer>
  );
}
