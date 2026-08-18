"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Eye, Filter } from "lucide-react";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  filterHodAppliedLeaves,
  filterHodByEmployee,
  filterHodProxyRows,
  getEmployeeRunningLeaves,
  getHodAssignedLeaveApplications,
  getHodDeptAttendanceLast7Days,
  getHodDeptAttendanceSummary,
  getHodDeptLeaveSummary,
  getHodManagementReport,
  getHodTodayProxies,
  getLeaveProcessStatuses,
  hodLeaveYear,
  hodPresentSlashYmd,
  hodPresentYmd,
  listFacultyWorkloadProxies,
  pivotHodLeaveSummary,
  pivotHodWeeklyAttendance,
  readDashStorageNum,
  submitEmployeeLeaveApplication,
  type HodAppliedLeaveRow,
  type HodAttendanceCell,
  type HodDashRow,
  type HodEmpAttendanceRow,
  type StaffDashRow,
} from "@/services";
import type { SessionUser } from "@/types/user";
import {
  ApplyLateLeaveModal,
  type ApplyLateLeaveContext,
} from "./ApplyLateLeaveModal";
import { ChangeStatusModal } from "../../staff-faculty-leaves/apply-leave/_components/ChangeStatusModal";
import { ViewProxiesModal } from "../../principal-my-approvals/leave-applications/_components/ViewProxiesModal";

interface HodDashboardProps {
  user: SessionUser;
  employeeId: number;
}

const PROXY_PAGE_SIZES = [5, 10, 25, 100] as const;

function formatAttHeader(dateStr: string): string {
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr;
  return format(d, "dd, MMM");
}

function formatAttTooltipDate(dateStr: string): string {
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr;
  return format(d, "MMM d, yyyy");
}

function formatLeaveDate(value: unknown): string {
  if (value == null || value === "") return "--";
  const d = parseFlexibleDate(String(value));
  if (!d) return String(value);
  return format(d, "MMM d, yyyy");
}

function parseFlexibleDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const iso = raw.includes("T")
      ? parseISO(raw)
      : raw.includes("/")
        ? new Date(`${raw.replaceAll("/", "-").slice(0, 10)}T00:00:00`)
        : new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(iso.getTime())) return null;
    return iso;
  } catch {
    return null;
  }
}

function hasText(value: unknown): boolean {
  return value != null && String(value) !== "";
}

function isPlaceholder(value: unknown): boolean {
  return value == null || value === "" || value === "--";
}

function leaveDayLabel(code: unknown): string {
  if (code === "A") return "After Noon";
  if (code === "F") return "Fore Noon";
  if (code === "H") return "Full Day";
  return "";
}

function WidgetCard({
  title,
  onFilter,
  filterOpen,
  search,
  onSearch,
  children,
}: {
  title: string;
  onFilter: () => void;
  filterOpen: boolean;
  search: string;
  onSearch: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[5px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.14)]">
      <div className="flex items-center justify-between border-b border-[#ffcf46] px-2.5 pb-1.5 pt-3">
        <h3 className="text-[16px] font-semibold text-[#042956]">{title}</h3>
        <button
          type="button"
          className="text-[#6b7280] hover:text-[#042956]"
          aria-label="Filter"
          onClick={onFilter}
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>
      {filterOpen ? (
        <div className="px-3 py-1">
          <SearchInput
            value={search}
            onChange={onSearch}
            placeholder="Search"
            className="max-w-xs"
          />
        </div>
      ) : null}
      <div className="p-0">{children}</div>
    </div>
  );
}

function ApplyLeaveIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto h-10 w-10" aria-hidden="true">
      <rect
        x="6"
        y="10"
        width="36"
        height="32"
        rx="4"
        fill="#fde68a"
        stroke="#d97706"
        strokeWidth="2"
      />
      <rect x="6" y="10" width="36" height="10" rx="4" fill="#f59e0b" />
      <path
        d="M16 6v8M32 6v8"
        stroke="#92400e"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18 30h12M24 24v12"
        stroke="#b45309"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AttendanceCellTooltip({ cell }: { cell: HodAttendanceCell }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-full z-40 mt-1 w-[190px] -translate-x-1/2",
        "border border-[#042956] bg-white p-3 text-left text-[10px] leading-tight shadow-lg",
        "invisible opacity-0 transition-opacity group-hover:visible group-hover:opacity-100",
      )}
    >
      <h5 className="mb-2 bg-[#00bcd433] py-1.5 text-center text-[12px] font-semibold">
        Attendance Details
      </h5>
      <p>
        <span className="font-bold text-black">Date :</span>{" "}
        {formatAttTooltipDate(cell.date)}
      </p>
      {!isPlaceholder(cell.Day) ? (
        <p>
          <span className="font-bold text-black">Day :</span> {cell.Day}
        </p>
      ) : null}
      {hasText(cell.in) ? (
        <p>
          <span className="font-bold text-black">Login :</span> {cell.in}
        </p>
      ) : null}
      {hasText(cell.out) ? (
        <p>
          <span className="font-bold text-black">Logout :</span> {cell.out}
        </p>
      ) : null}
      {Number(cell.Late_By) > 0 ? (
        <p>
          <span className="font-semibold text-black">Late By :</span>{" "}
          {cell.Late_By} mins
        </p>
      ) : null}
      {Number(cell.Early_By) > 0 ? (
        <p>
          <span className="font-bold text-black">Early By :</span>{" "}
          {cell.Early_By} mins
        </p>
      ) : null}
      {Number(cell.Running_Late_Minutes) > 0 ? (
        <p>
          <span className="font-bold text-black">Running Late Minutes :</span>{" "}
          {cell.Running_Late_Minutes} mins
        </p>
      ) : null}
      {!isPlaceholder(cell.Is_Forenoon_Leaves) ? (
        <p>
          <span className="font-bold text-black">Is Forenoon Leaves :</span> Yes
        </p>
      ) : null}
      {!isPlaceholder(cell.Is_Afternoon_Leaves) ? (
        <p>
          <span className="font-bold text-black">Is Afternoon Leaves :</span>{" "}
          Yes
        </p>
      ) : null}
      {hasText(cell.Remarks) && cell.Remarks !== "--" ? (
        <p>
          <span className="font-bold text-black">Remarks :</span>{" "}
          <span dangerouslySetInnerHTML={{ __html: String(cell.Remarks) }} />
        </p>
      ) : null}
    </div>
  );
}

