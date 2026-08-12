"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FormModal } from "@/common/components/feedback";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { resolveStudentStatusGeneralDetailId } from "@/services";

type AnyRow = Record<string, any>;

export type DetainConfirmMode = "detain" | "inCollege";

interface DetainConfirmModalProps {
  open: boolean;
  mode: DetainConfirmMode;
  students: AnyRow[];
  saving?: boolean;
  onClose: () => void;
  onConfirm: (rows: AnyRow[]) => void;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function coursePath(row: AnyRow): string {
  return [
    pickText(row, ["collegeCode", "college_code"]),
    pickText(row, ["courseCode", "course_code"]),
    pickText(row, ["groupCode", "group_code"]),
    pickText(row, ["courseYearName", "course_year_name"]),
    pickText(row, ["section", "sectionName", "section_name"]),
  ]
    .filter(Boolean)
    .join("/");
}

const COL_DEFS = {
  siNo: {
    headerName: "SI No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  student: {
    headerName: "Student",
    minWidth: 180,
    valueGetter: (p) => {
      const name = pickText(p.data, ["firstName", "studentName"]);
      const roll = pickText(p.data, ["rollNumber", "hallticketNumber"]);
      return roll ? `${name} (${roll})` : name;
    },
  } as ColDef<AnyRow>,
  course: {
    headerName: "Course",
    minWidth: 220,
    valueGetter: (p) => (p.data ? coursePath(p.data) : ""),
  } as ColDef<AnyRow>,
  reason: {
    headerName: "Reason",
    minWidth: 140,
    valueGetter: (p) => pickText(p.data, ["reason"]) || "-",
  } as ColDef<AnyRow>,
};

/**
 * Angular `DetainRequestApprovalsModal` / `IncollegeRequestListModal` —
 * confirm list + resolve STUDENTSTATUS id (DTND / INCOLLEGE).
 */
export function DetainConfirmModal({
  open,
  mode,
  students,
  saving = false,
  onClose,
  onConfirm,
}: Readonly<DetainConfirmModalProps>) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [statusId, setStatusId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const statusCode = mode === "detain" ? "DTND" : "INCOLLEGE";
  const title =
    mode === "detain"
      ? "Student Detain Request Approval List"
      : "Student Detain To InCollege Request Approval List";
  const confirmLabel = mode === "detain" ? "Detain" : "In College";

  useEffect(() => {
    if (!open) return;
    setFilter("");
    setRows(students);
    setStatusId(0);

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const id = await resolveStudentStatusGeneralDetailId(statusCode);
        if (cancelled) return;
        setStatusId(id);
        if (!id) {
          toastError(new Error(`Student status ${statusCode} not found`));
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load student status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, students, statusCode]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = pickText(row, ["firstName", "studentName"]).toLowerCase();
      const roll = pickText(row, [
        "rollNumber",
        "hallticketNumber",
      ]).toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [filter, rows]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.course,
      COL_DEFS.reason,
    ],
    [],
  );

  function handleConfirm() {
    if (!statusId || rows.length === 0 || loading || saving) return;
    onConfirm(
      rows.map((row) => ({
        ...row,
        studentStatusId: statusId,
      })),
    );
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      isSubmitting={saving || loading}
      submitLabel={confirmLabel}
      cancelLabel="Close"
      onSubmit={(e) => {
        e.preventDefault();
        handleConfirm();
      }}
    >
      <div className="space-y-3">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Student Name / Roll Number."
          className="w-full max-w-md rounded border border-input bg-background px-2 py-1.5 text-sm"
        />
        <DataTable
          title=""
          subtitle=""
          rowData={filtered}
          columnDefs={columnDefs}
          loading={loading}
          pagination={false}
          bordered
          toolbar={{
            search: false,
            columnPicker: false,
            exportPdf: false,
            exportExcel: false,
            columnFilters: false,
          }}
        />
      </div>
    </FormModal>
  );
}
