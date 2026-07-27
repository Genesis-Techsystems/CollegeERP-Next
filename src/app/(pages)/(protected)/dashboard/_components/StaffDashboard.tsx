"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Video } from "lucide-react";
import { PieChart } from "@/common/components/charts";
import { StatusBadge } from "@/common/components/data-display";
import { DataTable } from "@/common/components/table";
import { SearchInput } from "@/common/components/search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MINIO_URL } from "@/config/constants/api";
import { QK } from "@/lib/query-keys";
import { toastInfo } from "@/lib/toast";
import {
  buildLeaveSummaryChartData,
  formatAttendanceProcDate,
  formatClassDateYmdSlash,
  getAudienceTypes,
  getDigitalLiveClassEnv,
  getEmpAttendanceDetail,
  getEmpLeaveTotals,
  getLeaveApplicationsForEmployee,
  getLiveClassSchedules,
  getManagementReport,
  getNotificationsByAudience,
  getStaffSubjectsForToday,
  mergeClassesWithSchedules,
  readDashStorage,
  readDashStorageNum,
  resolveZoomHostUrl,
  tConvert,
  type DashboardNotification,
  type LeaveApplicationRow,
  type LeaveTotalRow,
  type LiveScheduleRow,
  type StaffSubjectClass,
} from "@/services";
import type { SessionUser } from "@/types/user";
import { LoginCalendar } from "./LoginCalendar";

interface StaffDashboardProps {
  user: SessionUser;
  employeeId: number;
}

const LEAVE_PALETTE = [
  "#5d62b5",
  "#f2726f",
  "#62b58f",
  "#f2726f",
  "#ffc533",
  "#f2726f",
  "#80d3e6",
  "#f2726f",
  "#7E456B",
  "#f2726f",
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  } as ColDef<LeaveApplicationRow>,
  leaveType: {
    headerName: "Leave Type",
    minWidth: 110,
    // Angular matColumnDef leaveName displays row.leaveCode
    valueGetter: (p) => String(p.data?.leaveCode ?? p.data?.leaveName ?? ""),
  } as ColDef<LeaveApplicationRow>,
  leaveDescription: {
    field: "leaveDescription",
    headerName: "Leave Description",
    minWidth: 160,
  } as ColDef<LeaveApplicationRow>,
  leaveDate: {
    headerName: "Leave Date",
    minWidth: 200,
    valueGetter: (p) => formatLeaveDateRange(p.data),
  } as ColDef<LeaveApplicationRow>,
  assigned: {
    field: "assignedEmployeeFirstName",
    headerName: "Assigned To",
    minWidth: 120,
  } as ColDef<LeaveApplicationRow>,
  status: {
    field: "leaveprocessStatusCode",
    headerName: "Status",
    minWidth: 130,
  } as ColDef<LeaveApplicationRow>,
};

function formatLeaveDatePart(value: unknown): string {
  if (value == null || value === "") return "";
  try {
    const raw = String(value);
    const d = raw.includes("T")
      ? parseISO(raw)
      : new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, "dd MMM, yyyy");
  } catch {
    return String(value);
  }
}

function formatLeaveDateRange(row?: LeaveApplicationRow | null): string {
  if (!row) return "";
  const from = formatLeaveDatePart(row.leaveFromDate);
  const to = formatLeaveDatePart(row.leaveToDate);
  if (from && to) return `${from} - ${to}`;
  return from || to || "";
}

function statusRenderer(p: ICellRendererParams<LeaveApplicationRow>) {
  const code = String(p.data?.leaveprocessStatusCode ?? "");
  const label =
    String(p.data?.leaveprocessStatusDisplayName ?? "").trim() || code || "—";
  if (code === "LPSCOMPLETE" || code === "LPSAPPROVED") {
    return <StatusBadge status="active" label={label} />;
  }
  if (code === "LPSREJECTED" || code === "LPSCANCEL") {
    return <StatusBadge status="inactive" label={label} />;
  }
  if (code === "LPSAPPLIED") {
    return <StatusBadge status="pending" label={label} />;
  }
  return <StatusBadge status="draft" label={label} />;
}

function docHref(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path) return "#";
  return `${MINIO_URL}${path}`;
}

