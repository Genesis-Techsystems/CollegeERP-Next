"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon } from "lucide-react";
import { DataTable } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { utcMidnightIso } from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getDefaultWorkloadDayName,
  getDefaultWorkloadTabIndex,
  groupLabProxies,
  listStaffProxies,
  listSubjectResourceSchedulesForStaff,
  saveStaffProxiesList,
  subjectResourceOf,
  tConvert,
  toLeaveYmd,
  WORKLOAD_WEEKDAYS,
  type AnyRow,
  type WorkloadWeekday,
} from "@/services";
import { SetProxyModal } from "./SetProxyModal";
import { EditProxyModal } from "./EditProxyModal";
import { ChangeProxyStatusModal } from "./ChangeProxyStatusModal";
import { TakeProxyModal } from "./TakeProxyModal";

const TAB_TRIGGER =
  "flex-1 rounded-none border-b-2 border-transparent px-2 py-2.5 text-center text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none";

function formatProxyDate(value: unknown): string {
  if (value == null || value === "") return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusText({ name }: { name: unknown }) {
  const n = String(name ?? "");
  if (n === "Accepted" || n === "Completed") {
    return <span className="text-emerald-600 font-medium">{n}</span>;
  }
  if (n === "Rejected") {
    return <span className="text-destructive font-medium">{n}</span>;
  }
  return <span className="text-amber-600 font-medium">{n}</span>;
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  return <StatusText name={p.data?.processStatusName} />;
}

function assignedStaffRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.proxyFirstName ?? "")}
      {row.proxyEmpNumber ? (
        <span className="font-medium text-blue-600">
          {" "}
          ({String(row.proxyEmpNumber)})
        </span>
      ) : null}
    </span>
  );
}

function requestedStaffRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.assignedFirstName ?? "")}
      {row.assignedEmpNumber ? (
        <span className="font-medium text-blue-600">
          {" "}
          ({String(row.assignedEmpNumber)})
        </span>
      ) : null}
    </span>
  );
}

function workloadSubjectRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const type = String(row.proxySubjecttypeDisplayName ?? "");
  const batch =
    type === "LAB" && row.batchName ? ` - ${String(row.batchName)}` : "";
  return `${String(row.subjectName ?? "")} (${type}${batch})`;
}

function courseDetailsRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return [
    row.collegeCode,
    row.courseName,
    row.groupName,
    row.courseYearName,
    row.groupSectionName ? `section ${row.groupSectionName}` : "",
  ]
    .filter(Boolean)
    .join("/");
}

function workloadTimingRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const times = Array.isArray(row.times) ? (row.times as AnyRow[]) : [];
  if (times.length === 0) return "—";
  return (
    <div className="space-y-0.5">
      {times.map((prx, ti) => (
        <p key={ti} className="m-0 text-[13px] leading-snug">
          {String(row.classTimingName ?? "")}({tConvert(prx.startTime)} -{" "}
          {tConvert(prx.endTime)})
        </p>
      ))}
    </div>
  );
}

function proxyDateRenderer(p: ICellRendererParams<AnyRow>) {
  return formatProxyDate(p.data?.proxyDate);
}

function makeDayProxyActionsRenderer(
  onEdit: (detail: AnyRow, proxy: AnyRow) => void,
  detail: AnyRow,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const proxy = p.data;
    if (!proxy) return null;
    if (String(proxy.processStatusName) === "Accepted") return <span>—</span>;
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => onEdit(detail, proxy)}
      >
        Edit
      </Button>
    );
  };
}

function makeRequestedActionsRenderer(onChange: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => onChange(row)}
      >
        Change
      </Button>
    );
  };
}

const ASSIGNED_COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  staff: {
    headerName: "Proxy Assigned Staff",
    minWidth: 180,
  } as ColDef<AnyRow>,
  subject: {
    headerName: "Proxy Assigned Subject",
    minWidth: 200,
  } as ColDef<AnyRow>,
  proxyDate: {
    headerName: "Proxy Date",
    minWidth: 120,
    flex: 0,
  } as ColDef<AnyRow>,
  course: { headerName: "Course Details", minWidth: 240 } as ColDef<AnyRow>,
  timing: { headerName: "Timing", minWidth: 160, flex: 0 } as ColDef<AnyRow>,
  status: { headerName: "Status", minWidth: 110, flex: 0 } as ColDef<AnyRow>,
};

