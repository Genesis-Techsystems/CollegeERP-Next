"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSessionContext } from "@/context/SessionContext";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  getLeaveYears,
  listCollegeLeaveApplications,
  listFacultyWorkloadProxies,
  listLeaveProcessStatuses,
  sortLeaveApplicationsDesc,
  submitEmployeeLeaveApplication,
  type AnyRow,
} from "@/services";
import { ApproveLeaveModal } from "../../leave-applications/_components/ApproveLeaveModal";
import { ViewProxiesModal } from "../../leave-applications/_components/ViewProxiesModal";

type ActionName = "APPROVE" | "REJECT";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  leaveAppliedBy: {
    field: "employeeFirstName",
    headerName: "Leave Applied By",
    minWidth: 160,
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
    minWidth: 200,
  } as ColDef<AnyRow>,
  noOfLeaves: {
    field: "noOfLeaves",
    headerName: "No. of Days",
    minWidth: 130,
  } as ColDef<AnyRow>,
  leaveprocessStatusDisplayName: {
    field: "leaveprocessStatusDisplayName",
    headerName: "Leave Status",
    minWidth: 150,
  } as ColDef<AnyRow>,
  reason: {
    field: "reason",
    headerName: "Comments",
    minWidth: 140,
  } as ColDef<AnyRow>,
  proxies: {
    headerName: "Proxies",
    minWidth: 90,
    flex: 0,
    width: 90,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 200,
    flex: 0,
    width: 200,
  } as ColDef<AnyRow>,
};

function leaveDaySuffix(code: unknown): string {
  if (code === "A") return "After Noon";
  if (code === "F") return "Fore Noon";
  if (code === "H") return "Full Day";
  return "";
}

function formatDdMmmY(value: unknown): string {
  if (value == null || value === "") return "--";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function resolveCollegeId(userCollegeId?: number | null): number {
  const fromUser = Number(userCollegeId ?? 0);
  if (fromUser > 0) return fromUser;
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem("collegeId") || 0) || 0;
}

function LeaveStatusCell({
  row,
  processed,
}: {
  row: AnyRow;
  processed: boolean;
}) {
  const code = String(row.leaveprocessStatusCode ?? "");
  const label = String(row.leaveprocessStatusDisplayName ?? "");

  if (processed) {
    if (code === "LPSCOMPLETE" || code === "LPSAPPROVED") {
      return <span className="text-emerald-600 font-medium">{label}</span>;
    }
    if (code === "LPSREJECTED" || code === "LPSCANCEL") {
      return <span className="text-destructive font-medium">{label}</span>;
    }
    return <span className="text-amber-600 font-medium">{label}</span>;
  }

  let className = "text-amber-600 font-medium";
  if (code === "LPSCOMPLETE") className = "text-emerald-600 font-medium";
  else if (code === "LPSREJECTED") className = "text-destructive font-medium";
  else if (code === "LPSAPPLIED") className = "text-blue-600 font-medium";
  return <span className={className}>{label}</span>;
}

/** Angular leave-approvals pending bucket: LPSAPPLIED | LPSRECOMMENDED. */
function isPendingApproval(row: AnyRow): boolean {
  const code = String(row.leaveprocessStatusCode ?? "");
  return code === "LPSAPPLIED" || code === "LPSRECOMMENDED";
}

/**
 * Angular `my-leaves/leave-approvals` + `principal-my-approvals/leave-approvals`.
 * College-wide list; Approve → LPSAPPROVED / Reject → LPSREJECTED.
 */
