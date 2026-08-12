"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { Eye, Pencil } from "lucide-react";
import type {
  ColDef,
  ICellRendererParams,
  ValueFormatterParams,
} from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import type { SessionUser } from "@/types/user";
import {
  getPaymentNoteApprovalsList,
  resolvePaymentNoteApprovalStageFilter,
} from "@/services";
import type { PaymentNoteApprovalRow } from "@/types/e-office";
import {
  PAYMENT_NOTE_APPROVAL_STORAGE_KEY,
  type PaymentNoteApprovalMode,
} from "./payment-note-approval-storage";

function formatPoDate(value?: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value);
  const d = parseISO(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (isValid(d)) return format(d, "dd MMM, yyyy");
  const fallback = new Date(raw);
  return isValid(fallback) ? format(fallback, "dd MMM, yyyy") : raw;
}

function poDateFormatter(p: ValueFormatterParams<PaymentNoteApprovalRow>) {
  return formatPoDate(p.value);
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PaymentNoteApprovalRow>,
  pono: {
    field: "pono",
    headerName: "P.O No",
    minWidth: 120,
  } as ColDef<PaymentNoteApprovalRow>,
  poDate: {
    field: "po_date",
    headerName: "P.O Date",
    minWidth: 120,
    valueFormatter: poDateFormatter,
  } as ColDef<PaymentNoteApprovalRow>,
  requestedFor: {
    field: "indent_requested_for",
    headerName: "Requested For",
    minWidth: 140,
  } as ColDef<PaymentNoteApprovalRow>,
  raisedEmployee: {
    field: "raised_emp_name",
    headerName: "Employee Requested",
    minWidth: 150,
  } as ColDef<PaymentNoteApprovalRow>,
  status: {
    field: "current_wf_status_name",
    headerName: "Status",
    minWidth: 130,
  } as ColDef<PaymentNoteApprovalRow>,
  actions: {
    headerName: "Actions",
    minWidth: 130,
    width: 140,
    flex: 0,
  } as ColDef<PaymentNoteApprovalRow>,
};

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function readUserRoles(): Array<{ roleName?: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("userDetails");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as {
      userRoles?: Array<{ roleName?: string }>;
    };
    return Array.isArray(parsed.userRoles) ? parsed.userRoles : [];
  } catch {
    return [];
  }
}

/** Angular loginUser.userRoles loop — active session role must be last (last match wins). */
function resolveApprovalUserRoles(
  user: SessionUser | null,
): Array<{ roleName?: string }> {
  const roles: Array<{ roleName?: string }> = readUserRoles()
    .map((r) => String(r.roleName ?? "").trim())
    .filter(Boolean)
    .map((roleName) => ({ roleName }));

  const sessionRole = String(
    user?.roleName ?? readStorage("roleName") ?? "",
  ).trim();

  if (sessionRole) {
    const upper = sessionRole.toUpperCase();
    const existingIdx = roles.findIndex(
      (r) => String(r.roleName ?? "").toUpperCase() === upper,
    );
    if (existingIdx >= 0) roles.splice(existingIdx, 1);
    roles.push({ roleName: sessionRole });
  } else if (user?.isPrincipal) {
    roles.push({ roleName: "PRINCIPAL" });
  }

  return roles;
}

function readApprovalWfStage(row: PaymentNoteApprovalRow): number {
  const raw =
    row.current_wf_stage ??
    (row as Record<string, unknown>).currentWfStage ??
    (row as Record<string, unknown>).wf_stage ??
    0;
  return Number(raw);
}

function sortByPoIdDesc(rows: PaymentNoteApprovalRow[]): PaymentNoteApprovalRow[] {
  return [...rows].sort(
    (a, b) => Number(b.pk_po_id ?? 0) - Number(a.pk_po_id ?? 0),
  );
}

function partitionByApprovalRole(
  poList: PaymentNoteApprovalRow[],
  userRoles: Array<{ roleName?: string }>,
  user: SessionUser | null,
): {
  requestList: PaymentNoteApprovalRow[];
  approvedList: PaymentNoteApprovalRow[];
  viewAllList: PaymentNoteApprovalRow[];
} {
  const filter = resolvePaymentNoteApprovalStageFilter(userRoles, {
    isPrincipal: user?.isPrincipal,
    activeRoleName: user?.roleName ?? readStorage("roleName"),
  });
  if (!filter) {
    return { requestList: [], approvedList: [], viewAllList: [] };
  }

  const stage = (row: PaymentNoteApprovalRow) => readApprovalWfStage(row);

  return {
    requestList: sortByPoIdDesc(
      poList.filter((row) => filter.requestStages.includes(stage(row))),
    ),
    approvedList: sortByPoIdDesc(
      poList.filter((row) => filter.approvedStages.includes(stage(row))),
    ),
    viewAllList: sortByPoIdDesc(
      poList.filter((row) => filter.viewAllStages.includes(stage(row))),
    ),
  };
}

function openApprovalModal(
  router: ReturnType<typeof useRouter>,
  row: PaymentNoteApprovalRow,
  mode: PaymentNoteApprovalMode,
  workflowStages: PaymentNoteApprovalRow[],
) {
  const payload = { ...row, value: mode };
  try {
    sessionStorage.setItem(
      PAYMENT_NOTE_APPROVAL_STORAGE_KEY,
      JSON.stringify({
        po: payload,
        workflowStages,
      }),
    );
  } catch {
    // ignore storage failures
  }
  router.push(
    "/principal-my-approvals/payment-note-approvals/payment-note-approvals-modal",
  );
}