export function HodDashboard({ user, employeeId }: HodDashboardProps) {
  const queryClient = useQueryClient();
  const collegeId = user.collegeId || readDashStorageNum("collegeId");
  const departmentId = readDashStorageNum("empDeptId");
  const organizationId =
    user.organizationId || readDashStorageNum("organizationId");
  const leaveYear = hodLeaveYear();
  const slashDate = hodPresentSlashYmd();
  const ymdDate = hodPresentYmd();

  const [isFilter, setIsFilter] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchText1, setSearchText1] = useState("");
  const [searchText2, setSearchText2] = useState("");
  const [proxySearch, setProxySearch] = useState("");
  const [proxyPage, setProxyPage] = useState(0);
  const [proxyPageSize, setProxyPageSize] = useState<number>(5);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveCtx, setLeaveCtx] = useState<ApplyLateLeaveContext | null>(null);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [applyEmp, setApplyEmp] = useState<HodEmpAttendanceRow | null>(null);

  const [actionRow, setActionRow] = useState<HodAppliedLeaveRow | null>(null);
  const [actionName, setActionName] = useState<"RECOMMEND" | "REJECT" | null>(
    null,
  );
  const [actionSaving, setActionSaving] = useState(false);

  const [proxiesOpen, setProxiesOpen] = useState(false);
  const [proxies, setProxies] = useState<HodDashRow[]>([]);
  const [proxiesLoading, setProxiesLoading] = useState(false);

  const statusesQ = useQuery({
    queryKey: QK.hodDashboard.leaveStatuses(),
    queryFn: getLeaveProcessStatuses,
    staleTime: 60_000,
  });

  useQuery({
    queryKey: QK.hodDashboard.management(collegeId, departmentId),
    enabled: collegeId > 0 && departmentId > 0,
    queryFn: async () => {
      await getHodManagementReport({ collegeId, departmentId }).catch(
        () => null,
      );
      await getHodDeptAttendanceSummary({
        departmentId,
        attendanceDate: ymdDate,
      }).catch(() => null);
      return true;
    },
    staleTime: 60_000,
  });

  const attendanceQ = useQuery({
    queryKey: QK.hodDashboard.attendance(collegeId, departmentId, slashDate),
    enabled: collegeId > 0 && departmentId > 0,
    queryFn: async () => {
      const rows = await getHodDeptAttendanceLast7Days({
        collegeId,
        departmentId,
        attendanceDate: slashDate,
      });
      return pivotHodWeeklyAttendance(rows);
    },
  });

  const leaveSummaryQ = useQuery({
    queryKey: QK.hodDashboard.leaveSummary(departmentId, leaveYear),
    enabled: departmentId > 0,
    queryFn: async () => {
      const rows = await getHodDeptLeaveSummary({ departmentId, leaveYear });
      return pivotHodLeaveSummary(rows);
    },
  });

  const proxiesQ = useQuery({
    queryKey: QK.hodDashboard.proxies(departmentId, slashDate),
    enabled: departmentId > 0,
    queryFn: () => getHodTodayProxies({ departmentId, proxyDate: slashDate }),
  });

  const leaveRequestsQ = useQuery({
    queryKey: QK.hodDashboard.leaveRequests(collegeId, employeeId, leaveYear),
    enabled: collegeId > 0 && employeeId > 0,
    queryFn: async () => {
      const rows = await getHodAssignedLeaveApplications({
        collegeId,
        employeeId,
        leaveYear,
      });
      return filterHodAppliedLeaves(rows);
    },
  });

  const empAttendance = attendanceQ.data?.empAttendance ?? [];
  const attKeys = attendanceQ.data?.attKeys ?? [];
  const empLv = leaveSummaryQ.data?.empLv ?? [];
  const lvKeys = leaveSummaryQ.data?.lvKeys ?? [];
  const staffproxyList = proxiesQ.data ?? [];
  const appliedLeaves = leaveRequestsQ.data ?? [];

  const filteredAttendance = useMemo(
    () => filterHodByEmployee(empAttendance, searchText),
    [empAttendance, searchText],
  );
  const filteredLeaveSummary = useMemo(
    () => filterHodByEmployee(empLv, searchText1),
    [empLv, searchText1],
  );
  const filteredProxies = useMemo(
    () => filterHodProxyRows(staffproxyList, proxySearch),
    [staffproxyList, proxySearch],
  );
  const filteredApplied = useMemo(
    () => filterHodByEmployee(appliedLeaves, searchText2),
    [appliedLeaves, searchText2],
  );

  const proxyPageCount = Math.max(
    1,
    Math.ceil(filteredProxies.length / proxyPageSize) || 1,
  );
  const pagedProxies = filteredProxies.slice(
    proxyPage * proxyPageSize,
    proxyPage * proxyPageSize + proxyPageSize,
  );

  function toggleFilter() {
    setIsFilter((v) => !v);
  }

  async function dayClicked(
    empAtt: HodEmpAttendanceRow,
    cell: HodAttendanceCell,
  ) {
    if (cell.Day !== "Apply Leave") return;
    if (!employeeId) {
      toastInfo("Reporting manager is empty.");
      return;
    }
    const year = Number(ymdDate.split("-")[0]);
    const counts = await getEmployeeRunningLeaves({
      collegeId,
      employeeId: empAtt.pk_emp_id,
      leaveYear: year,
    });
    setApplyEmp(empAtt);
    setLeaveCtx({
      events: [{ Attendance_Date: cell.date }],
      leaveCounts: counts,
      first_name: empAtt.firstName,
      emp_number: empAtt.empNumber,
      reportingManagerId: employeeId,
    });
    setLeaveOpen(true);
  }

  async function handleLeaveSubmit(form: StaffDashRow) {
    if (!applyEmp || !leaveCtx) return;
    setLeaveSubmitting(true);
    try {
      const payload: StaffDashRow = {
        ...form,
        collegeId,
        leaveYear: Number(ymdDate.split("-")[0]),
        employeeId: applyEmp.pk_emp_id,
        employeeNumber: applyEmp.empNumber,
        applicationDate: ymdDate,
      };
      const result = await submitEmployeeLeaveApplication(payload);
      if (result.success) {
        toastSuccess(result.message || "Leave applied");
        setLeaveOpen(false);
        void queryClient.invalidateQueries({ queryKey: QK.hodDashboard.all });
      } else {
        toastInfo(result.message || "Unable to apply leave");
      }
    } catch (e) {
      toastError(e, "Failed to apply leave");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function handleStatusSave(details: { reason: string }) {
    if (!actionRow || !actionName) return;
    const statuses = statusesQ.data ?? [];
    const code = actionName === "RECOMMEND" ? "LPSRECOMMENDED" : "LPSREJECTED";
    const match = statuses.find((x) => String(x.generalDetailCode) === code);
    const item: HodAppliedLeaveRow = {
      ...actionRow,
      reason: details.reason,
    };
    if (match) {
      item.leaveprocessStatusId = Number(match.generalDetailId);
    }
    setActionSaving(true);
    try {
      const result = await submitEmployeeLeaveApplication(item);
      if (result.success) {
        toastSuccess(result.message || "Leave updated");
        setActionRow(null);
        setActionName(null);
        void queryClient.invalidateQueries({
          queryKey: QK.hodDashboard.leaveRequests(
            collegeId,
            employeeId,
            leaveYear,
          ),
        });
      } else {
        toastError(result.message || "Unable to update leave");
      }
    } catch (e) {
      toastError(e, "Failed to update leave");
    } finally {
      setActionSaving(false);
    }
  }

  async function viewProxies(item: HodAppliedLeaveRow) {
    const empId = Number(item.employeeId ?? 0);
    if (!empId) return;
    setProxiesLoading(true);
    try {
      const rows = await listFacultyWorkloadProxies({
        leaveFromDate: String(item.leaveFromDate ?? ""),
        leaveToDate: String(item.leaveToDate ?? ""),
        employeeId: empId,
      });
      if (rows.length > 0) {
        setProxies(rows);
        setProxiesOpen(true);
      } else {
        toastInfo("No workload adjustments found in these dates.");
      }
    } catch (e) {
      toastError(e, "Failed to load proxies");
    } finally {
      setProxiesLoading(false);
    }
  }

  if (employeeId <= 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Employee profile is not linked to this user. HOD dashboard widgets
        require an employee id.
      </p>
    );
  }

  if (departmentId <= 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Employee is not assigned to any department. HOD dashboard requires a
        department.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <WidgetCard
          title="Weekly Department Attendance"
          onFilter={toggleFilter}
          filterOpen={isFilter}
          search={searchText}
          onSearch={setSearchText}
        >
          {attendanceQ.isLoading ? (
            <Skeleton className="m-2 h-[363px] w-auto" />
          ) : (
            <div className="example-container h-[363px] overflow-auto pb-4">
              <table className="w-full border-separate border-spacing-px text-left">
                <thead>
                  <tr>
                    <th className="w-[3%] bg-[#C3D9FF] p-[5px] text-[13px] font-medium">
                      SI.No
                    </th>
                    <th className="w-[15%] bg-[#C3D9FF] p-[5px] text-[13px] font-medium">
                      Employee
                    </th>
                    {attKeys.map((key) => (
                      <th
                        key={key.date}
                        className="bg-[#C3D9FF] p-[5px] text-center text-[13px] font-medium"
                      >
                        {formatAttHeader(key.date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((empAtt) => (
                    <tr key={empAtt.empNumber}>
                      <th className="w-[3%] p-2 text-center text-[12px] font-medium">
                        {empAttendance.indexOf(empAtt) + 1}
                      </th>
                      <th className="w-[15%] p-2 text-[12px] font-medium">
                        {empAtt.firstName} (
                        <span className="text-blue-600">
                          {empAtt.empNumber}
                        </span>
                        )
                      </th>
                      {empAtt.subjectAttendance.map((cell) => (
                        <td
                          key={`${empAtt.empNumber}-${cell.date}`}
                          className="group relative cursor-pointer p-2 text-center text-[12px] font-medium"
                          onClick={() => void dayClicked(empAtt, cell)}
                        >
                          {cell.dayTypes.map((dt, j) =>
                            dt.type !== "Apply Leave" && dt.type !== "" ? (
                              <span
                                key={`${cell.date}-${dt.type}-${j}`}
                                className="mb-[3px] mr-0.5 inline-block min-w-[10px] rounded-[10px] px-[7px] py-[3px] text-[9px] font-bold leading-none text-black"
                                style={{ background: dt.colorCode }}
                              >
                                {dt.type}
                              </span>
                            ) : null,
                          )}
                          {hasText(cell.in) ? (
                            <p className="m-0 bg-[rgb(202,175,255)] px-[3px] py-[3px] text-[10px] font-medium">
                              {cell.in}
                            </p>
                          ) : null}
                          {hasText(cell.out) ? (
                            <p className="m-0 bg-[rgb(255,200,208)] px-[3px] py-[3px] text-[10px] font-medium">
                              {cell.out}
                            </p>
                          ) : null}
                          {cell.Day === "Apply Leave" ? (
                            <ApplyLeaveIcon />
                          ) : null}
                          <AttendanceCellTooltip cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          title={`Department Leave Summary for ${leaveYear}`}
          onFilter={toggleFilter}
          filterOpen={isFilter}
          search={searchText1}
          onSearch={setSearchText1}
        >
          {leaveSummaryQ.isLoading ? (
            <Skeleton className="m-2 h-[363px] w-auto" />
          ) : (
            <div className="h-[363px] overflow-auto pb-4">
              <table className="w-full border-separate border-spacing-px text-left">
                <thead>
                  <tr>
                    <th className="w-[3%] bg-[#C3D9FF] p-[5px] text-[13px] font-medium">
                      SI.No
                    </th>
                    <th className="bg-[#C3D9FF] p-[5px] text-[13px] font-medium">
                      Employee
                    </th>
                    {lvKeys.map((key) => (
                      <th
                        key={key.leaveCode}
                        className="w-[6%] bg-[#C3D9FF] p-[5px] text-center text-[13px] font-medium"
                      >
                        {key.leaveCode}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaveSummary.map((elv) => (
                    <tr key={elv.employeeId}>
                      <th className="w-[3%] p-2 text-center text-[12px] font-medium">
                        {empLv.indexOf(elv) + 1}
                      </th>
                      <th className="p-2 text-[12px] font-medium">
                        {elv.firstName} (
                        <span className="text-blue-600">{elv.empNumber}</span>)
                      </th>
                      {elv.subjectAttendance.map((lv) => (
                        <td
                          key={`${elv.employeeId}-${lv.leaveCode}`}
                          className="w-[6%] p-2 text-center text-[12px] font-medium"
                        >
                          {lv.con}/{lv.bal}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>

        <WidgetCard
          title="Today Proxy List"
          onFilter={toggleFilter}
          filterOpen={isFilter}
          search={proxySearch}
          onSearch={(v) => {
            setProxySearch(v);
            setProxyPage(0);
          }}
        >
          {proxiesQ.isLoading ? (
            <Skeleton className="m-2 h-[308px] w-auto" />
          ) : (
            <>
              <div className="max-h-[308px] overflow-auto">
                <table className="w-full border-separate border-spacing-px text-left">
                  <thead>
                    <tr>
                      {[
                        "SI.No",
                        "Proxy Subject",
                        "Assign Employee",
                        "Proxy Employee",
                        "Proxy Period",
                        "Course",
                      ].map((h) => (
                        <th
                          key={h}
                          className="bg-[#C3D9FF] p-[5px] text-[13px] font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedProxies.map((row) => (
                      <tr
                        key={String(
                          row.staffProxyId ??
                            row.timetableScheduleId ??
                            `${row.assignedEmpNumber}-${row.proxyEmpNumber}-${row.startTime}-${row.subjectName}`,
                        )}
                      >
                        <td className="p-2 text-[12px] font-medium">
                          {staffproxyList.indexOf(row) + 1}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(row.subjectName ?? "")}{" "}
                          <span className="text-blue-600">
                            ({String(row.proxySubjecttypeDisplayName ?? "")})
                          </span>
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(row.assignedFirstName ?? "")}
                          {row.assignedEmpNumber != null ? (
                            <span className="text-blue-600">
                              {" "}
                              ({String(row.assignedEmpNumber)})
                            </span>
                          ) : null}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(row.proxyFirstName ?? "")}
                          {row.proxyEmpNumber != null ? (
                            <span className="text-blue-600">
                              {" "}
                              ({String(row.proxyEmpNumber)})
                            </span>
                          ) : null}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(row.classTimingName ?? "")}{" "}
                          <span className="text-blue-600">
                            ({String(row.startTime ?? "")}-
                            {String(row.endTime ?? "")})
                          </span>
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(row.collegeCode ?? "")}/
                          {String(row.courseName ?? "")}/
                          {String(row.groupName ?? "")}/
                          {String(row.courseYearName ?? "")}/
                          {String(row.groupSectionName ?? "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 px-3 py-2 text-[12px]">
                <span>Items per page:</span>
                <Select
                  value={String(proxyPageSize)}
                  onChange={(v) => {
                    setProxyPageSize(Number(v ?? 5));
                    setProxyPage(0);
                  }}
                  options={PROXY_PAGE_SIZES.map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                  searchable={false}
                  clearable={false}
                  className="w-[72px]"
                />
                <span>
                  {filteredProxies.length === 0
                    ? "0 of 0"
                    : `${proxyPage * proxyPageSize + 1}–${Math.min(
                        (proxyPage + 1) * proxyPageSize,
                        filteredProxies.length,
                      )} of ${filteredProxies.length}`}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={proxyPage <= 0}
                  onClick={() => setProxyPage((p) => Math.max(0, p - 1))}
                >
                  ‹
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={proxyPage + 1 >= proxyPageCount}
                  onClick={() =>
                    setProxyPage((p) => Math.min(proxyPageCount - 1, p + 1))
                  }
                >
                  ›
                </Button>
              </div>
            </>
          )}
        </WidgetCard>

        <WidgetCard
          title={`Leave Requests for ${leaveYear}`}
          onFilter={toggleFilter}
          filterOpen={isFilter}
          search={searchText2}
          onSearch={setSearchText2}
        >
          {leaveRequestsQ.isLoading || actionSaving || proxiesLoading ? (
            <Skeleton className="m-2 h-[363px] w-auto" />
          ) : (
            <div className="h-[363px] overflow-auto pb-4">
              <table className="w-full border-separate border-spacing-px text-left">
                <thead>
                  <tr>
                    {[
                      "SI.No",
                      "Leave Type",
                      "Applied On",
                      "Leave Duration",
                      "No. of Days",
                      "Leave Applied By",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "bg-[#C3D9FF] p-[5px] text-[13px] font-medium",
                          h === "Actions" && "w-[30%]",
                          h === "SI.No" && "w-[3%]",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApplied.map((lv) => {
                    const half = leaveDayLabel(lv.isForenoonAfternoon);
                    return (
                      <tr
                        key={String(
                          lv.leaveApplictionId ??
                            lv.leaveApplicationId ??
                            lv.empNumber,
                        )}
                      >
                        <td className="w-[3%] p-2 text-center text-[12px] font-medium">
                          {appliedLeaves.indexOf(lv) + 1}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(lv.leaveCode ?? "")}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {lv.applicationDate != null
                            ? formatLeaveDate(lv.applicationDate)
                            : "--"}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {lv.leaveFromDate != null
                            ? `${formatLeaveDate(lv.leaveFromDate)} - ${formatLeaveDate(lv.leaveToDate)}`
                            : "--"}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(lv.noOfLeaves ?? "")}
                          {lv.isForenoonAfternoon != null && half
                            ? ` (${half})`
                            : null}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          <span
                            className="text-blue-600"
                            title={String(lv.firstName ?? "")}
                          >
                            {lv.empNumber}
                          </span>
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          <div className="flex flex-wrap items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              className="mr-1 h-7 bg-[#ffcf46] text-black hover:bg-[#e6ba3e]"
                              title="Recommend"
                              onClick={() => {
                                setActionRow(lv);
                                setActionName("RECOMMEND");
                              }}
                            >
                              Recommend
                            </Button>
                            <button
                              type="button"
                              className="px-1 text-[#042956]"
                              title="View"
                              onClick={() => void viewProxies(lv)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <Button
                              type="button"
                              size="sm"
                              className="my-1 h-7 bg-red-600 text-white hover:bg-red-700"
                              title="Reject"
                              onClick={() => {
                                setActionRow(lv);
                                setActionName("REJECT");
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>
      </div>

      <ApplyLateLeaveModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onSubmit={handleLeaveSubmit}
        data={leaveCtx}
        organizationId={organizationId}
        isSubmitting={leaveSubmitting}
      />

      <ChangeStatusModal
        open={actionRow != null && actionName != null}
        row={actionRow}
        onClose={() => {
          setActionRow(null);
          setActionName(null);
        }}
        onSave={(payload) => {
          void handleStatusSave(payload);
        }}
      />

      <ViewProxiesModal
        open={proxiesOpen}
        proxies={proxies}
        onClose={() => {
          setProxiesOpen(false);
          setProxies([]);
        }}
      />
    </div>
  );
}