export function LeaveApprovalsPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const collegeId = resolveCollegeId(user?.collegeId);

  const [years, setYears] = useState<number[]>([]);
  const [leaveYear, setLeaveYear] = useState<number | null>(null);
  const [showProcessed, setShowProcessed] = useState(false);
  const [appliedLeaves, setAppliedLeaves] = useState<AnyRow[]>([]);
  const [remainingLeaves, setRemainingLeaves] = useState<AnyRow[]>([]);
  const [leaveStatuses, setLeaveStatuses] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actionRow, setActionRow] = useState<AnyRow | null>(null);
  const [actionName, setActionName] = useState<ActionName | null>(null);
  const [proxiesOpen, setProxiesOpen] = useState(false);
  const [proxies, setProxies] = useState<AnyRow[]>([]);
  const [proxiesLoading, setProxiesLoading] = useState(false);

  const yearOptions: SelectOption[] = useMemo(
    () => years.map((y) => ({ value: String(y), label: String(y) })),
    [years],
  );

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
      if (!collegeId || !year) return;
      setLoading(true);
      try {
        const { rows, message } = await listCollegeLeaveApplications(
          collegeId,
          year,
        );
        const pending: AnyRow[] = [];
        const processed: AnyRow[] = [];
        for (const row of sortLeaveApplicationsDesc(rows)) {
          if (isPendingApproval(row)) pending.push(row);
          else processed.push(row);
        }
        setAppliedLeaves(pending);
        setRemainingLeaves(processed);
        if (rows.length === 0) {
          toastSuccess(message?.trim() || "No Record(s) found.");
        }
      } catch (e) {
        toastError(e);
        setAppliedLeaves([]);
        setRemainingLeaves([]);
      } finally {
        setLoading(false);
      }
    },
    [collegeId],
  );

  useEffect(() => {
    if (sessionLoading || !collegeId) return;

    let cancelled = false;
    void (async () => {
      try {
        const yearRows = await getLeaveYears();
        if (cancelled) return;
        const parsed = yearRows
          .map((y) => Number(y))
          .filter((y) => Number.isFinite(y));
        setYears(parsed);

        const currentYear = Number(
          typeof window !== "undefined"
            ? window.localStorage.getItem("currentYear") || ""
            : "",
        );
        const defaultYear = parsed.includes(currentYear)
          ? currentYear
          : (parsed[0] ?? null);
        setLeaveYear(defaultYear);
        if (defaultYear != null) {
          await loadLeaveApplications(defaultYear);
          await loadLeaveStatuses();
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load leave years");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [collegeId, sessionLoading, loadLeaveApplications, loadLeaveStatuses]);

  async function selectedLeaveYear(year: number | null) {
    setLeaveYear(year);
    if (year == null) {
      setAppliedLeaves([]);
      setRemainingLeaves([]);
      return;
    }
    await loadLeaveApplications(year);
    await loadLeaveStatuses();
  }

  function openAction(row: AnyRow, name: ActionName) {
    setActionRow(row);
    setActionName(name);
  }

  async function handleActionSave(payload: { reason: string }) {
    if (!actionRow || !actionName) return;

    const item: AnyRow = { ...actionRow };
    const statusCode = actionName === "APPROVE" ? "LPSAPPROVED" : "LPSREJECTED";
    const status = leaveStatuses.find(
      (x) => String(x.generalDetailCode) === statusCode,
    );
    if (status) {
      item.leaveprocessStatusId = Number(status.generalDetailId);
    }

    // Angular leave-approvals.confirm — assign approver fields from session.
    const userId =
      Number(user?.userId ?? 0) ||
      Number(
        typeof window !== "undefined"
          ? window.localStorage.getItem("userId") || 0
          : 0,
      );
    const uName =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("uName")
        : null) ||
      user?.firstName ||
      user?.userName ||
      "";
    const empNumber =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("empNumber")
        : null) || "";

    item.userId = userId;
    item.assignedEmployeeFirstName = uName;
    item.assignedEmpNumber = empNumber;
    item.assignedEmployeeLastName = null;
    item.academicYearId = null;
    item.reason = payload.reason;

    setSaving(true);
    try {
      const result = await submitEmployeeLeaveApplication(item);
      if (result.success) {
        toastSuccess(result.message ?? "Leave updated");
        setActionRow(null);
        setActionName(null);
        if (leaveYear != null) await loadLeaveApplications(leaveYear);
      } else {
        toastInfo(result.message ?? "Unable to update leave");
      }
    } catch (e) {
      toastError(e, "Failed to update leave");
    } finally {
      setSaving(false);
    }
  }

  const viewProxies = useCallback(async (row: AnyRow) => {
    const empId = Number(row.employeeId ?? 0);
    if (!empId) return;
    setProxiesLoading(true);
    try {
      const rows = await listFacultyWorkloadProxies({
        leaveFromDate: String(row.leaveFromDate ?? ""),
        leaveToDate: String(row.leaveToDate ?? ""),
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
  }, []);

  const appliedByRenderer = (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <span>
        {String(row.employeeFirstName ?? "")}
        {row.employeeNumber ? (
          <span className="text-blue-600"> ({String(row.employeeNumber)})</span>
        ) : null}
      </span>
    );
  };

  const daysRenderer = (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const suffix = leaveDaySuffix(row.isForenoonAfternoon);
    return (
      <span>
        {String(row.noOfLeaves ?? "")}
        {row.isForenoonAfternoon != null && suffix ? ` (${suffix})` : null}
      </span>
    );
  };

  const pendingColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.leaveAppliedBy, cellRenderer: appliedByRenderer },
      COL_DEFS.leaveName,
      {
        ...COL_DEFS.applicationDate,
        valueFormatter: (p) => formatDdMmmY(p.value),
      },
      {
        ...COL_DEFS.leaveFromDate,
        valueGetter: (p) => {
          const row = p.data;
          if (!row?.leaveFromDate) return "--";
          const to = row.leaveToDate ? formatDdMmmY(row.leaveToDate) : "";
          return `${formatDdMmmY(row.leaveFromDate)}${to ? ` - ${to}` : ""}`;
        },
      },
      { ...COL_DEFS.noOfLeaves, cellRenderer: daysRenderer },
      {
        ...COL_DEFS.leaveprocessStatusDisplayName,
        cellRenderer: (p: ICellRendererParams<AnyRow>) =>
          p.data ? <LeaveStatusCell row={p.data} processed={false} /> : null,
      },
      {
        ...COL_DEFS.reason,
        valueFormatter: (p) =>
          p.value == null || p.value === "" ? "--" : String(p.value),
      },
      {
        ...COL_DEFS.proxies,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="View proxies"
              disabled={proxiesLoading || saving}
              onClick={() => void viewProxies(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        },
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="flex flex-wrap gap-1 py-1">
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-lime-400 hover:bg-lime-500 text-black"
                disabled={saving}
                onClick={() => openAction(row, "APPROVE")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                disabled={saving}
                onClick={() => openAction(row, "REJECT")}
              >
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [proxiesLoading, saving, viewProxies],
  );

  const processedColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.leaveAppliedBy, cellRenderer: appliedByRenderer },
      COL_DEFS.leaveName,
      {
        ...COL_DEFS.applicationDate,
        valueFormatter: (p) => formatDdMmmY(p.value),
      },
      {
        ...COL_DEFS.leaveFromDate,
        valueGetter: (p) => {
          const row = p.data;
          if (!row?.leaveFromDate) return "--";
          const to = row.leaveToDate ? formatDdMmmY(row.leaveToDate) : "";
          return `${formatDdMmmY(row.leaveFromDate)}${to ? ` - ${to}` : ""}`;
        },
      },
      { ...COL_DEFS.noOfLeaves, cellRenderer: daysRenderer },
      {
        ...COL_DEFS.leaveprocessStatusDisplayName,
        cellRenderer: (p: ICellRendererParams<AnyRow>) =>
          p.data ? <LeaveStatusCell row={p.data} processed={true} /> : null,
      },
      {
        ...COL_DEFS.reason,
        valueFormatter: (p) =>
          p.value == null || p.value === "" ? "--" : String(p.value),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: () => <span>--</span>,
      },
    ],
    [],
  );

  const tableRows = showProcessed ? remainingLeaves : appliedLeaves;
  const tableTitle = showProcessed
    ? "Processed Leave Requests"
    : "Leave Approvals";

  return (
    <FilteredListPage
      title="Leave Approvals"
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
                void selectedLeaveYear(y);
              }}
              options={yearOptions}
              placeholder="Leave Year"
              isLoading={sessionLoading || !collegeId}
              searchable={false}
              clearable={false}
            />
          </GlobalFilterField>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="processed-leave-approvals-list"
              checked={showProcessed}
              onCheckedChange={(checked) => setShowProcessed(checked === true)}
            />
            <Label
              htmlFor="processed-leave-approvals-list"
              className="font-normal"
            >
              Processed Leave Requests List
            </Label>
          </div>
        </GlobalFilterBarRow>
      }
    >
      {tableRows.length > 0 ? (
        <DataTable
          title={tableTitle}
          rowData={tableRows}
          columnDefs={showProcessed ? processedColumnDefs : pendingColumnDefs}
          loading={loading || saving || proxiesLoading}
          pagination
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
          }}
        />
      ) : null}

      <ApproveLeaveModal
        open={actionRow != null && actionName != null}
        row={actionRow}
        includeMonthLeaves
        onClose={() => {
          setActionRow(null);
          setActionName(null);
        }}
        onSave={(payload) => {
          void handleActionSave({ reason: payload.reason });
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
    </FilteredListPage>
  );
}
