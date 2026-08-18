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
  approveFeeConcessionApproval,
  filterHodByEmployee,
  filterPrincipalAppliedLeaves,
  getFeeDiscountSummaryChart,
  getFeeSummaryChart,
  getLeaveProcessStatuses,
  getPrincipalDashboardCounts,
  getPrincipalDiscountApprovals,
  getPrincipalEmpAttendanceChart,
  getPrincipalLeaveApplications,
  getPrincipalManagementReport,
  getPrincipalStdAttendanceChart,
  getSchoolWiseEmployeesChart,
  getSchoolWiseSalariesChart,
  getSchoolWiseStudentsChart,
  listFacultyWorkloadProxies,
  principalLeaveYear,
  readDashStorageNum,
  rejectFeeConcessionApproval,
  submitEmployeeLeaveApplication,
  type AnyRow,
  type PrincipalLeaveRow,
} from "@/services";
import type { FeeConcessionApprovalRow } from "@/types/fees-collection";
import type { SessionUser } from "@/types/user";
import { ApproveLeaveModal } from "../../principal-my-approvals/leave-applications/_components/ApproveLeaveModal";
import { ViewProxiesModal } from "../../principal-my-approvals/leave-applications/_components/ViewProxiesModal";
import {
  ConcessionStatusModal,
  type ConcessionStatusResult,
} from "../../principal-my-approvals/fee-concession-approvals/_components/ConcessionStatusModal";
import { AdmissionsPieChart } from "./vice-chancellor/AdmissionsPieChart";
import { ProcDrilldownChart } from "./vice-chancellor/ProcDrilldownChart";
import {
  InventoryStockSummary,
  LibrarySummaryGrid,
  TransportSummary,
} from "./vice-chancellor/SummaryWidgets";
import {
  VC_CHART_COLORS,
  type DrillSpec,
} from "./vice-chancellor/vc-chart-utils";

interface PrincipalDashboardProps {
  user: SessionUser;
  employeeId: number;
}

const PAGE_SIZES = [5, 10, 25, 100] as const;

const EMP_ATT_SPEC: DrillSpec = {
  category: ["Month", "Date"],
  categoryName: ["month", "date"],
  categoryId: ["month", "date"],
  columns: ["Absent", "Present"],
  columnsTitle: ["Absent", "Present"],
  colors: [...VC_CHART_COLORS],
  valueMode: "direct",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "Month",
  yAxisTitle: "No. of Classes",
  showLegend: true,
};

const STD_ATT_SPEC: DrillSpec = {
  category: ["Month", "Date"],
  categoryName: ["Month", "Date"],
  categoryId: ["Month", "Date"],
  columns: ["Absent", "Present"],
  columnsTitle: ["Absent", "Present"],
  colors: [...VC_CHART_COLORS],
  valueMode: "direct",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "Month",
  yAxisTitle: "No. of Classes",
  showLegend: true,
};

const FEE_SPEC: DrillSpec = {
  category: ["District", "College", "Fees Category"],
  categoryName: ["district_name", "college_shortname", "fee_category_name"],
  categoryId: ["pk_district_id", "pk_college_id", "pk_fee_category_id"],
  columns: ["discount", "balance", "paid"],
  columnsTitle: ["Discount", "Balance", "Paid"],
  colors: [...VC_CHART_COLORS],
  valueMode: "suffix",
  stacked: true,
  colorByPoint: false,
  xAxisTitle: "District",
  yAxisTitle: "Fee Amount",
  showLegend: true,
};

