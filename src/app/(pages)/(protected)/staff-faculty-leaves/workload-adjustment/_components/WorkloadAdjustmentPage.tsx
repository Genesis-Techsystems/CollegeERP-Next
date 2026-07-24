"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { utcMidnightIso } from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
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
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-[#C3D9FF] text-left">
                                <th className="p-1.5">SI.No</th>
                                <th className="p-1.5">Proxy Staff</th>
                                <th className="p-1.5">Proxy Subject</th>
                                <th className="p-1.5">Proxy Date</th>
                                <th className="p-1.5">Status</th>
                                <th className="p-1.5">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {proxies.map((proxy, i) => (
                                <tr
                                  key={String(proxy.staffProxyId ?? i)}
                                  className={cn(
                                    "border-t",
                                    i % 2 === 0 ? "bg-white" : "bg-[#f1f6ff]",
                                  )}
                                >
                                  <td className="p-1.5">{i + 1}</td>
                                  <td className="p-1.5">
                                    {String(proxy.proxyFirstName ?? "")}
                                  </td>
                                  <td className="p-1.5">
                                    {String(proxy.subjectName ?? "")} (
                                    {String(
                                      proxy.proxySubjecttypeDisplayName ?? "",
                                    )}
                                    {String(
                                      proxy.proxySubjecttypeDisplayName,
                                    ) === "LAB" && proxy.batchName
                                      ? ` - ${String(proxy.batchName)}`
                                      : ""}
                                    )
                                  </td>
                                  <td className="p-1.5">
                                    {formatProxyDate(proxy.proxyDate)}
                                  </td>
                                  <td className="p-1.5">
                                    <StatusText
                                      name={proxy.processStatusName}
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    {String(proxy.processStatusName) !==
                                    "Accepted" ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          setEditTarget({ detail, proxy })
                                        }
                                      >
                                        Edit
                                      </Button>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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

              <WorkloadTable
                title="Assigned Workloads"
                rows={myWorkLoads}
                mode="assigned"
              />
              <WorkloadTable
                title="Requested Workloads"
                rows={acceptedWorkloads}
                mode="requested"
                onChange={(row) => setChangeTarget(row)}
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

function WorkloadTable({
  title,
  rows,
  mode,
  onChange,
}: {
  title: string;
  rows: AnyRow[];
  mode: "assigned" | "requested";
  onChange?: (row: AnyRow) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 font-semibold text-sm">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#C3D9FF] text-left">
              <th className="p-1.5">SI.No</th>
              <th className="p-1.5">
                {mode === "assigned"
                  ? "Proxy Assigned Staff"
                  : "Requested Staff"}
              </th>
              <th className="p-1.5">
                {mode === "assigned"
                  ? "Proxy Assigned Subject"
                  : "Requested Subject"}
              </th>
              <th className="p-1.5">
                {mode === "assigned" ? "Proxy Date" : "Requested Date"}
              </th>
              <th className="p-1.5">Course Details</th>
              <th className="p-1.5">Timing</th>
              <th className="p-1.5">Status</th>
              {mode === "requested" ? <th className="p-1.5">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((proxy, i) => {
              const times = Array.isArray(proxy.times)
                ? (proxy.times as AnyRow[])
                : [];
              return (
                <tr
                  key={`${String(proxy.staffProxyId ?? i)}-${i}`}
                  className={cn(
                    "border-t",
                    i % 2 === 0 ? "bg-white" : "bg-[#f1f6ff]",
                  )}
                >
                  <td className="p-1.5">{i + 1}</td>
                  <td className="p-1.5">
                    {mode === "assigned"
                      ? String(proxy.proxyFirstName ?? "")
                      : String(proxy.assignedFirstName ?? "")}
                    <span className="text-blue-600">
                      {" "}
                      (
                      {mode === "assigned"
                        ? String(proxy.proxyEmpNumber ?? "")
                        : String(proxy.assignedEmpNumber ?? "")}
                      )
                    </span>
                  </td>
                  <td className="p-1.5">
                    {String(proxy.subjectName ?? "")} (
                    {String(proxy.proxySubjecttypeDisplayName ?? "")}
                    {mode === "assigned" &&
                    String(proxy.proxySubjecttypeDisplayName) === "LAB" &&
                    proxy.batchName
                      ? ` - ${String(proxy.batchName)}`
                      : ""}
                    )
                  </td>
                  <td className="p-1.5">{formatProxyDate(proxy.proxyDate)}</td>
                  <td className="p-1.5">
                    {String(proxy.collegeCode ?? "")}/
                    {String(proxy.courseName ?? "")}/
                    {String(proxy.groupName ?? "")}/
                    {String(proxy.courseYearName ?? "")}/section{" "}
                    {String(proxy.groupSectionName ?? "")}
                  </td>
                  <td className="p-1.5">
                    {times.map((prx, ti) => (
                      <p key={ti} className="m-0 text-[13px]">
                        {String(proxy.classTimingName ?? "")}(
                        {tConvert(prx.startTime)} - {tConvert(prx.endTime)})
                      </p>
                    ))}
                  </td>
                  <td className="p-1.5">
                    <StatusText name={proxy.processStatusName} />
                  </td>
                  {mode === "requested" ? (
                    <td className="p-1.5">
                      <button
                        type="button"
                        className="text-blue-600 underline text-xs"
                        onClick={() => onChange?.(proxy)}
                      >
                        Change
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
