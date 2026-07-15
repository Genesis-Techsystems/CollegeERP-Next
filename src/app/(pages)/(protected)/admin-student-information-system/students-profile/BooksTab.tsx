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

function bookDetailValue(row: AnyRow, keys: string[]): string {
  const nested = row.bookDetail ?? row.book_detail ?? row.book;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const detail = nested as AnyRow;
    for (const key of keys) {
      const value = detail[key];
      if (value != null && String(value).trim() !== "")
        return String(value).trim();
    }
  }
  const flat = pickProfileCell(row, keys);
  return flat && flat !== "—" ? flat : "—";
}

function bookValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys);
  return value && value !== "—" ? value : "—";
}

function formatIssueDate(value: unknown): string {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return formatProfileDate(value);
}

function isReturned(row: AnyRow): boolean {
  const raw = row.isreturned ?? row.isReturned ?? row.is_returned;
  return (
    raw === true ||
    raw === 1 ||
    raw === "1" ||
    String(raw).toLowerCase() === "true"
  );
}

function fineTypeCode(row: AnyRow): string {
  return String(row.fineTypeCode ?? row.fine_type_code ?? "").toUpperCase();
}

function returnStatusRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  if (fineTypeCode(row) === "BOOKLOST") {
    return (
      <span className="rounded bg-destructive px-1.5 py-0.5 text-[11px] font-medium text-white">
        Book Lost
      </span>
    );
  }
  if (isReturned(row)) {
    return <StatusBadge status="active" label="Returned" />;
  }
  return <StatusBadge status="inactive" label="Not Returned" />;
}

const BOOK_COLS: ColDef<AnyRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    headerName: "Book Title",
    minWidth: 180,
    valueGetter: (p) =>
      bookDetailValue(p.data ?? {}, [
        "bookTitle",
        "book_title",
        "title",
        "bookName",
      ]),
  },
  {
    headerName: "Accession No",
    minWidth: 130,
    valueGetter: (p) =>
      bookDetailValue(p.data ?? {}, [
        "accessionno",
        "accessionNo",
        "accession_no",
        "accessionNumber",
      ]),
  },
  {
    headerName: "Issue Date",
    minWidth: 120,
    valueGetter: (p) =>
      formatIssueDate(
        p.data?.issueFromdate ??
          p.data?.issueFromDate ??
          p.data?.issue_from_date ??
          p.data?.issueDate,
      ),
  },
  {
    headerName: "Return Date",
    minWidth: 120,
    valueGetter: (p) =>
      formatIssueDate(
        p.data?.issueTodate ??
          p.data?.issueToDate ??
          p.data?.issue_to_date ??
          p.data?.returnDate,
      ),
  },
  {
    headerName: "Issued On",
    minWidth: 120,
    valueGetter: (p) =>
      bookValue(p.data ?? {}, [
        "bookIssuedOnCode",
        "book_issued_on_code",
        "issuedOn",
        "issued_on",
      ]),
  },
  {
    headerName: "Return Status",
    minWidth: 130,
    cellRenderer: returnStatusRenderer,
  },
];

export function BooksTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await loadStudentProfileTabData("books", student);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student]);

  const columnDefs = useMemo(() => BOOK_COLS, []);

  return (
    <div className="space-y-3 rounded-md border border-[#e8e8e8] p-2">
      <p className="text-base font-medium text-[#0c51a4]">
        Student Book Details
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