function makeViewDetailsRenderer(
  router: ReturnType<typeof useRouter>,
  workflowStages: PaymentNoteApprovalRow[],
) {
  return (p: ICellRendererParams<PaymentNoteApprovalRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        type="button"
        size="sm"
        className="app-table-view-details-btn action-btn add-btn"
        onClick={() =>
          openApprovalModal(router, row, "approvalDetails", workflowStages)
        }
      >
        View Details
      </Button>
    );
  };
}

function makeIconActionsRenderer(
  router: ReturnType<typeof useRouter>,
  workflowStages: PaymentNoteApprovalRow[],
  showEdit: boolean,
) {
  return (p: ICellRendererParams<PaymentNoteApprovalRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-[#0e62c7]"
          title="View Details"
          onClick={() =>
            openApprovalModal(router, row, "viewDetails", workflowStages)
          }
        >
          <Eye className="h-4 w-4" />
        </Button>
        {showEdit ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[#0e62c7]"
            title="Edit"
            onClick={() =>
              openApprovalModal(router, row, "updateDetails", workflowStages)
            }
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    );
  };
}

/**
 * Angular `PaymentNoteApprovalsComponent`.
 */
export function PaymentNoteApprovalsPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const [loading, setLoading] = useState(false);
  const [requestList, setRequestList] = useState<PaymentNoteApprovalRow[]>([]);
  const [approvedList, setApprovedList] = useState<PaymentNoteApprovalRow[]>([]);
  const [viewAllList, setViewAllList] = useState<PaymentNoteApprovalRow[]>([]);
  const [workflowStages, setWorkflowStages] = useState<PaymentNoteApprovalRow[]>(
    [],
  );

  const approvalUserRoles = useMemo(
    () => resolveApprovalUserRoles(user),
    [user],
  );

  const isAdminFlag = useMemo(() => {
    const roleName = String(
      user?.roleName ?? readStorage("roleName") ?? "",
    ).toUpperCase();
    if (roleName === "ADMIN" || user?.isAdmin) return 1;
    return 0;
  }, [user]);

  const loadRows = useCallback(async () => {
    if (!employeeId) {
      setRequestList([]);
      setApprovedList([]);
      setViewAllList([]);
      setWorkflowStages([]);
      return;
    }
    setLoading(true);
    try {
      const { poList, workflowStages: stages } =
        await getPaymentNoteApprovalsList({
          isAdmin: isAdminFlag,
          loginEmployeeId: employeeId,
        });
      const partitioned = partitionByApprovalRole(
        poList,
        approvalUserRoles,
        user,
      );
      setRequestList(partitioned.requestList);
      setApprovedList(partitioned.approvedList);
      setViewAllList(partitioned.viewAllList);
      setWorkflowStages(stages);
    } catch (e) {
      toastError(e, "Failed to load payment note approvals");
      setRequestList([]);
      setApprovedList([]);
      setViewAllList([]);
      setWorkflowStages([]);
    } finally {
      setLoading(false);
    }
  }, [approvalUserRoles, employeeId, isAdminFlag, user]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    void loadRows();
  }, [loadRows, sessionLoading, isResolving]);

  const pendingColumnDefs = useMemo<ColDef<PaymentNoteApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.requestedFor,
      COL_DEFS.raisedEmployee,
      COL_DEFS.status,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeViewDetailsRenderer(router, workflowStages),
      },
    ],
    [router, workflowStages],
  );

  const updateColumnDefs = useMemo<ColDef<PaymentNoteApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.requestedFor,
      COL_DEFS.raisedEmployee,
      COL_DEFS.status,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeIconActionsRenderer(router, workflowStages, true),
      },
    ],
    [router, workflowStages],
  );

  const historyColumnDefs = useMemo<ColDef<PaymentNoteApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.pono,
      COL_DEFS.poDate,
      COL_DEFS.requestedFor,
      COL_DEFS.raisedEmployee,
      COL_DEFS.status,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeIconActionsRenderer(router, workflowStages, false),
      },
    ],
    [router, workflowStages],
  );

  const busy = loading || sessionLoading || isResolving;
  const rowId = (row: PaymentNoteApprovalRow) =>
    String(row.pk_po_id ?? row.pono ?? "");

  return (
    <>
      <ListPage<PaymentNoteApprovalRow>
        title="Purchase Order Requests"
        columnDefs={pendingColumnDefs}
        rowData={requestList}
        loading={busy}
        pagination
        getRowId={(p) => rowId(p.data ?? {})}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
        }}
      />
      <ListPage<PaymentNoteApprovalRow>
        title="Update Purchase Order Approvals"
        columnDefs={updateColumnDefs}
        rowData={approvedList}
        loading={busy}
        pagination
        getRowId={(p) => rowId(p.data ?? {})}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
        }}
      />
      <ListPage<PaymentNoteApprovalRow>
        title="Purchase Order Approvals"
        columnDefs={historyColumnDefs}
        rowData={viewAllList}
        loading={busy}
        pagination
        getRowId={(p) => rowId(p.data ?? {})}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
        }}
      />
    </>
  );
}