/** Angular `app-notifications` — date badge + title + read-more + Document link. */
function NotificationItem({ item }: { item: DashboardNotification }) {
  const [expanded, setExpanded] = useState(false);
  const description = String(
    item.description ?? item.notificationMessage ?? "",
  );
  const needsToggle = description.length > 100;
  const shown =
    !needsToggle || expanded ? description : `${description.slice(0, 100)}…`;

  let day = "";
  let month = "";
  if (item.publishDate) {
    try {
      const d = new Date(String(item.publishDate));
      if (!Number.isNaN(d.getTime())) {
        day = format(d, "dd");
        month = format(d, "MMM");
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex gap-2 rounded border border-border px-2 py-2">
      <div className="relative flex w-12 shrink-0 flex-col items-center justify-start pt-0.5">
        <span className="text-xl font-semibold leading-none">{day || "—"}</span>
        {month ? (
          <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            {month}
          </span>
        ) : null}
      </div>
      <div className="relative min-w-0 flex-1 pb-4">
        <p className="text-sm font-medium">
          {String(item.notificationTitle ?? "Notification")}
        </p>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {shown}
            {needsToggle ? (
              <button
                type="button"
                className="ml-1 text-primary hover:underline"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            ) : null}
          </p>
        ) : null}
        {item.notificationDocPath ? (
          <a
            href={docHref(String(item.notificationDocPath))}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-0 right-0 text-[10px] text-blue-600 hover:underline"
          >
            Document
          </a>
        ) : null}
      </div>
    </div>
  );
}

function SessionCard({
  title,
  subtitle,
  time,
  joinUrl,
  isValid,
  onZoomHost,
}: {
  title: string;
  subtitle: string;
  time?: string;
  joinUrl?: string;
  isValid?: boolean;
  onZoomHost?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 mb-1">
      <div className="min-w-0">
        <p className="text-sm text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        {time ? (
          <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
        ) : null}
      </div>
      {isValid ? (
        onZoomHost ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={onZoomHost}
          >
            <Video className="h-3.5 w-3.5 mr-1" />
            Live
          </Button>
        ) : joinUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            asChild
          >
            <a href={joinUrl} target="_blank" rel="noreferrer">
              <Video className="h-3.5 w-3.5 mr-1" />
              Live
            </a>
          </Button>
        ) : null
      ) : null}
    </div>
  );
}

