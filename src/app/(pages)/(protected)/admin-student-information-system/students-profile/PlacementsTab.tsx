"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import { loadStudentProfileTabData, pickProfileCell } from "@/services";
import { formatProfileDate } from "./profile-utils";

type AnyRow = Record<string, unknown>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function placementValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

function isRegistered(row: AnyRow): boolean {
  const raw = row.isRegistered ?? row.is_registered ?? row.registered;
  if (raw === true || raw === 1 || raw === "1") return true;
  if (typeof raw === "string" && raw.toLowerCase() === "true") return true;
  return false;
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return isRegistered(row) ? (
    <StatusBadge status="active" label="Registered" />
  ) : (
    <StatusBadge status="pending" label="Register" />
  );
}

const PLACEMENT_COLS: ColDef<AnyRow>[] = [
  { headerName: "No.", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    headerName: "Company",
    minWidth: 180,
    valueGetter: (p) =>
      placementValue(p.data ?? {}, [
        "companyName",
        "company_name",
        "organizationName",
        "employerName",
      ]),
  },
  {
    headerName: "Placement",
    minWidth: 180,
    valueGetter: (p) =>
      placementValue(p.data ?? {}, [
        "placementTitle",
        "placement_title",
        "plaecmentTitle",
        "jobRole",
        "designation",
      ]),
  },
  {
    headerName: "Date",
    minWidth: 120,
    valueGetter: (p) =>
      formatProfileDate(
        p.data?.registeredDate ??
          p.data?.registered_date ??
          p.data?.placementStartDate ??
          p.data?.placement_start_date,
      ),
  },
  {
    headerName: "Status",
    minWidth: 120,
    cellRenderer: statusRenderer,
  },
];

export function PlacementsTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadStudentProfileTabData("placements", student);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  const columnDefs = useMemo(() => PLACEMENT_COLS, []);

  return (
    <div className="space-y-3 rounded-md border border-[#e8e8e8] p-2">
      <p className="text-base font-medium text-[#0c51a4]">
        Student Placement Details
      </p>
      <DataTable
        title=""
        subtitle=""
        rowData={rows}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        toolbar={SEARCH_ONLY_TOOLBAR}
      />
    </div>
  );
}
