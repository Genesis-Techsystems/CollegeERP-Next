"use client";

/**
 * Angular `staff-grievance/grievance-list` → `GrievanceListComponent`.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { ListPage } from "@/components/layout";
import { ConfirmDialog } from "@/common/components/feedback";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  acknowledgeStaffGrievance,
  listAcknowledgedStaffGrievances,
  listCommitteeMembersByEmployee,
  listComplaintWorkflowStagesByCollege,
  listPendingStaffGrievances,
} from "@/services";
import { GrievanceWorkflowModal } from "@/app/(pages)/(protected)/student-grievances/_components/GrievanceWorkflowModal";

type AnyRow = Record<string, unknown>;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function formatDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

function documentRenderer(p: ICellRendererParams<AnyRow>) {
  const path = txt(p.data, ["complaintDocPath"]);
  if (!path)
    return (
      <span className="text-xs text-muted-foreground">No Docs Uploaded</span>
    );
  return (
    <a
      href={path}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-blue-600 hover:underline"
    >
      Document
    </a>
  );
}

const BASE_COLS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  complaintId: {
    field: "complaintId",
    headerName: "Grievance No",
    minWidth: 110,
  } as ColDef<AnyRow>,
  committeeName: {
    headerName: "Committee",
    minWidth: 150,
    valueGetter: (p) => {
      const name = txt(p.data, ["committeeName"]);
      const code = txt(p.data, ["committeeCode"]);
      if (!name) return "—";
      return code ? `${name} (${code})` : name;
    },
  } as ColDef<AnyRow>,
  stdName: {
    field: "stdName",
    headerName: "Student",
    minWidth: 140,
  } as ColDef<AnyRow>,
  complaintDesc: {
    field: "complaintDesc",
    headerName: "Grievance Type",
    minWidth: 140,
  } as ColDef<AnyRow>,
  incident: {
    field: "incident",
    headerName: "Incident",
    minWidth: 140,
  } as ColDef<AnyRow>,
  complainDate: {
    headerName: "Grievance Date",
    minWidth: 120,
    valueGetter: (p) => formatDate(p.data?.complainDate),
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
    valueGetter: (p) => txt(p.data, ["wfCode"]) || "—",
  } as ColDef<AnyRow>,
  document: {
    headerName: "Document",
    minWidth: 120,
    cellRenderer: documentRenderer,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

export function StaffGrievanceListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: sessionLoading } = useSession();
  const { employeeId, isResolving } = useStaffLoginContext(
    user,
    sessionLoading,
  );
  const collegeId = positiveId(user?.collegeId);

  const ready = employeeId > 0 && collegeId > 0 && !isResolving;

  const [ackRow, setAckRow] = useState<AnyRow | null>(null);
  const [ackSaving, setAckSaving] = useState(false);
  const [workflowRows, setWorkflowRows] = useState<AnyRow[]>([]);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const committeeQuery = useQuery({
    queryKey: QK.staffGrievances.committee(employeeId),
    queryFn: () => listCommitteeMembersByEmployee(employeeId),
    enabled: ready,
  });

  const grvCommitteeId = positiveId(
    committeeQuery.data?.[0]?.grvCommitteeId,
    (committeeQuery.data?.[0]?.grievanceCommittee as AnyRow | undefined)
      ?.grvCommitteeId,
  );

  const workflowStagesQuery = useQuery({
    queryKey: [...QK.staffGrievances.all, "wfStages", collegeId],
    queryFn: () => listComplaintWorkflowStagesByCollege(collegeId),
    enabled: ready,
  });

  const pendingQuery = useQuery({
    queryKey: QK.staffGrievances.pending(grvCommitteeId, collegeId),
    queryFn: () => listPendingStaffGrievances(grvCommitteeId, collegeId),
    enabled: ready && grvCommitteeId > 0,
  });

  const acknowledgedQuery = useQuery({
    queryKey: QK.staffGrievances.acknowledged(grvCommitteeId, employeeId),
    queryFn: () => listAcknowledgedStaffGrievances(grvCommitteeId, employeeId),
    enabled: ready && grvCommitteeId > 0,
  });

  const invalidateLists = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: QK.staffGrievances.pending(grvCommitteeId, collegeId),
    });
    void queryClient.invalidateQueries({
      queryKey: QK.staffGrievances.acknowledged(grvCommitteeId, employeeId),
    });
  }, [queryClient, grvCommitteeId, collegeId, employeeId]);

  const handleAcknowledge = useCallback(async () => {
    if (!ackRow) return;
    const acceptedStage = (workflowStagesQuery.data ?? []).find(
      (s) => txt(s, ["wfCode"]) === "ACCEPTED",
    );
    const acceptedStageId = positiveId(acceptedStage?.workflowStageId);
    if (!acceptedStageId) {
      toastError("Accepted workflow stage not found.");
      return;
    }

    setAckSaving(true);
    try {
      await acknowledgeStaffGrievance({
        grievance: ackRow,
        employeeId,
        acceptedStageId,
      });
      toastSuccess("Grievance acknowledged successfully.");
      setAckRow(null);
      invalidateLists();
    } catch (err) {
      toastError(err, "Failed to acknowledge grievance");
    } finally {
      setAckSaving(false);
    }
  }, [ackRow, employeeId, invalidateLists, workflowStagesQuery.data]);

  const pendingColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      BASE_COLS.siNo,
      BASE_COLS.complaintId,
      BASE_COLS.committeeName,
      BASE_COLS.stdName,
      BASE_COLS.complaintDesc,
      BASE_COLS.incident,
      BASE_COLS.complainDate,
      BASE_COLS.status,
      BASE_COLS.document,
      {
        headerName: "Actions",
        width: 130,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setAckRow(p.data ?? null)}
          >
            Acknowledge
          </Button>
        ),
      },
    ],
    [],
  );

  const acknowledgedColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      BASE_COLS.siNo,
      BASE_COLS.complaintId,
      BASE_COLS.committeeName,
      BASE_COLS.stdName,
      BASE_COLS.complaintDesc,
      BASE_COLS.incident,
      BASE_COLS.complainDate,
      BASE_COLS.status,
      BASE_COLS.document,
      {
        headerName: "Actions",
        minWidth: 220,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          const complaintId = positiveId(row.complaintId);
          return (
            <div className="flex items-center gap-1 text-xs">
              <Button
                size="sm"
                variant="link"
                className="h-7 px-1 text-xs"
                onClick={() =>
                  router.push(
                    `/staff-grievances-&-suggestions/grevieviance-list/grievance-details?complaintId=${complaintId}`,
                  )
                }
              >
                Grievance Details
              </Button>
              <span className="text-muted-foreground">|</span>
              <Button
                size="sm"
                variant="link"
                className="h-7 px-1 text-xs"
                onClick={() => {
                  const rows = Array.isArray(row.complaintsWfList)
                    ? (row.complaintsWfList as AnyRow[])
                    : [];
                  setWorkflowRows(rows);
                  setWorkflowOpen(true);
                }}
              >
                Status
              </Button>
            </div>
          );
        },
      },
    ],
    [router],
  );

  const loading =
    !ready ||
    committeeQuery.isLoading ||
    pendingQuery.isLoading ||
    acknowledgedQuery.isLoading;

  return (
    <div className="space-y-6">
      <ListPage
        title="Grievances List"
        loading={loading}
        rowData={pendingQuery.data ?? []}
        columnDefs={pendingColumnDefs}
        pagination
        toolbar={{ search: true, searchPlaceholder: "Search" }}
      />

      <ListPage
        title="My Acknowledged List"
        loading={loading}
        rowData={acknowledgedQuery.data ?? []}
        columnDefs={acknowledgedColumnDefs}
        pagination
        toolbar={{ search: true, searchPlaceholder: "Search" }}
      />

      <ConfirmDialog
        open={ackRow !== null}
        title="Acknowledge Grievance"
        description="Are you sure you want to acknowledge this grievance?"
        confirmLabel="Acknowledge"
        confirmVariant="default"
        onConfirm={handleAcknowledge}
        onCancel={() => setAckRow(null)}
        isLoading={ackSaving}
      />

      <GrievanceWorkflowModal
        open={workflowOpen}
        rows={workflowRows}
        onClose={() => setWorkflowOpen(false)}
      />
    </div>
  );
}