export function StaffDashboard({ user, employeeId }: StaffDashboardProps) {
  const queryClient = useQueryClient();
  const collegeId = user.collegeId;
  const academicYearId = user.academicYearId;
  const organizationId =
    user.organizationId ?? readDashStorageNum("organizationId");
  const year = new Date().getFullYear();
  const classDate = formatClassDateYmdSlash();
  const attendanceDate = formatAttendanceProcDate(new Date());
  const empStatusCode = readDashStorage("empStatusCode") ?? "ACTV";
  const empCategoryName = readDashStorage("empCategoryName") ?? "";
  const userRole = user.userRole;
  const empDeptId = readDashStorageNum("empDeptId");
  const [leaveSearch, setLeaveSearch] = useState("");

  const leaveTotalsQ = useQuery({
    queryKey: QK.staffDashboard.leaveTotals(collegeId, employeeId),
    enabled: collegeId > 0 && employeeId > 0,
    queryFn: async () => {
      void getManagementReport({ collegeId, employeeId }).catch(() => null);
      return getEmpLeaveTotals({ collegeId, employeeId });
    },
  });

  const leaveAppsQ = useQuery({
    queryKey: QK.staffDashboard.leaveApplications(collegeId, employeeId, year),
    enabled: collegeId > 0 && employeeId > 0,
    queryFn: () =>
      getLeaveApplicationsForEmployee({
        collegeId,
        employeeId,
        leaveYear: year,
      }),
  });

  const attendanceQ = useQuery({
    queryKey: QK.staffDashboard.attendance(
      collegeId,
      employeeId,
      attendanceDate,
    ),
    enabled: collegeId > 0 && employeeId > 0,
    queryFn: () =>
      getEmpAttendanceDetail({
        collegeId,
        employeeId,
        attendanceDate,
      }),
  });

  const classesQ = useQuery({
    queryKey: QK.staffDashboard.myClasses(employeeId, classDate),
    enabled: employeeId > 0,
    queryFn: async () => {
      const env = getDigitalLiveClassEnv();
      const subjects = await getStaffSubjectsForToday({
        employeeId,
        classDate,
      });
      const schedules = await getLiveClassSchedules({ employeeId, env });
      return mergeClassesWithSchedules({
        myClasses: subjects,
        liveSchedules: schedules,
        userName: user.userName,
        env,
      });
    },
  });

  const notificationsQ = useQuery({
    queryKey: QK.staffDashboard.notifications(
      collegeId,
      employeeId,
      academicYearId,
      empDeptId,
    ),
    enabled: collegeId > 0 && employeeId > 0 && empStatusCode === "ACTV",
    queryFn: async (): Promise<DashboardNotification[]> => {
      const audiences = await getAudienceTypes();
      const code = empCategoryName === "Teaching" ? "TCHNGSTF" : "NTCHNGSTF";
      const audience = audiences.find(
        (a) => String(a.generalDetailCode) === code,
      );
      const gdId = Number(audience?.generalDetailId ?? 0);
      if (!gdId) return [];

      if (userRole === "NON TEACHING") {
        return getNotificationsByAudience({
          notificationAudienceId: gdId,
          academicYearId,
          collegeId,
          employeeId,
          includeDept: false,
        });
      }

      if (!empDeptId) {
        // Angular shows info toast when dept missing for teaching staff notifications
        if (typeof window !== "undefined") {
          toastInfo("Employee Not Assigned To Any Department");
        }
        return [];
      }

      return getNotificationsByAudience({
        notificationAudienceId: gdId,
        academicYearId,
        collegeId,
        employeeId,
        deptId: empDeptId,
        includeDept: true,
      });
    },
  });

  const leaveHistory: LeaveTotalRow[] = leaveTotalsQ.data ?? [];
  const chart = useMemo(
    () => buildLeaveSummaryChartData(leaveHistory),
    [leaveHistory],
  );

  const leaveRows = useMemo(() => {
    const rows = leaveAppsQ.data ?? [];
    const q = leaveSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.leaveCode,
        r.leaveName,
        r.leaveDescription,
        r.assignedEmployeeFirstName,
        r.leaveprocessStatusDisplayName,
        formatLeaveDateRange(r),
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .some((s) => s.includes(q)),
    );
  }, [leaveAppsQ.data, leaveSearch]);

  const columnDefs = useMemo<ColDef<LeaveApplicationRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.leaveType,
      COL_DEFS.leaveDescription,
      COL_DEFS.leaveDate,
      COL_DEFS.assigned,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  );

  const myClasses: StaffSubjectClass[] = classesQ.data?.myClasses ?? [];
  const specialActivities: LiveScheduleRow[] =
    classesQ.data?.specialActivities ?? [];
  const proxySchedules: LiveScheduleRow[] = classesQ.data?.proxySchedules ?? [];
  const isZoom = classesQ.data?.isZoom ?? false;

  async function hostZoom(meetingId: string | number | null | undefined) {
    if (meetingId == null) return;
    const url = await resolveZoomHostUrl(meetingId);
    if (url) window.open(url, "_blank");
  }

  function refreshLeaves() {
    void queryClient.invalidateQueries({
      queryKey: QK.staffDashboard.leaveApplications(
        collegeId,
        employeeId,
        year,
      ),
    });
    void queryClient.invalidateQueries({
      queryKey: QK.staffDashboard.leaveTotals(collegeId, employeeId),
    });
    void queryClient.invalidateQueries({
      queryKey: QK.staffDashboard.attendance(
        collegeId,
        employeeId,
        attendanceDate,
      ),
    });
  }

  if (employeeId <= 0) {
    return (
      <p className="text-sm text-muted-foreground p-4">
        Employee profile is not linked to this user. Staff dashboard widgets
        require an employee id.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-3">
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-[46%_54%] gap-3">
            <div className="rounded-md border border-border bg-card">
              <div className="border-b border-border px-3 py-2">
                <h3 className="text-sm font-semibold">
                  Leave Summary for {year}
                </h3>
              </div>
              <div className="p-2 min-h-[280px]">
                {leaveTotalsQ.isLoading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : chart.data.length === 0 ? (
                  /* Angular shows an empty fusioncharts panel — no empty-state copy */
                  <div className="h-[260px]" />
                ) : (
                  <div className="relative">
                    <PieChart
                      data={chart.data}
                      colors={[...LEAVE_PALETTE]}
                      donut
                      height={280}
                      showLabels={false}
                    />
                    <p className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-semibold text-foreground pt-6">
                      Total Leaves: {chart.totalLeaves}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              {attendanceQ.isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (attendanceQ.data?.days.length ?? 0) > 0 ? (
                <LoginCalendar
                  initialDays={attendanceQ.data!.days}
                  employeeInfo={attendanceQ.data!.employeeInfo}
                  leaveHistory={leaveHistory}
                  collegeId={collegeId}
                  employeeId={employeeId}
                  organizationId={organizationId}
                  arrows
                  onLeaveApplied={refreshLeaves}
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-sm font-semibold">Leave History</h3>
            </div>
            <div className="px-3 pt-2">
              <SearchInput
                value={leaveSearch}
                onChange={setLeaveSearch}
                placeholder="Search"
                className="w-56 max-w-full"
              />
            </div>
            <DataTable<LeaveApplicationRow>
              rowData={leaveRows}
              columnDefs={columnDefs}
              loading={leaveAppsQ.isLoading}
              pagination
              paginationPageSize={5}
              height="280px"
              bordered={false}
              toolbar={false}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border bg-slate-800 text-white px-3 py-2">
              <h3 className="text-sm font-semibold">Upcoming Sessions</h3>
            </div>
            <div className="max-h-[360px] overflow-auto p-2">
              {classesQ.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  {myClasses.length === 0 ? (
                    <p className="nofnd p-3 text-sm text-muted-foreground">
                      No Meetings for Today.
                    </p>
                  ) : (
                    myClasses.map((c, i) => (
                      <SessionCard
                        key={`cls-${i}`}
                        title={`${c.collegeCode}/ ${c.courseCode}/ ${c.courseYearName}  / ${c.section}`}
                        subtitle={`Subject : - ${c.subjectName} (${
                          c.subjectType === "LAB" ? `${c.batchName} - ` : ""
                        }${c.subjectType})`}
                        joinUrl={c.joinUrl}
                        isValid={c.isValid}
                      />
                    ))
                  )}
                  {specialActivities.length > 0 ? (
                    <p className="mb-1 px-1 text-sm font-medium text-blue-600">
                      Special Activities
                    </p>
                  ) : null}
                  {specialActivities.map((s, i) => (
                    <SessionCard
                      key={`sp-${i}`}
                      title={`${s.collegeCode}/${s.courseCode}/${s.courseGroupName}/${s.courseYearName}/${s.section}`}
                      subtitle={`Subject : - ${s.topic}`}
                      time={`${tConvert(s.fromTime)} - ${tConvert(s.toTime)}`}
                      joinUrl={s.joinUrl}
                      isValid={s.isValid}
                    />
                  ))}
                  {proxySchedules.length > 0 ? (
                    <p className="mb-1 px-1 text-sm font-medium text-blue-600">
                      Proxy Classes
                    </p>
                  ) : null}
                  {proxySchedules.map((s, i) => (
                    <SessionCard
                      key={`px-${i}`}
                      title={`${s.collegeCode}/${s.courseCode}/${s.courseGroupName}/${s.courseYearName}/${s.section}`}
                      subtitle={`Subject : - ${s.topic}`}
                      time={`${tConvert(s.fromTime)} - ${tConvert(s.toTime)}`}
                      joinUrl={!isZoom ? s.joinUrl : undefined}
                      isValid={s.isValid}
                      onZoomHost={
                        isZoom && s.isValid
                          ? () => void hostZoom(s.meetingId)
                          : undefined
                      }
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card">
            <div className="border-b border-border px-3 py-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
            </div>
            <div className="max-h-[280px] space-y-2 overflow-auto p-2">
              {notificationsQ.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (notificationsQ.data?.length ?? 0) === 0 ? (
                <p className="nofnd p-3 text-sm text-muted-foreground">
                  No data is found.
                </p>
              ) : (
                (notificationsQ.data ?? []).map((n, i) => (
                  <NotificationItem key={i} item={n} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
