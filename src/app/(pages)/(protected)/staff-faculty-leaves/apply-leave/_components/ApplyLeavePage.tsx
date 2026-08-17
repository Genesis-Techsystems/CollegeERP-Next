"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  cancelEmployeeLeaveApplication,
  getLeaveYears,
  getStaffEmployeeDetailsById,
  leaveApplicationDateYmd,
  listEmployeeRunningLeaves,
  listLeaveProcessStatuses,
  listStaffLeaveApplications,
  sortLeaveApplicationsDesc,
  submitEmployeeLeaveApplication,
  toLeaveYmd,
  type AnyRow,
} from "@/services";
import { AddLeaveModal, type AddLeaveDialogData } from "./AddLeaveModal";
import { ChangeStatusModal } from "./ChangeStatusModal";

const DEFAULT_EMPLOYEE_PHOTO = "/assets/images/avatars/default_Student.png";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  leaveName: {
    field: "leaveName",
    headerName: "Leave Type",
    minWidth: 120,
  } as ColDef<AnyRow>,
  applicationDate: {
    field: "applicationDate",
    headerName: "Applied On",
    minWidth: 120,
  } as ColDef<AnyRow>,
  leaveFromDate: {
    field: "leaveFromDate",
    headerName: "Leave Duration",
    minWidth: 180,
  } as ColDef<AnyRow>,
  isForenoonAfternoon: {
    field: "isForenoonAfternoon",
    headerName: "Leave Day",
    minWidth: 110,
  } as ColDef<AnyRow>,
  noOfLeaves: {
    field: "noOfLeaves",
    headerName: "No. of Days",
    minWidth: 100,
  } as ColDef<AnyRow>,
  assignedEmployeeFirstName: {
    field: "assignedEmployeeFirstName",
    headerName: "Assigned To",
    minWidth: 150,
  } as ColDef<AnyRow>,
  leaveprocessStatusDisplayName: {
    field: "leaveprocessStatusDisplayName",
    headerName: "Leave Status",
    minWidth: 130,
  } as ColDef<AnyRow>,
  reason: {
    field: "reason",
    headerName: "Comments",
    minWidth: 140,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 140,
    flex: 0,
    width: 140,
  } as ColDef<AnyRow>,
};

function leaveDayLabel(code: unknown): string {
  if (code === "H") return "Full Day";
  if (code === "F") return "Fore Noon";
  if (code === "A") return "After Noon";
  return code == null || code === "" ? "-" : String(code);
}

