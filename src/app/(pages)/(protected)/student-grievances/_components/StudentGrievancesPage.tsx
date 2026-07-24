"use client";

/**
 * Angular `student-grievances` → `NewGrievanceComponent`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createComplaint,
  fetchStudentDetailByUserId,
  listStudentGrievances,
  reopenComplaint,
  updateComplaint,
  updateComplaintWorkflow,
  uploadComplaintDoc,
} from "@/services";
import { AddGrievanceModal } from "./AddGrievanceModal";
import { CloseGrievanceModal } from "./CloseGrievanceModal";
import { ReOpenGrievanceModal } from "./ReOpenGrievanceModal";
import { GrievanceWorkflowModal } from "./GrievanceWorkflowModal";

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
  return format(d, "MMMM d, yyyy");
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  complaintId: {
    field: "complaintId",
    headerName: "Grievance No",
    minWidth: 120,
  } as ColDef<AnyRow>,
  committeeName: {
    headerName: "Committee",
    minWidth: 160,
    valueGetter: (p) => {
      const name = txt(p.data, ["committeeName"]);
      const code = txt(p.data, ["committeeCode"]);
      if (!name) return "—";
      return code ? `${name} (${code})` : name;
    },
  } as ColDef<AnyRow>,
  incident: {
    field: "incident",
    headerName: "Incident",
    minWidth: 180,
  } as ColDef<AnyRow>,
  complainDate: {
    headerName: "Grievance Date",
    minWidth: 140,
    valueGetter: (p) => formatDate(p.data?.complainDate),
  } as ColDef<AnyRow>,
  ackEmp: {
    headerName: "Acknowledge By",
    minWidth: 140,
    valueGetter: (p) => txt(p.data, ["ackEmpName"]) || "--",
  } as ColDef<AnyRow>,
  orgCode: {
    field: "orgCode",
    headerName: "Organization",
    minWidth: 110,
  } as ColDef<AnyRow>,
  document: {
    headerName: "Document",
    minWidth: 130,
  } as ColDef<AnyRow>,
  status: {
    headerName: "Status",
    minWidth: 100,
    valueGetter: (p) => txt(p.data, ["wfCode"]) || "—",
  } as ColDef<AnyRow>,
  statusUpdate: {
    headerName: "Status Update",
    minWidth: 150,
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 220,
    flex: 0,
    width: 220,
  } as ColDef<AnyRow>,
};

function documentRenderer(p: ICellRendererParams<AnyRow>) {
  const path = txt(p.data, ["complaintDocPath"]);
  if (!path) return <span>No Docs Uploaded</span>;
  return (
    <a
      href={path}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 underline"
    >
      Document
    </a>
  );
}

function makeStatusUpdateRenderer(
  onClose: (row: AnyRow) => void,
  onReopen: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const wfCode = txt(row, ["wfCode"]);
    if (wfCode === "RESOLVED") {
      return (
        <span className="space-x-1 text-sm">
          <button
            type="button"
            className="cursor-pointer font-medium text-blue-600"
            onClick={() => onClose(row)}
          >
            Close
          </button>
          <span>/</span>
          <button
            type="button"
            className="cursor-pointer font-medium text-blue-600"
            onClick={() => onReopen(row)}
          >
            Re-Open
          </button>
        </span>
      );
    }
    if (wfCode === "CLOSED") {
      const rating = Number(row.studentExperience ?? 0);
      return (
        <span className="text-amber-500 text-xs" title={`Rating: ${rating}`}>
          {"★".repeat(Math.max(0, Math.min(5, rating))) || "—"}
        </span>
      );
    }
    return <span>--</span>;
  };
}

function makeActionsRenderer(
  onDetails: (row: AnyRow) => void,
  onWorkflow: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const acknowledged = Boolean(row.isAcknowledged);
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => onDetails(row)}>
          Grievance Details
        </Button>
        {acknowledged ? (
          <>
            <span>|</span>
            <Button size="sm" variant="ghost" onClick={() => onWorkflow(row)}>
              Status
            </Button>
          </>
        ) : null}
      </div>
    );
  };
}

export function StudentGrievancesPage() {
  const router = useRouter();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [studentId, setStudentId] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [closeRow, setCloseRow] = useState<AnyRow | null>(null);
  const [reopenRow, setReopenRow] = useState<AnyRow | null>(null);
  const [workflowRows, setWorkflowRows] = useState<AnyRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function resolveStudent() {
      const fromSession = positiveId(user?.studentId);
      if (fromSession) {
        if (!cancelled) setStudentId(fromSession);
        return;
      }
      const userId = positiveId(user?.userId);
      if (!userId) return;
      const detail = await fetchStudentDetailByUserId(userId);
      const id = positiveId(detail?.studentId, detail?.studentDetailId);
      if (!cancelled) setStudentId(id);
    }
    void resolveStudent();
    return () => {
      cancelled = true;
    };
  }, [user?.studentId, user?.userId]);

  const listQuery = useQuery({
    queryKey: QK.studentGrievances.list(studentId),
    queryFn: () => listStudentGrievances(studentId),
    enabled: studentId > 0,
  });

  const rows = listQuery.data ?? [];

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: QK.studentGrievances.list(studentId),
    });
  }, [queryClient, studentId]);

  const handleAdd = useCallback(
    async (payload: AnyRow, file: File | null) => {
      setSaving(true);
      try {
        const detailPayload: AnyRow = {
          ...payload,
          complainDate: payload.complaintDate,
          complaintDetailList: [
            {
              message: payload.incidentDescription,
              messageDate: payload.complaintDate,
              isActive: true,
              studentId: payload.studentId,
              workflowStageId: payload.workflowStageId,
            },
          ],
        };
        delete detailPayload.complaintDocAvatar;
        delete detailPayload.complaintDate;

        const result = await createComplaint(detailPayload);
        if (file && result.complaintId != null) {
          await uploadComplaintDoc(result.complaintId, file);
        }
        toastSuccess(result.message || "Grievance created");
        setAddOpen(false);
        invalidate();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Failed to create grievance");
      } finally {
        setSaving(false);
      }
    },
    [invalidate],
  );

  const handleClose = useCallback(
    async (payload: AnyRow) => {
      setSaving(true);
      try {
        const message = await updateComplaint(payload);
        const wfList = Array.isArray(payload.complaintsWfList)
          ? (payload.complaintsWfList as AnyRow[])
          : [];
        if (wfList.length > 0) {
          const grvWorkflow = { ...wfList[wfList.length - 1] };
          grvWorkflow.toEmpId = grvWorkflow.fromEmpId;
          grvWorkflow.toGrvCommitteeId = grvWorkflow.fromGrvCommitteeId;
          grvWorkflow.isCurrentStatus = false;
          grvWorkflow.toDate = new Date().toISOString();
          grvWorkflow.toWfStageId = payload.workflowStageId;
          await updateComplaintWorkflow(grvWorkflow);
        }
        toastSuccess(message || "Grievance closed");
        setCloseRow(null);
        invalidate();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Failed to close grievance");
      } finally {
        setSaving(false);
      }
    },
    [invalidate],
  );

  const handleReopen = useCallback(
    async (payload: AnyRow) => {
      setSaving(true);
      try {
        const body = {
          ...payload,
          complaintDetailList: [
            {
              message: payload.incidentDescription,
              messageDate: payload.complaintDate ?? payload.complainDate ?? new Date().toISOString(),
              isActive: true,
              studentId: payload.studentId,
              workflowStageId: payload.workflowStageId,
            },
          ],
        };
        const message = await reopenComplaint(body);
        toastSuccess(message || "Grievance reopened");
        setReopenRow(null);
        invalidate();
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Failed to reopen grievance");
      } finally {
        setSaving(false);
      }
    },
    [invalidate],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.complaintId,
      COL_DEFS.committeeName,
      COL_DEFS.incident,
      COL_DEFS.complainDate,
      COL_DEFS.ackEmp,
      COL_DEFS.orgCode,
      { ...COL_DEFS.document, cellRenderer: documentRenderer },
      COL_DEFS.status,
      {
        ...COL_DEFS.statusUpdate,
        cellRenderer: makeStatusUpdateRenderer(setCloseRow, setReopenRow),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (row) => {
            const id = positiveId(row.complaintId);
            router.push(
              `/student-grievances/grievance-details?complaintId=${id}`,
            );
          },
          (row) => {
            const list = Array.isArray(row.complaintsWfList)
              ? (row.complaintsWfList as AnyRow[])
              : [];
            setWorkflowRows(list);
          },
        ),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Grievances"
      rowData={rows}
      columnDefs={columnDefs}
      loading={listQuery.isLoading || studentId === 0}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
      toolbarTrailing={
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Grievance
        </Button>
      }
    >
      <AddGrievanceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        studentId={studentId}
        organizationId={positiveId(user?.organizationId)}
        collegeId={positiveId(user?.collegeId)}
        isSubmitting={saving}
        onSubmit={handleAdd}
      />
      <CloseGrievanceModal
        open={closeRow !== null}
        row={closeRow}
        onClose={() => setCloseRow(null)}
        isSubmitting={saving}
        onSubmit={handleClose}
      />
      <ReOpenGrievanceModal
        open={reopenRow !== null}
        row={reopenRow}
        onClose={() => setReopenRow(null)}
        isSubmitting={saving}
        onSubmit={handleReopen}
      />
      <GrievanceWorkflowModal
        open={workflowRows !== null}
        rows={workflowRows ?? []}
        onClose={() => setWorkflowRows(null)}
      />
    </ListPage>
  );
}
