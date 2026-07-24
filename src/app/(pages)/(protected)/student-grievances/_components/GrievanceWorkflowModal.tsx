"use client";

import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";

type AnyRow = Record<string, unknown>;

type Props = {
  open: boolean;
  rows: AnyRow[];
  onClose: () => void;
};

function formatDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM yyyy");
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export function GrievanceWorkflowModal({ open, rows, onClose }: Props) {
  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "From Committee",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data, ["fromGrvCommitteeName", "fromCommitteeName"]) || "—",
      },
      {
        headerName: "From Emp",
        minWidth: 120,
        valueGetter: (p) => txt(p.data, ["fromEmpName"]) || "—",
      },
      {
        headerName: "From Date",
        minWidth: 110,
        valueGetter: (p) => formatDate(p.data?.fromDate),
      },
      {
        headerName: "From Status",
        minWidth: 110,
        valueGetter: (p) => txt(p.data, ["fromWfName"]) || "—",
      },
      {
        headerName: "To Committee",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data, ["toCommitteeName", "toGrvCommitteeName"]) || "—",
      },
      {
        headerName: "To Emp",
        minWidth: 120,
        valueGetter: (p) => txt(p.data, ["toEmpName"]) || "—",
      },
      {
        headerName: "To Date",
        minWidth: 110,
        valueGetter: (p) => formatDate(p.data?.toDate),
      },
      {
        headerName: "To Status",
        minWidth: 110,
        valueGetter: (p) => txt(p.data, ["toWfName"]) || "—",
      },
    ],
    [],
  );

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Work Flows"
      size="xl"
      submitLabel="Close"
      showCancelButton={false}
      onSubmit={onClose}
    >
      <div className="min-h-[240px]">
        <DataTable
          rowData={rows}
          columnDefs={columnDefs}
          pagination
          height="320px"
        />
      </div>
    </FormModal>
  );
}