function formatMdY(value: unknown): string {
  if (value == null || value === "") return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LeaveStatusCell({ row }: { row: AnyRow }) {
  const code = String(row.leaveprocessStatusCode ?? "");
  const label = String(row.leaveprocessStatusDisplayName ?? "");
  let className = "text-amber-600 font-medium";
  if (code === "LPSCOMPLETE" || code === "LPSAPPROVED") {
    className = "text-emerald-600 font-medium";
  } else if (code === "LPSREJECTED" || code === "LPSCANCEL") {
    className = "text-destructive font-medium";
  } else if (code === "LPSAPPLIED") {
    className = "text-[#0c51a4] font-medium";
  }
  return <span className={className}>{label}</span>;
}

export function ApplyLeavePage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const collegeId = Number(user?.collegeId ?? 0);
  const organizationId = Number(user?.organizationId ?? 0);
  const academicYearId = Number(user?.academicYearId ?? 0);

  const [years, setYears] = useState<number[]>([]);
  const [leaveYear, setLeaveYear] = useState<number | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<AnyRow>({});
  const [leaveHistory, setLeaveHistory] = useState<AnyRow[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<AnyRow[]>([]);
  const [leaveStatuses, setLeaveStatuses] = useState<AnyRow[]>([]);
  const [totalBalancedLeaves, setTotalBalancedLeaves] = useState(0);
  const [totalConsumedLeaves, setTotalConsumedLeaves] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addData, setAddData] = useState<AddLeaveDialogData | null>(null);
  const [cancelRow, setCancelRow] = useState<AnyRow | null>(null);

  const yearOptions: SelectOption[] = useMemo(
    () => years.map((y) => ({ value: String(y), label: String(y) })),
    [years],
  );

  const empNumber =
    String(employeeDetails.empNumber ?? "") ||
    (typeof window !== "undefined"
      ? window.localStorage.getItem("empNumber") || ""
      : "");

  const loadLeaveStatuses = useCallback(async () => {
    try {
      const rows = await listLeaveProcessStatuses();
      setLeaveStatuses(rows);
    } catch (e) {
      toastError(e, "Failed to load leave statuses");
    }
  }, []);

  const loadLeaveApplications = useCallback(
    async (year: number) => {
      if (!collegeId || !employeeId) return;
      try {
        const rows = await listStaffLeaveApplications(
          collegeId,
          employeeId,
          year,
        );
        setLeaveApplications(sortLeaveApplicationsDesc(rows));
      } catch (e) {
        toastError(e, "Failed to load leave applications");
      }
    },
    [collegeId, employeeId],
  );

  const loadLeaveHistory = useCallback(
    async (year: number) => {
      if (!collegeId || !employeeId) return;
      try {
        const rows = await listEmployeeRunningLeaves(
          collegeId,
          employeeId,
          year,
        );
        setLeaveHistory(rows);
        let bal = 0;
        let consumed = 0;
        for (const row of rows) {
          if (String(row.leaveCode) !== "LOP") {
            bal += Number(row.balanceLeaves ?? 0);
            consumed += Number(row.consumedLeaves ?? 0);
          }
        }
        setTotalBalancedLeaves(bal);
        setTotalConsumedLeaves(consumed);
        await loadLeaveApplications(year);
      } catch (e) {
        toastError(e, "Failed to load leave balances");
      }
    },
    [collegeId, employeeId, loadLeaveApplications],
  );

  const selectedLeaveYear = useCallback(
    async (year: number | null) => {
      if (year == null || !employeeId) return;
      setLoading(true);
      try {
        try {
          const details = await getStaffEmployeeDetailsById(employeeId);
          setEmployeeDetails(details ?? {});
          if (details) {
            if (details.empNumber != null) {
              window.localStorage.setItem(
                "empNumber",
                String(details.empNumber),
              );
            }
            if (details.reportingManagerId != null) {
              window.localStorage.setItem(
                "reportingManagerId",
                String(details.reportingManagerId),
              );
            }
            if (details.reportingManagerName != null) {
              window.localStorage.setItem(
                "reportingManagerName",
                String(details.reportingManagerName),
              );
            }
            if (details.firstName != null) {
              window.localStorage.setItem("uName", String(details.firstName));
            }
          }
        } catch {
          // Employee details are independent of leave year. A failed lookup
          // must not toast on year change — enrolment still loads below.
        }
        void loadLeaveStatuses();
        await loadLeaveHistory(year);
      } finally {
        setLoading(false);
      }
    },
    [employeeId, loadLeaveHistory, loadLeaveStatuses],
  );

  useEffect(() => {
    if (sessionLoading || isResolving || !employeeId) return;
    let cancelled = false;
    (async () => {
      try {
        const yearList = await getLeaveYears();
        if (cancelled) return;
        const nums = yearList
          .map((y) => Number(y))
          .filter((n) => Number.isFinite(n));
        setYears(nums);

        const stored =
          typeof window !== "undefined"
            ? Number(window.localStorage.getItem("currentYear") || 0)
            : 0;
        const current = stored || new Date().getFullYear();
        if (typeof window !== "undefined" && !stored) {
          window.localStorage.setItem("currentYear", String(current));
        }
        // Angular always selects +currentYear after years load
        setLeaveYear(current);
        await selectedLeaveYear(current);
      } catch (e) {
        toastError(e, "Failed to load leave years");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, isResolving, employeeId, selectedLeaveYear]);

  async function persistLeaveRows(
    details: AnyRow[],
    mode: "create" | "update",
    original?: AnyRow,
  ) {
    if (!leaveYear || !employeeId) return;
    setSaving(true);
    try {
      for (let i = 0; i < details.length; i++) {
        const row = { ...details[i] };
        if (mode === "create") {
          row.collegeId = collegeId;
          row.leaveYear = leaveYear;
          row.employeeId = employeeId;
          row.employeeNumber = empNumber;
          row.applicationDate = leaveApplicationDateYmd();
          row.leaveFromDate = toLeaveYmd(row.leaveFromDate);
          row.leaveToDate = toLeaveYmd(row.leaveToDate);
        } else if (original) {
          if (Number(row.leavetypeId) === Number(original.leavetypeId)) {
            row.leaveApplictionId =
              original.leaveApplictionId ?? original.leaveApplicationId;
          }
          row.collegeId = collegeId;
          row.isActive = original.isActive;
          row.leaveYear = leaveYear;
          row.employeeId = employeeId;
          row.employeeNumber = empNumber;
          row.applicationDate = original.applicationDate
            ? new Date(String(original.applicationDate)).toISOString()
            : leaveApplicationDateYmd();
          row.leaveFromDate = toLeaveYmd(row.leaveFromDate);
          row.leaveToDate = toLeaveYmd(row.leaveToDate);
        }

        const result = await submitEmployeeLeaveApplication(row);
        if (result.success) {
          if (details.length === i + 1) {
            toastSuccess(result.message ?? "Leave application saved");
            await loadLeaveApplications(leaveYear);
            if (mode === "update") await loadLeaveHistory(leaveYear);
          }
        } else {
          toastInfo(result.message ?? "Unable to save leave application");
        }
      }
    } catch (e) {
      toastError(e, "Failed to save leave application");
    } finally {
      setSaving(false);
    }
  }

  function openApplyLeave() {
    const reportingManagerId =
      Number(employeeDetails.reportingManagerId ?? 0) || null;
    if (reportingManagerId == null || reportingManagerId === 0) {
      toastInfo("Reporting manager is empty.");
      return;
    }
    if (!leaveYear) return;
    setAddData({
      collegeId: Number(employeeDetails.collegeId ?? collegeId),
      leaveYear,
      employeeId,
      reportingManagerId,
      leaveCounts: leaveHistory,
    });
    setAddOpen(true);
  }

  function openEdit(row: AnyRow) {
    if (!leaveYear) return;
    setAddData({
      ...row,
      collegeId: Number(row.collegeId ?? collegeId),
      leaveYear,
      employeeId: Number(row.employeeId ?? employeeId),
      reportingManagerId:
        Number(employeeDetails.reportingManagerId ?? 0) || null,
      leaveCounts: leaveHistory,
      leaveApplictionId: Number(
        row.leaveApplictionId ?? row.leaveApplicationId ?? 0,
      ),
      leavetypeId: Number(row.leavetypeId ?? 0),
      leaveFromDate: String(row.leaveFromDate ?? ""),
      leaveToDate: String(row.leaveToDate ?? ""),
      leaveDescription: String(row.leaveDescription ?? ""),
      noOfLeaves: Number(row.noOfLeaves ?? 0),
      isForenoonAfternoon: String(row.isForenoonAfternoon ?? "H"),
      isActive: Boolean(row.isActive ?? true),
      reason: String(row.reason ?? ""),
    });
    setAddOpen(true);
  }

  async function handleCancelSave(payload: { reason: string }) {
    if (!cancelRow || !leaveYear) return;
    const item: AnyRow = { ...cancelRow, reason: payload.reason };
    const cancelStatus = leaveStatuses.find(
      (x) => String(x.generalDetailCode) === "LPSCANCEL",
    );
    if (cancelStatus) {
      item.leaveprocessStatusId = Number(cancelStatus.generalDetailId);
    }

    setCancelRow(null);
    setSaving(true);
    try {
      if (String(item.leaveprocessStatusCode) === "LPSAPPROVED") {
        item.isActive = false;
        const result = await cancelEmployeeLeaveApplication(item);
        if (result.success) {
          toastSuccess(result.message ?? "Leave cancelled");
          await loadLeaveHistory(leaveYear);
          await loadLeaveApplications(leaveYear);
        } else {
          toastInfo(result.message ?? "Unable to cancel leave");
        }
      } else {
        const result = await submitEmployeeLeaveApplication(item);
        if (result.success) {
          toastSuccess(result.message ?? "Leave cancelled");
          await loadLeaveApplications(leaveYear);
        } else {
          toastInfo(result.message ?? "Unable to cancel leave");
        }
      }
    } catch (e) {
      toastError(e, "Failed to cancel leave");
    } finally {
      setSaving(false);
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.leaveName,
      {
        ...COL_DEFS.applicationDate,
        valueFormatter: (p) => formatMdY(p.value),
      },
      {
        ...COL_DEFS.leaveFromDate,
        valueGetter: (p) => {
          const row = p.data;
          if (!row?.leaveFromDate) return "--";
          return `${formatMdY(row.leaveFromDate)} - ${formatMdY(row.leaveToDate)}`;
        },
      },
      {
        ...COL_DEFS.isForenoonAfternoon,
        valueFormatter: (p) => leaveDayLabel(p.value),
      },
      COL_DEFS.noOfLeaves,
      {
        ...COL_DEFS.assignedEmployeeFirstName,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <span>
              {String(row.assignedEmployeeFirstName ?? "")}
              {row.assignedEmpNumber || row.employeeNumber ? (
                <span className="text-[#0c51a4]">
                  {" "}
                  ({String(row.assignedEmpNumber ?? row.employeeNumber)})
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        ...COL_DEFS.leaveprocessStatusDisplayName,
        cellRenderer: (p: ICellRendererParams<AnyRow>) =>
          p.data ? <LeaveStatusCell row={p.data} /> : null,
      },
      {
        ...COL_DEFS.reason,
        valueFormatter: (p) =>
          p.value == null || p.value === "" ? "--" : String(p.value),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          const code = String(row.leaveprocessStatusCode ?? "");
          const canEdit =
            code !== "LPSAPPROVED" &&
            code !== "LPSREJECTED" &&
            code !== "LPSCANCEL" &&
            code !== "LPSRECOMMENDED";
          const canCancel = code === "LPSAPPLIED" || code === "LPSRECOMMENDED";
          const showDash =
            code === "LPSREJECTED" ||
            code === "LPSCANCEL" ||
            code === "LPSAPPROVED";

          return (
            <div className="flex items-center gap-1">
              {canEdit ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="Edit leave"
                  onClick={() => openEdit(row)}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {showDash ? <span>--</span> : null}
              {canCancel ? (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCancelRow(row)}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    // openEdit closes over leaveHistory/leaveYear — recreate when those change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leaveHistory, leaveYear, employeeDetails, employeeId, collegeId],
  );

  const photoSrc = String(employeeDetails.photoPath ?? "");

  return (
    <FilteredListPage
      title="Apply Leave"
      filtersCollapsible
      filtersDefaultOpen
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField
            label="Leave Year *"
            className="!flex-[0_0_10rem] !min-w-[10rem] !max-w-[10rem]"
          >
            <Select
              value={leaveYear != null ? String(leaveYear) : null}
              onChange={(v) => {
                const y = v ? Number(v) : null;
                setLeaveYear(y);
                void selectedLeaveYear(y);
              }}
              options={yearOptions}
              placeholder="Leave Year"
              isLoading={sessionLoading || isResolving}
              searchable={false}
              clearable={false}
            />
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      bodyClassName="px-5 pt-2 pb-4"
      tableHeader={
        <div className="table-context-header">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            desktop_windows
          </span>
          <strong className="table-context-header__title">Leave Details</strong>
        </div>
      }
      body={
        leaveYear != null ? (
          <div className="space-y-3">
            <div className="flex items-stretch overflow-hidden rounded-[3px] border border-[#c3d9ff] bg-white">
              <div className="flex w-[120px] shrink-0 items-center justify-center bg-[#d9e7f8] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc || DEFAULT_EMPLOYEE_PHOTO}
                  alt=""
                  className="h-[86px] w-full object-contain"
                  onError={(e) => {
                    const image = e.currentTarget;
                    if (!image.src.endsWith("default_Student.png")) {
                      image.src = DEFAULT_EMPLOYEE_PHOTO;
                    }
                  }}
                />
              </div>
              <div className="flex flex-col justify-center gap-1.5 px-5 py-3 text-[13px]">
                <p className="font-medium text-[#0c51a4]">
                  {String(employeeDetails.firstName ?? "")}
                </p>
                <p className="text-[#8c8c8c]">
                  {String(employeeDetails.empNumber ?? "")}
                </p>
                {employeeDetails.empDeptName ? (
                  <p className="text-[#8c8c8c]">
                    {String(employeeDetails.empDeptName)}
                  </p>
                ) : null}
                <p className="text-[#8c8c8c]">
                  {String(employeeDetails.mobile ?? "")}
                </p>
              </div>
            </div>

            {leaveHistory.length === 0 && !loading ? (
              <p className="py-2 text-center text-sm text-destructive">
                No enrolment is available for this employee.
              </p>
            ) : null}

            {leaveHistory.length > 0 ? (
              <div className="rounded-[3px] border border-[#c3d9ff] bg-white p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                  {leaveHistory.map((leave) => (
                    <div
                      key={String(leave.leavetypeId ?? leave.leaveCode)}
                      className="text-[13px]"
                    >
                      <p className="text-[#3c3c3c]">
                        {String(leave.leaveName ?? "")} (
                        <span className="font-medium text-[#0c51a4]">
                          {String(leave.leaveCode ?? "")}
                        </span>
                        )
                      </p>
                      <p className="mt-1 text-[#8c8c8c]">
                        {String(leave.balanceLeaves ?? 0)} /{" "}
                        {String(leave.consumedLeaves ?? 0)}
                      </p>
                    </div>
                  ))}
                  <div className="text-[13px]">
                    <p className="text-[#3c3c3c]">Total Leaves</p>
                    <p className="mt-1 text-[#8c8c8c]">
                      {totalBalancedLeaves} / {totalConsumedLeaves}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={openApplyLeave}
                    disabled={loading || saving}
                    className="h-[34px] rounded-[4px] bg-[#042956] px-4 text-[13px] font-medium text-white shadow-sm hover:bg-[#031f42]"
                  >
                    Apply Leave
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null
      }
    >
      {leaveApplications.length > 0 ? (
        <DataTable
          title="Leave Applications"
          rowData={leaveApplications}
          columnDefs={columnDefs}
          loading={loading || saving}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
          }}
        />
      ) : null}

      <AddLeaveModal
        open={addOpen}
        data={addData}
        organizationId={organizationId}
        academicYearId={academicYearId}
        onClose={() => {
          setAddOpen(false);
          setAddData(null);
        }}
        onSave={(rows) => {
          const isEdit = Boolean(
            addData?.leaveApplictionId || addData?.leaveApplicationId,
          );
          setAddOpen(false);
          const original = isEdit && addData ? (addData as AnyRow) : undefined;
          void persistLeaveRows(rows, isEdit ? "update" : "create", original);
          setAddData(null);
        }}
      />

      <ChangeStatusModal
        open={Boolean(cancelRow)}
        row={cancelRow}
        onClose={() => setCancelRow(null)}
        onSave={(payload) => {
          void handleCancelSave(payload);
        }}
      />
    </FilteredListPage>
  );
}