const SALARY_SPEC: DrillSpec = {
  category: ["district", "College", "Month"],
  categoryName: ["district_name", "college_shortname", "month"],
  categoryId: ["pk_district_id", "pk_college_id", "month"],
  columns: ["Amount"],
  columnsTitle: ["Employees Salary"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "Salary Amount",
  showLegend: false,
};

const FACULTY_SPEC: DrillSpec = {
  category: ["district", "college"],
  categoryName: ["district_name", "college_shortname"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["emp_count"],
  columnsTitle: ["Employees Count"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "No of employees",
  showLegend: false,
};

const STUDENTS_SPEC: DrillSpec = {
  category: ["district", "college"],
  categoryName: ["district_name", "college_shortname"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["total_students"],
  columnsTitle: ["Students Count"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "No of students",
  showLegend: false,
};

const DISCOUNT_SPEC: DrillSpec = {
  category: ["district", "college"],
  categoryName: ["district_name", "college_name"],
  categoryId: ["pk_district_id", "pk_college_id"],
  columns: ["discount_amount"],
  columnsTitle: ["Discount Amount"],
  colors: ["#5d62b5"],
  valueMode: "direct",
  stacked: true,
  colorByPoint: true,
  xAxisTitle: "District",
  yAxisTitle: "Discount Amount",
  showLegend: false,
};

function ChartCard({
  title,
  children,
  filter,
  onFilter,
  search,
  onSearch,
}: {
  title: string;
  children: ReactNode;
  filter?: boolean;
  onFilter?: () => void;
  search?: string;
  onSearch?: (v: string) => void;
}) {
  return (
    <div className="rounded-[5px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.14)]">
      <div className="flex items-center justify-between border-b border-[#ffcf46] px-2.5 py-2">
        <h3 className="ml-2.5 text-[16px] font-semibold text-[#042956]">
          {title}
        </h3>
        {onFilter ? (
          <button
            type="button"
            className="text-[#6b7280] hover:text-[#042956]"
            aria-label="Filter"
            onClick={onFilter}
          >
            <Filter className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      {filter && onSearch ? (
        <div className="px-3 py-1">
          <SearchInput
            value={search ?? ""}
            onChange={onSearch}
            placeholder="Search"
            className="max-w-xs"
          />
        </div>
      ) : null}
      <div className="p-2.5">{children}</div>
    </div>
  );
}

function formatLeaveDate(value: unknown, pattern: string): string {
  if (value == null || value === "") return "--";
  const raw = String(value);
  try {
    const d = raw.includes("T")
      ? parseISO(raw)
      : raw.includes("/")
        ? new Date(`${raw.replaceAll("/", "-").slice(0, 10)}T00:00:00`)
        : new Date(`${raw.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, pattern);
  } catch {
    return raw;
  }
}

function leaveDayLabel(code: unknown): string {
  if (code === "A") return "After Noon";
  if (code === "F") return "Fore Noon";
  if (code === "H") return "Full Day";
  return "";
}

function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 px-1 py-2 text-[12px]">
      <span>Items per page:</span>
      <Select
        value={String(pageSize)}
        onChange={(v) => onPageSize(Number(v ?? 5))}
        options={PAGE_SIZES.map((n) => ({
          value: String(n),
          label: String(n),
        }))}
        searchable={false}
        clearable={false}
        className="w-[72px]"
      />
      <span>
        {total === 0
          ? "0 of 0"
          : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} of ${total}`}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={page <= 0}
        onClick={() => onPage(Math.max(0, page - 1))}
      >
        ‹
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={page + 1 >= pageCount}
        onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
      >
        ›
      </Button>
    </div>
  );
}

export function PrincipalDashboard({ user }: PrincipalDashboardProps) {
  const queryClient = useQueryClient();
  const collegeId = user.collegeId || readDashStorageNum("collegeId");
  const leaveYearFallback = principalLeaveYear();
  const chartYear = "";

  const [isFilter, setIsFilter] = useState(false);
  const [searchText2, setSearchText2] = useState("");
  const [actionRow, setActionRow] = useState<PrincipalLeaveRow | null>(null);
  const [actionName, setActionName] = useState<"APPROVE" | "REJECT" | null>(
    null,
  );
  const [actionSaving, setActionSaving] = useState(false);
  const [proxiesOpen, setProxiesOpen] = useState(false);
  const [proxies, setProxies] = useState<AnyRow[]>([]);
  const [proxiesLoading, setProxiesLoading] = useState(false);
  const [discountRow, setDiscountRow] =
    useState<FeeConcessionApprovalRow | null>(null);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountPage, setDiscountPage] = useState(0);
  const [discountPageSize, setDiscountPageSize] = useState(5);

  const countsQ = useQuery({
    queryKey: QK.principalDashboard.counts(),
    queryFn: getPrincipalDashboardCounts,
  });
  const year = countsQ.data?.year || leaveYearFallback;

  const statusesQ = useQuery({
    queryKey: QK.principalDashboard.leaveStatuses(),
    queryFn: getLeaveProcessStatuses,
    staleTime: 60_000,
  });

  const managementQ = useQuery({
    queryKey: QK.principalDashboard.management(collegeId),
    enabled: collegeId > 0,
    queryFn: () => getPrincipalManagementReport(collegeId),
  });

  const leavesQ = useQuery({
    queryKey: QK.principalDashboard.leaveRequests(collegeId, leaveYearFallback),
    enabled: collegeId > 0,
    queryFn: async () => {
      const rows = await getPrincipalLeaveApplications({
        collegeId,
        leaveYear: leaveYearFallback,
      });
      return filterPrincipalAppliedLeaves(rows);
    },
  });

  const discountsQ = useQuery({
    queryKey: QK.principalDashboard.discounts(collegeId),
    enabled: collegeId > 0,
    queryFn: () => getPrincipalDiscountApprovals(collegeId),
  });

  const appliedLeaves = leavesQ.data ?? [];
  const filteredLeaves = useMemo(
    () => filterHodByEmployee(appliedLeaves, searchText2),
    [appliedLeaves, searchText2],
  );
  const empPerformances = managementQ.data?.empPerformances ?? [];
  const perfKeys = managementQ.data?.keys ?? [];
  const concessions = discountsQ.data ?? [];
  const pagedDiscounts = concessions.slice(
    discountPage * discountPageSize,
    discountPage * discountPageSize + discountPageSize,
  );

  const chartsEnabled = collegeId > 0;

  async function handleStatusSave(payload: { reason: string }) {
    if (!actionRow || !actionName) return;
    const statuses = statusesQ.data ?? [];
    const code = actionName === "APPROVE" ? "LPSAPPROVED" : "LPSREJECTED";
    const match = statuses.find((x) => String(x.generalDetailCode) === code);
    const item: PrincipalLeaveRow = {
      ...actionRow,
      academicYearId: null,
      reason: payload.reason,
    };
    if (match) item.leaveprocessStatusId = Number(match.generalDetailId);
    setActionSaving(true);
    try {
      const result = await submitEmployeeLeaveApplication(item);
      if (result.success) {
        toastSuccess(result.message || "Leave updated");
        setActionRow(null);
        setActionName(null);
        void queryClient.invalidateQueries({
          queryKey: QK.principalDashboard.leaveRequests(
            collegeId,
            leaveYearFallback,
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

  async function viewProxies(item: PrincipalLeaveRow) {
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

  async function handleDiscountSave(result: ConcessionStatusResult) {
    if (!discountRow) return;
    setDiscountSaving(true);
    try {
      if (result.concession === "APPROVE") {
        await approveFeeConcessionApproval({
          ...discountRow,
          isAproved: true,
          feeStdDataId: result.feeStdDataId,
        });
      } else {
        await rejectFeeConcessionApproval({
          ...discountRow,
          isRejected: true,
        });
      }
      toastSuccess("Saved successfully");
      setDiscountRow(null);
      void queryClient.invalidateQueries({
        queryKey: QK.principalDashboard.discounts(collegeId),
      });
    } catch (e) {
      toastError(e, "Failed to update concession status");
    } finally {
      setDiscountSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <ChartCard title={`Employee Attendance for ${year}`}>
          <ProcDrilldownChart
            name="principal-emp-att"
            collegeId={collegeId}
            year="0"
            enabled={chartsEnabled}
            fetchRows={getPrincipalEmpAttendanceChart}
            spec={EMP_ATT_SPEC}
          />
        </ChartCard>
        <ChartCard title={`Student Attendance for ${year}`}>
          <ProcDrilldownChart
            name="principal-std-att"
            collegeId={collegeId}
            year="0"
            enabled={chartsEnabled}
            fetchRows={getPrincipalStdAttendanceChart}
            spec={STD_ATT_SPEC}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[65%_35%]">
        <ChartCard
          title={`Leave Requests for ${year}`}
          filter={isFilter}
          onFilter={() => setIsFilter((v) => !v)}
          search={searchText2}
          onSearch={setSearchText2}
        >
          {leavesQ.isLoading || actionSaving || proxiesLoading ? (
            <Skeleton className="h-[363px] w-full" />
          ) : (
            <div className="h-[363px] overflow-auto">
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
                  {filteredLeaves.map((lv) => {
                    const half = leaveDayLabel(lv.isForenoonAfternoon);
                    return (
                      <tr
                        key={String(
                          lv.leaveApplictionId ??
                            lv.leaveApplicationId ??
                            lv.empNumber,
                        )}
                      >
                        <td className="p-2 text-center text-[12px] font-medium">
                          {appliedLeaves.indexOf(lv) + 1}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {String(lv.leaveCode ?? "")}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {lv.applicationDate != null
                            ? formatLeaveDate(lv.applicationDate, "MMM d, yyyy")
                            : "--"}
                        </td>
                        <td className="p-2 text-[12px] font-medium">
                          {lv.leaveFromDate != null ? (
                            <>
                              {formatLeaveDate(lv.leaveFromDate, "MMM d")}
                              {lv.leaveToDate != null
                                ? ` - ${formatLeaveDate(lv.leaveToDate, "MMM d, yyyy")}`
                                : ""}
                            </>
                          ) : (
                            "--"
                          )}
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
                              className="my-1 h-7 bg-[#9ae247] text-black hover:bg-[#86c93c]"
                              title="Recommend"
                              onClick={() => {
                                setActionRow(lv);
                                setActionName("APPROVE");
                              }}
                            >
                              Approve
                            </Button>
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
        </ChartCard>

        <ChartCard title="Employee Feedback">
          {managementQ.isLoading ? (
            <Skeleton className="h-[420px] w-full" />
          ) : empPerformances.length > 0 ? (
            <div className="h-[420px] overflow-auto px-1">
              <p className="mb-2 text-black">
                {perfKeys.map((key) => (
                  <span key={String(key.Tag)}>
                    <span
                      className="mr-1 border border-[#dedede] px-1"
                      style={{ background: String(key.Color ?? "") }}
                    >
                      {String(key.Tag ?? "")}
                    </span>
                    {key.Tag === "T" ? (
                      <span className="mr-2.5">Topper</span>
                    ) : null}
                    {key.Tag === "B" ? (
                      <span className="mr-2.5">Bottom</span>
                    ) : null}
                  </span>
                ))}
              </p>
              {empPerformances.map((emp, i) => (
                <div
                  key={`${emp.emp_name}-${i}`}
                  className="mb-1.5 flex gap-2 border-[3px] border-solid p-1"
                  style={{ borderColor: String(emp.Color ?? "#ccc") }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/images/avatars/default_Student.png"
                    alt=""
                    className="h-[50px] w-[50px]"
                  />
                  <div>
                    <p className="m-0 text-[13px] font-medium text-black">
                      {String(emp.emp_name ?? "")}
                    </p>
                    <span className="text-[13px] text-[#888]">
                      {String(emp.avg_rating ?? "")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[120px]" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <ChartCard title={`Fee Summary for ${year}`}>
          <ProcDrilldownChart
            name="principal-fee"
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
            fetchRows={getFeeSummaryChart}
            spec={FEE_SPEC}
          />
        </ChartCard>
        <ChartCard title={`Admissions for ${year}`}>
          <AdmissionsPieChart
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <ChartCard title={`Salary Summary for ${year}`}>
          <ProcDrilldownChart
            name="principal-salary"
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
            fetchRows={getSchoolWiseSalariesChart}
            spec={SALARY_SPEC}
          />
        </ChartCard>
        <ChartCard title="Faculty Count">
          <ProcDrilldownChart
            name="principal-faculty"
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
            fetchRows={getSchoolWiseEmployeesChart}
            spec={FACULTY_SPEC}
          />
        </ChartCard>
        <ChartCard title="Students Count">
          <ProcDrilldownChart
            name="principal-students"
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
            fetchRows={getSchoolWiseStudentsChart}
            spec={STUDENTS_SPEC}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <ChartCard title="Discount Summary">
          <ProcDrilldownChart
            name="principal-discount"
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
            fetchRows={getFeeDiscountSummaryChart}
            spec={DISCOUNT_SPEC}
          />
        </ChartCard>
        <ChartCard title="Inventory Stock Summary">
          <InventoryStockSummary
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[65%_35%]">
        <ChartCard title="Library Summary">
          <LibrarySummaryGrid
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
          />
        </ChartCard>
        <ChartCard title="Transport Summary">
          <TransportSummary
            collegeId={collegeId}
            year={chartYear}
            enabled={chartsEnabled}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-[65%_35%]">
        <ChartCard title="Discount Approvals">
          {discountsQ.isLoading || discountSaving ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <>
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-px text-left">
                  <thead>
                    <tr>
                      {[
                        "SI.No",
                        "Student",
                        "Discount For",
                        "Category",
                        "Particular",
                        "Amount",
                        "Requested Faculty",
                        "Status",
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
                    {pagedDiscounts.map((row) => {
                      const pending =
                        row.isAproved != null &&
                        !row.isAproved &&
                        !row.isRejected;
                      const approved =
                        row.isAproved != null &&
                        row.isAproved &&
                        !row.isRejected;
                      const rejected =
                        row.isAproved != null &&
                        !row.isAproved &&
                        row.isRejected;
                      return (
                        <tr key={String(row.feeStdDiscountId)}>
                          <td className="p-2 text-[12px] font-medium">
                            {concessions.indexOf(row) + 1}
                          </td>
                          <td className="p-2 text-[12px] font-medium">
                            {String(row.studentFirstName ?? "")} (
                            {String(row.studentRollNo ?? "")})
                          </td>
                          <td className="p-2 text-[12px] font-medium">
                            {String(row.collegeName ?? row.collegeCode ?? "")}/
                            {String(row.courseYearName ?? "")}
                          </td>
                          <td className="p-2 text-[12px] font-medium">
                            {String(row.categoryName ?? "")}
                          </td>
                          <td className="p-2 text-[12px] font-medium">
                            {String(row.particularsName ?? "")}
                          </td>
                          <td className="p-2 text-[12px] font-medium">
                            {String(row.value ?? "")}
                          </td>
                          <td className="p-2 text-[12px] font-medium">
                            {String(row.requestedEmployeeFirstName ?? "")}
                          </td>
                          <td className="p-2 text-center text-[12px] font-medium">
                            {pending ? (
                              <button
                                type="button"
                                className="rounded bg-amber-200 px-2 py-0.5 text-amber-900"
                                onClick={() => setDiscountRow(row)}
                              >
                                Pending
                              </button>
                            ) : null}
                            {approved ? (
                              <span className="rounded bg-emerald-200 px-2 py-0.5 text-emerald-800">
                                Approved
                              </span>
                            ) : null}
                            {rejected ? (
                              <span className="rounded bg-red-200 px-2 py-0.5 text-red-800">
                                Rejected
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager
                page={discountPage}
                pageSize={discountPageSize}
                total={concessions.length}
                onPage={setDiscountPage}
                onPageSize={(n) => {
                  setDiscountPageSize(n);
                  setDiscountPage(0);
                }}
              />
            </>
          )}
        </ChartCard>
      </div>

      <ApproveLeaveModal
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
      <ConcessionStatusModal
        open={discountRow != null}
        row={discountRow}
        saving={discountSaving}
        onClose={() => setDiscountRow(null)}
        onSave={(result) => {
          void handleDiscountSave(result);
        }}
      />
    </div>
  );
}
