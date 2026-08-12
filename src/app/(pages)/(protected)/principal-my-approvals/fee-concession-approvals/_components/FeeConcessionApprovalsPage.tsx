"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  approveFeeConcessionApproval,
  listFeeConcessionApprovals,
  rejectFeeConcessionApproval,
} from "@/services";
import type { FeeConcessionApprovalRow } from "@/types/fees-collection";
import {
  ConcessionStatusModal,
  type ConcessionStatusResult,
} from "./ConcessionStatusModal";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<FeeConcessionApprovalRow>,
  student: {
    headerName: "Student",
    minWidth: 180,
    valueGetter: (p) => {
      const name = p.data?.studentFirstName ?? "";
      const roll = p.data?.studentRollNo;
      return roll ? `${name} (${roll})` : name;
    },
  } as ColDef<FeeConcessionApprovalRow>,
  discountFor: {
    headerName: "Discount For",
    minWidth: 220,
    valueGetter: (p) => {
      const d = p.data;
      if (!d) return "";
      return [d.collegeCode, d.studentCourseName, d.groupName, d.courseYearName]
        .filter((x) => x != null && String(x) !== "")
        .join(" / ");
    },
  } as ColDef<FeeConcessionApprovalRow>,
  category: {
    field: "categoryName",
    headerName: "Category",
    minWidth: 130,
  } as ColDef<FeeConcessionApprovalRow>,
  particular: {
    field: "particularsName",
    headerName: "Particular",
    minWidth: 140,
  } as ColDef<FeeConcessionApprovalRow>,
  amount: {
    field: "value",
    headerName: "Amount",
    minWidth: 100,
  } as ColDef<FeeConcessionApprovalRow>,
  requestedBy: {
    field: "requestedEmployeeFirstName",
    headerName: "Requested Faculty",
    minWidth: 150,
  } as ColDef<FeeConcessionApprovalRow>,
  status: {
    headerName: "Status",
    minWidth: 120,
    width: 130,
    flex: 0,
  } as ColDef<FeeConcessionApprovalRow>,
};

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function makeStatusRenderer(
  onPendingClick: (row: FeeConcessionApprovalRow) => void,
) {
  return (p: ICellRendererParams<FeeConcessionApprovalRow>) => {
    const row = p.data;
    if (!row || row.isAproved == null) return null;

    if (!row.isAproved && !row.isRejected) {
      return (
        <button
          type="button"
          className="cursor-pointer rounded px-2.5 py-0.5 text-xs font-medium bg-yellow-300 text-yellow-950 hover:bg-yellow-400"
          onClick={() => onPendingClick(row)}
        >
          Pending
        </button>
      );
    }
    if (row.isAproved && !row.isRejected) {
      return (
        <span className="inline-flex rounded px-2.5 py-0.5 text-xs font-medium bg-emerald-400 text-emerald-950">
          Approved
        </span>
      );
    }
    if (!row.isAproved && row.isRejected) {
      return (
        <span className="inline-flex rounded px-2.5 py-0.5 text-xs font-medium bg-red-500 text-white">
          Rejected
        </span>
      );
    }
    return null;
  };
}

/**
 * Angular `FeeConcessionApprovalsComponent`.
 */
export function FeeConcessionApprovalsPage() {
  const { user } = useSessionContext();
  const collegeId = Number(
    user?.collegeId ?? (Number(readStorage("collegeId")) || 0),
  );

  const [rows, setRows] = useState<FeeConcessionApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState<FeeConcessionApprovalRow | null>(null);

  const loadConcessions = useCallback(async () => {
    if (!collegeId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const list = await listFeeConcessionApprovals(collegeId);
      setRows(list);
    } catch (e) {
      toastError(e, "Failed to load fee concession approvals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    void loadConcessions();
  }, [loadConcessions]);

  const handleStatusSave = useCallback(
    async (result: ConcessionStatusResult) => {
      if (!editRow) return;
      setSaving(true);
      try {
        if (result.concession === "APPROVE") {
          const payload: FeeConcessionApprovalRow = {
            ...editRow,
            isAproved: true,
            feeStdDataId: result.feeStdDataId,
          };
          await approveFeeConcessionApproval(payload);
        } else {
          const payload: FeeConcessionApprovalRow = {
            ...editRow,
            isRejected: true,
          };
          await rejectFeeConcessionApproval(payload);
        }
        toastSuccess("Saved successfully");
        setEditRow(null);
        await loadConcessions();
      } catch (e) {
        toastError(e, "Failed to update concession status");
      } finally {
        setSaving(false);
      }
    },
    [editRow, loadConcessions],
  );

  const columnDefs = useMemo<ColDef<FeeConcessionApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.discountFor,
      COL_DEFS.category,
      COL_DEFS.particular,
      COL_DEFS.amount,
      COL_DEFS.requestedBy,
      {
        ...COL_DEFS.status,
        cellRenderer: makeStatusRenderer((row) => setEditRow(row)),
      },
    ],
    [],
  );

  return (
    <ListPage<FeeConcessionApprovalRow>
      title="Fee Concession Approvals"
      columnDefs={columnDefs}
      rowData={rows}
      loading={loading || saving}
      getRowId={(p) =>
        String(p.data?.feeStdDiscountId ?? `${p.data?.studentId}-${p.data?.value}`)
      }
    >
      <ConcessionStatusModal
        open={editRow != null}
        row={editRow}
        saving={saving}
        onClose={() => {
          if (!saving) setEditRow(null);
        }}
        onSave={(result) => {
          void handleStatusSave(result);
        }}
      />
    </ListPage>
  );
}
