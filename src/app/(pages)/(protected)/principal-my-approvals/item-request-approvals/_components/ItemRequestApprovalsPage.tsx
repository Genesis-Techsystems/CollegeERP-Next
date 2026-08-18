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
  getInvInternalIndentApprovalsList,
  resolvePaymentNoteApprovalStageFilter,
  type InvInternalIndentApprovalRow,
} from "@/services";
import {
  ITEM_REQUEST_APPROVAL_STORAGE_KEY,
  type ItemRequestApprovalMode,
} from "./item-request-approval-storage";

function formatIndentDate(value?: unknown): string {
  if (value == null || value === "") return "";
  const raw = String(value);
  const d = parseISO(raw.includes("T") ? raw : `${raw}T00:00:00`);
  if (isValid(d)) return format(d, "dd MMM, yyyy");
  const fallback = new Date(raw);
  return isValid(fallback) ? format(fallback, "dd MMM, yyyy") : raw;
}

function indentDateFormatter(
  p: ValueFormatterParams<InvInternalIndentApprovalRow>,
) {
  return formatIndentDate(p.value);
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<InvInternalIndentApprovalRow>,
  indentNo: {
    field: "internal_ind_no",
    headerName: "Indent No",
    minWidth: 120,
  } as ColDef<InvInternalIndentApprovalRow>,
  indentDate: {
    field: "indent_date",
    headerName: "Indent Date",
    minWidth: 120,
    valueFormatter: indentDateFormatter,
  } as ColDef<InvInternalIndentApprovalRow>,
  requestedFor: {
    field: "requested_for",
    headerName: "Requested For",
    minWidth: 140,
  } as ColDef<InvInternalIndentApprovalRow>,
  raisedEmployee: {
    field: "raised_emp_name",
    headerName: "Employee Requested",
    minWidth: 150,
  } as ColDef<InvInternalIndentApprovalRow>,
  status: {
    field: "current_wf_status_name",
    headerName: "Status",
    minWidth: 130,
  } as ColDef<InvInternalIndentApprovalRow>,
  actions: {
    headerName: "Actions",
    minWidth: 130,
    width: 140,
    flex: 0,
  } as ColDef<InvInternalIndentApprovalRow>,
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

function readApprovalWfStage(row: InvInternalIndentApprovalRow): number {
  const raw =
    row.current_wf_stage ??
    (row as Record<string, unknown>).currentWfStage ??
    (row as Record<string, unknown>).wf_stage ??
    0;
  return Number(raw);
}

function sortByIndentIdDesc(
  rows: InvInternalIndentApprovalRow[],
): InvInternalIndentApprovalRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.pk_internal_ind_id ?? 0) - Number(a.pk_internal_ind_id ?? 0),
  );
}

function partitionByApprovalRole(
  indentList: InvInternalIndentApprovalRow[],
  userRoles: Array<{ roleName?: string }>,
  user: SessionUser | null,
): {
  requestIndents: InvInternalIndentApprovalRow[];
  approvedIndents: InvInternalIndentApprovalRow[];
  viewAllApproved: InvInternalIndentApprovalRow[];
} {
  const filter = resolvePaymentNoteApprovalStageFilter(userRoles, {
    isPrincipal: user?.isPrincipal,
    activeRoleName: user?.roleName ?? readStorage("roleName"),
  });
  if (!filter) {
    return {
      requestIndents: [],
      approvedIndents: [],
      viewAllApproved: [],
    };
  }

  const stage = (row: InvInternalIndentApprovalRow) => readApprovalWfStage(row);

  return {
    requestIndents: sortByIndentIdDesc(
      indentList.filter((row) => filter.requestStages.includes(stage(row))),
    ),
    approvedIndents: sortByIndentIdDesc(
      indentList.filter((row) => filter.approvedStages.includes(stage(row))),
    ),
    viewAllApproved: sortByIndentIdDesc(
      indentList.filter((row) => filter.viewAllStages.includes(stage(row))),
    ),
  };
}

