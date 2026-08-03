"use client";

import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { LibraryGridPage } from "../_components/LibraryGridPage";
import { LIB_COL } from "../_lib/library-columns";
import { QK } from "@/lib/query-keys";
import { listBooksDue, type LibraryRow } from "@/services";

const PAGE_SIZE = 50;

function formatReturnDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Angular template: libMember + bookDetail.rollNumber / courseCode / courseYearCode / section */
function memberNameValue(row: LibraryRow): string {
  const detail = (row.bookDetail ?? {}) as LibraryRow;
  let name = String(row.libMember ?? "").trim();
  const roll = String(detail.rollNumber ?? row.rollNumber ?? "").trim();
  const course = String(detail.courseCode ?? row.courseCode ?? "").trim();
  const year = String(detail.courseYearCode ?? row.courseYearCode ?? "").trim();
  const section = String(detail.section ?? row.section ?? "").trim();

  if (roll) name += ` - ${roll}`;
  if (course) {
    name += ` (${course}${year ? ` / ${year}` : ""}${section ? ` / ${section}` : ""})`;
  }
  return name || "—";
}

export default function BookDueListPage() {
  const [page, setPage] = useState(0);

  const columns = useMemo<ColDef<LibraryRow>[]>(
    () => [
      LIB_COL.libraryCode,
      { ...LIB_COL.memberCode, headerName: "Member" },
      {
        headerName: "Member Name",
        minWidth: 220,
        flex: 1,
        valueGetter: (p) => memberNameValue(p.data ?? {}),
      },
      { ...LIB_COL.bookTitle, headerName: "Book" },
      { ...LIB_COL.accessionno, headerName: "Accession No" },
      {
        field: "issueTodate",
        headerName: "Return Date",
        minWidth: 130,
        valueFormatter: (p) => formatReturnDate(p.value),
      },
      LIB_COL.delyDays,
    ],
    [],
  );

  return (
    <LibraryGridPage
      title="Books Due List"
      showHeaderCard={false}
      tableTitle="Books Due List"
      subtitle=""
      queryKey={QK.library.bookDueList(page)}
      queryFn={() => listBooksDue(page, PAGE_SIZE)}
      columns={columns}
      searchPlaceholder="Search"
      pdfDocumentTitle="Books Due List"
      emptyMessage="No overdue books found."
      alwaysShowTable
      paginationPageSize={PAGE_SIZE}
      serverSide
      currentPage={page}
      onPageChange={(nextPage) => setPage(nextPage)}
    />
  );
}
