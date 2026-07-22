"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listReservedBooks, type LibraryRow } from "@/services";

function availabilityRenderer(p: ICellRendererParams<LibraryRow>) {
  const v = p.data?.availabilityStatus;
  const available = v === true || v === 1 || v === "1" || v === "true";
  return (
    <StatusBadge
      status={available}
      label={available ? "Available" : "Not Available"}
    />
  );
}

export default function ReservedBooksPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.library.reservedBooks(),
    queryFn: listReservedBooks,
  });

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        // Angular: row.bookcode
        headerName: "Accession No",
        minWidth: 120,
        valueGetter: (p) =>
          String(
            p.data?.bookcode ??
              p.data?.accessionno ??
              p.data?.accessionNo ??
              "",
          ),
      },
      {
        // Angular: row.title
        headerName: "Book Title",
        minWidth: 180,
        valueGetter: (p) => String(p.data?.title ?? p.data?.bookTitle ?? ""),
      },
      {
        field: "bookAuthor",
        headerName: "Book Author",
        minWidth: 140,
      },
      {
        field: "bookregTypeCode",
        headerName: "Book registration Type",
        minWidth: 160,
      },
      {
        field: "availabilityStatus",
        headerName: "Availability Status",
        minWidth: 140,
        flex: 0,
        cellRenderer: availabilityRenderer,
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Reserved Books List"
      filters={<div className="hidden" aria-hidden />}
      filtersCollapsible={false}
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Reserved Books List",
      }}
    />
  );
}