const REQUESTED_COL_DEFS = {
  siNo: ASSIGNED_COL_DEFS.siNo,
  staff: {
    headerName: "Requested Staff",
    minWidth: 180,
  } as ColDef<AnyRow>,
  subject: {
    headerName: "Requested Subject",
    minWidth: 200,
  } as ColDef<AnyRow>,
  proxyDate: {
    headerName: "Requested Date",
    minWidth: 120,
    flex: 0,
  } as ColDef<AnyRow>,
  course: ASSIGNED_COL_DEFS.course,
  timing: ASSIGNED_COL_DEFS.timing,
  status: ASSIGNED_COL_DEFS.status,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 100,
  } as ColDef<AnyRow>,
};

const DAY_PROXY_COL_DEFS = {
  siNo: ASSIGNED_COL_DEFS.siNo,
  proxyStaff: {
    field: "proxyFirstName",
    headerName: "Proxy Staff",
    minWidth: 140,
  } as ColDef<AnyRow>,
  proxySubject: {
    headerName: "Proxy Subject",
    minWidth: 180,
  } as ColDef<AnyRow>,
  proxyDate: {
    headerName: "Proxy Date",
    minWidth: 120,
    flex: 0,
  } as ColDef<AnyRow>,
  status: ASSIGNED_COL_DEFS.status,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<AnyRow>,
};

function dayProxySubjectRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  const type = String(row.proxySubjecttypeDisplayName ?? "");
  const batch =
    type === "LAB" && row.batchName ? ` - ${String(row.batchName)}` : "";
  return `${String(row.subjectName ?? "")} (${type}${batch})`;
}