function openApprovalModal(
  router: ReturnType<typeof useRouter>,
  row: InvInternalIndentApprovalRow,
  mode: ItemRequestApprovalMode,
  workflowStages: InvInternalIndentApprovalRow[],
) {
  const payload = { ...row, value: mode };
  try {
    sessionStorage.setItem(
      ITEM_REQUEST_APPROVAL_STORAGE_KEY,
      JSON.stringify({
        indent: payload,
        workflowStages,
      }),
    );
  } catch {
    // ignore storage failures
  }
  router.push(
    "/principal-my-approvals/item-request-approvals/item-request-approvals-modal",
  );
}

function makeViewDetailsRenderer(
  router: ReturnType<typeof useRouter>,
  workflowStages: InvInternalIndentApprovalRow[],
) {
  return (p: ICellRendererParams<InvInternalIndentApprovalRow>) => {
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
  workflowStages: InvInternalIndentApprovalRow[],
  showEdit: boolean,
) {
  return (p: ICellRendererParams<InvInternalIndentApprovalRow>) => {
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
 * Angular `ItemRequestApprovalsComponent`.
 */
export function ItemRequestApprovalsPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId, isResolving } = useLoginEmployeeId(user, sessionLoading);

  const [loading, setLoading] = useState(false);
  const [requestRows, setRequestRows] = useState<
    InvInternalIndentApprovalRow[]
  >([]);
  const [approvedRows, setApprovedRows] = useState<
    InvInternalIndentApprovalRow[]
  >([]);
  const [viewAllRows, setViewAllRows] = useState<
    InvInternalIndentApprovalRow[]
  >([]);
  const [workflowStages, setWorkflowStages] = useState<
    InvInternalIndentApprovalRow[]
  >([]);

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

  const loadData = useCallback(async () => {
    if (!employeeId) {
      setRequestRows([]);
      setApprovedRows([]);
      setViewAllRows([]);
      setWorkflowStages([]);
      return;
    }
    setLoading(true);
    try {
      const { indentList, workflowStages: stages } =
        await getInvInternalIndentApprovalsList({
          isAdmin: isAdminFlag,
          loginEmployeeId: employeeId,
        });
      const partitioned = partitionByApprovalRole(
        indentList,
        approvalUserRoles,
        user,
      );
      setRequestRows(partitioned.requestIndents);
      setApprovedRows(partitioned.approvedIndents);
      setViewAllRows(partitioned.viewAllApproved);
      setWorkflowStages(stages);
    } catch (e) {
      toastError(e, "Failed to load item request approvals");
      setRequestRows([]);
      setApprovedRows([]);
      setViewAllRows([]);
      setWorkflowStages([]);
    } finally {
      setLoading(false);
    }
  }, [approvalUserRoles, employeeId, isAdminFlag, user]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    void loadData();
  }, [loadData, sessionLoading, isResolving]);

  const pendingColumnDefs = useMemo<ColDef<InvInternalIndentApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.indentNo,
      COL_DEFS.indentDate,
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

  const updateColumnDefs = useMemo<ColDef<InvInternalIndentApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.indentNo,
      COL_DEFS.indentDate,
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

  const historyColumnDefs = useMemo<ColDef<InvInternalIndentApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.indentNo,
      COL_DEFS.indentDate,
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
  const rowId = (row: InvInternalIndentApprovalRow) =>
    String(row.pk_internal_ind_id ?? row.internal_ind_no ?? "");

  return (
    <>
      <ListPage<InvInternalIndentApprovalRow>
        title="Item Request Approvals"
        columnDefs={pendingColumnDefs}
        rowData={requestRows}
        loading={busy}
        pagination
        getRowId={(p) => rowId(p.data ?? {})}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
        }}
      />
      <ListPage<InvInternalIndentApprovalRow>
        title="Update Internal Indents Approvals"
        columnDefs={updateColumnDefs}
        rowData={approvedRows}
        loading={busy}
        pagination
        getRowId={(p) => rowId(p.data ?? {})}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
        }}
      />
      <ListPage<InvInternalIndentApprovalRow>
        title="Internal Indents Approvals"
        columnDefs={historyColumnDefs}
        rowData={viewAllRows}
        loading={busy}
        pagination
        getRowId={(p) => rowId(p.data ?? {})}
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
        }}
      />
    </>
  );
}