export function WorkloadAdjustmentPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const defaultIdx = useMemo(() => getDefaultWorkloadTabIndex(), []);
  const [activeTab, setActiveTab] = useState<WorkloadWeekday>(
    () => WORKLOAD_WEEKDAYS[defaultIdx] ?? "Monday",
  );
  const [schedules, setSchedules] = useState<AnyRow[]>([]);
  const [dayDetails, setDayDetails] = useState<AnyRow[]>([]);
  const [myWorkLoads, setMyWorkLoads] = useState<AnyRow[]>([]);
  const [acceptedWorkloads, setAcceptedWorkloads] = useState<AnyRow[]>([]);
  const [rawAccepted, setRawAccepted] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [setProxyItems, setSetProxyItems] = useState<AnyRow[] | null>(null);
  const [editTarget, setEditTarget] = useState<{
    detail: AnyRow;
    proxy: AnyRow;
  } | null>(null);
  const [changeTarget, setChangeTarget] = useState<AnyRow | null>(null);
  const [takeOpen, setTakeOpen] = useState(false);

  const assignedColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      ASSIGNED_COL_DEFS.siNo,
      { ...ASSIGNED_COL_DEFS.staff, cellRenderer: assignedStaffRenderer },
      { ...ASSIGNED_COL_DEFS.subject, cellRenderer: workloadSubjectRenderer },
      { ...ASSIGNED_COL_DEFS.proxyDate, cellRenderer: proxyDateRenderer },
      { ...ASSIGNED_COL_DEFS.course, cellRenderer: courseDetailsRenderer },
      { ...ASSIGNED_COL_DEFS.timing, cellRenderer: workloadTimingRenderer },
      { ...ASSIGNED_COL_DEFS.status, cellRenderer: statusRenderer },
    ],
    [],
  );

  const requestedColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      REQUESTED_COL_DEFS.siNo,
      { ...REQUESTED_COL_DEFS.staff, cellRenderer: requestedStaffRenderer },
      { ...REQUESTED_COL_DEFS.subject, cellRenderer: workloadSubjectRenderer },
      { ...REQUESTED_COL_DEFS.proxyDate, cellRenderer: proxyDateRenderer },
      { ...REQUESTED_COL_DEFS.course, cellRenderer: courseDetailsRenderer },
      { ...REQUESTED_COL_DEFS.timing, cellRenderer: workloadTimingRenderer },
      { ...REQUESTED_COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...REQUESTED_COL_DEFS.actions,
        cellRenderer: makeRequestedActionsRenderer((row) =>
          setChangeTarget(row),
        ),
      },
    ],
    [],
  );

  const loadSchedules = useCallback(
    async (dayName: string) => {
      if (!employeeId) return;
      setLoading(true);
      try {
        const rows = await listSubjectResourceSchedulesForStaff(employeeId);
        setSchedules(rows);
        applyDayFilter(rows, dayName);
      } catch (e) {
        toastError(e, "Failed to load schedules");
      } finally {
        setLoading(false);
      }
    },
    [employeeId],
  );

  function applyDayFilter(all: AnyRow[], dayName: string) {
    if (dayName === "Workload") return;
    const filtered = all.filter((x) => String(x.weekdayName) === dayName);
    setDayDetails(filtered);
    if (filtered.length === 0) {
      toastInfo("No Classes Today.");
    }
  }

  const loadWorkloadTab = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [assigned, requested] = await Promise.all([
        listStaffProxies({
          assignedbyEmployeeId: employeeId,
          isActive: "true",
        }),
        listStaffProxies({
          proxyEmpId: employeeId,
          isActive: "true",
        }),
      ]);
      setMyWorkLoads(groupLabProxies(assigned));
      setRawAccepted(requested);
      setAcceptedWorkloads(groupLabProxies(requested));
    } catch (e) {
      toastError(e, "Failed to load workloads");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (sessionLoading || isResolving || !employeeId) return;
    const day = getDefaultWorkloadDayName();
    setActiveTab(day);
    if (day === "Workload") {
      void loadWorkloadTab();
    } else {
      void loadSchedules(day);
    }
  }, [sessionLoading, isResolving, employeeId, loadSchedules, loadWorkloadTab]);

  function onTabChange(value: string) {
    const tab = value as WorkloadWeekday;
    setActiveTab(tab);
    if (tab === "Workload") {
      void loadWorkloadTab();
    } else if (schedules.length > 0) {
      applyDayFilter(schedules, tab);
    } else {
      void loadSchedules(tab);
    }
  }

  function openSetProxy(item: AnyRow) {
    const arr: AnyRow[] = [];
    const resource = subjectResourceOf(item);
    if (String(resource.subjectTypeName) === "LAB") {
      for (const row of dayDetails) {
        if (String(row.cellGroupId) === String(item.cellGroupId)) {
          arr.push({ ...row, labelName: activeTab });
        }
      }
    } else {
      arr.push({ ...item, labelName: activeTab });
    }
    setSetProxyItems(arr);
  }

  async function handleSetProxySave(details: AnyRow) {
    if (!setProxyItems?.length || !employeeId) return;
    const item = setProxyItems[0]!;
    const proxyDateYmd = toLeaveYmd(details.proxyDate);
    if (!proxyDateYmd) return;

    setSetProxyItems(null);
    setLoading(true);
    try {
      const existing = await listStaffProxies({
        timetableScheduleId: Number(item.timetableScheduleId),
        proxyFormat: "day",
        proxyDate: proxyDateYmd.replaceAll("-", "/"),
        isActive: "true",
      });
      // Angular uses YYYY/MM/DD for the check query via momentFormatYMD
      const last = existing[existing.length - 1];
      if (
        existing.length > 0 &&
        String(last?.processStatusName) !== "Rejected"
      ) {
        toastInfo("Already proxy is scheduled for this date.");
        setLoading(false);
        return;
      }

      const payload: AnyRow[] = setProxyItems.map((row) => {
        const res = subjectResourceOf(row);
        return {
          staffCourseyrSubjectId: details.staffCourseyrSubjectId,
          isActive: details.isActive,
          reason: res.subjectCourseYearId,
          proxyDate: proxyDateYmd,
          subjectId: details.subjectId,
          subjectTypeId: details.subjectTypeId,
          createdDt: utcMidnightIso(),
          collegeId: row.collegeId,
          proxyEmpId: details.empId,
          isApproved: false,
          processStatusCatdetId: 230,
          assignedbyEmployeeId: employeeId,
          studentbatchId: res.studentBatchId,
          subjectCourseyearId: res.subjectCourseYearId,
          timetableScheduleId: row.timetableScheduleId,
          proxySubjecttypeId: details.subjectTypeId,
        };
      });

      const result = await saveStaffProxiesList(payload);
      if (result.success) {
        toastSuccess(result.message ?? "Proxy saved");
        await loadSchedules(activeTab);
      } else {
        toastInfo(result.message ?? "Unable to save proxy");
      }
    } catch (e) {
      toastError(e, "Failed to save proxy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-data-table app-data-table-card flex flex-col">
        <div className="app-data-table-heading px-5 pt-5 pb-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Workload Adjustment
          </h2>
        </div>

        <div className="px-5 pb-5 pt-3">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="h-auto w-full justify-between gap-0 rounded-none border-b border-border bg-transparent p-0">
              {WORKLOAD_WEEKDAYS.map((day) => (
                <TabsTrigger key={day} value={day} className={TAB_TRIGGER}>
                  {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {WORKLOAD_WEEKDAYS.filter((d) => d !== "Workload").map((day) => (
              <TabsContent key={day} value={day} className="mt-4 space-y-3">
                {loading && dayDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : null}
                {dayDetails.map((detail, idx) => {
                  const res = subjectResourceOf(detail);
                  const proxies = Array.isArray(detail.staffProxies)
                    ? (detail.staffProxies as AnyRow[])
                    : [];
                  return (
                    <div
                      key={`${String(detail.timetableScheduleId)}-${idx}`}
                      className="rounded-md border border-border bg-muted/10 p-4"
                    >
                      <p className="text-base font-semibold text-blue-700">
                        {String(res.subjectName ?? "")} (
                        <span className="text-foreground">
                          {String(res.subjectTypeName ?? "")}
                          {String(res.subjectTypeName) === "LAB" &&
                          res.studentBatchName
                            ? ` - ${String(res.studentBatchName)}`
                            : ""}
                        </span>
                        )
                      </p>
                      <div className="mt-2 flex flex-wrap justify-between gap-3 text-sm border-b border-border pb-3">
                        <p>
                          Course :{" "}
                          <span className="font-medium">
                            {String(detail.collegeCode ?? "")} /{" "}
                            {String(detail.academicYearName ?? "")} /{" "}
                            {String(detail.courseName ?? "")} /{" "}
                            {String(detail.groupName ?? "")} /{" "}
                            {String(detail.courseYearName ?? "")} -{" "}
                            {String(detail.groupSectionName ?? "")}
                          </span>
                        </p>
                        <p>
                          Timing :{" "}
                          <span className="font-medium">
                            {String(detail.classTimingName ?? "")}(
                            {tConvert(detail.startTime)} -{" "}
                            {tConvert(detail.endTime)})
                          </span>
                        </p>
                      </div>
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => openSetProxy(detail)}
                          disabled={loading}
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          Set Proxy
                        </Button>
                      </div>
                      {proxies.length > 0 ? (
                        <div className="mt-3">
                          <DataTable
                            title="Proxies"
                            rowData={proxies}
                            columnDefs={[
                              DAY_PROXY_COL_DEFS.siNo,
                              DAY_PROXY_COL_DEFS.proxyStaff,
                              {
                                ...DAY_PROXY_COL_DEFS.proxySubject,
                                cellRenderer: dayProxySubjectRenderer,
                              },
                              {
                                ...DAY_PROXY_COL_DEFS.proxyDate,
                                cellRenderer: proxyDateRenderer,
                              },
                              {
                                ...DAY_PROXY_COL_DEFS.status,
                                cellRenderer: statusRenderer,
                              },
                              {
                                ...DAY_PROXY_COL_DEFS.actions,
                                cellRenderer: makeDayProxyActionsRenderer(
                                  (proxyRow) =>
                                    setEditTarget({ detail, proxy: proxyRow }),
                                  detail,
                                ),
                              },
                            ]}
                            bordered
                            height="auto"
                            pagination={false}
                            toolbar={false}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </TabsContent>
            ))}

            <TabsContent value="Workload" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setTakeOpen(true)}>Take Proxy</Button>
              </div>

              <DataTable
                title="Assigned Workloads"
                rowData={myWorkLoads}
                columnDefs={assignedColumnDefs}
                loading={loading}
                bordered
                height="auto"
                pagination
                toolbar={{ search: true, searchPlaceholder: "Search" }}
              />
              <DataTable
                title="Requested Workloads"
                rowData={acceptedWorkloads}
                columnDefs={requestedColumnDefs}
                loading={loading}
                bordered
                height="auto"
                pagination
                toolbar={{ search: true, searchPlaceholder: "Search" }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SetProxyModal
        open={Boolean(setProxyItems)}
        items={setProxyItems ?? []}
        employeeId={employeeId}
        onClose={() => setSetProxyItems(null)}
        onSave={(payload) => void handleSetProxySave(payload)}
      />

      <EditProxyModal
        open={Boolean(editTarget)}
        detail={editTarget?.detail ?? null}
        proxy={editTarget?.proxy ?? null}
        employeeId={employeeId}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          void loadSchedules(activeTab);
        }}
      />

      <ChangeProxyStatusModal
        open={Boolean(changeTarget)}
        row={changeTarget}
        rawAccepted={rawAccepted}
        onClose={() => setChangeTarget(null)}
        onSaved={() => {
          setChangeTarget(null);
          void loadWorkloadTab();
        }}
      />

      <TakeProxyModal
        open={takeOpen}
        employeeId={employeeId}
        collegeId={Number(user?.collegeId ?? 0)}
        onClose={() => setTakeOpen(false)}
        onSaved={() => {
          setTakeOpen(false);
          void loadWorkloadTab();
        }}
      />
    </PageContainer>
  );
}
