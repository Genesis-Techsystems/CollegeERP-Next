"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { Select, type SelectOption } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { FilteredListPage } from "@/components/layout";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getLibraryBookDetailById,
  searchBookDetailsForBookSearch,
  type LibraryRow,
} from "@/services";

function bookOptionLabel(b: LibraryRow): string {
  const acc = String(b.accessionno ?? "").trim();
  const title = String(b.bookTitle ?? b.title ?? "").trim();
  if (acc && title) return `(${acc}) ${title}`;
  if (acc) return `(${acc})`;
  return title || "Book";
}

function bookOptionValue(b: LibraryRow): string {
  return String(b.bookDetailsId ?? b.bookDetailId ?? "");
}

function formatAuthors(row: LibraryRow | null | undefined): string {
  if (!row) return "";
  const authors = row.authors;
  if (Array.isArray(authors)) {
    return authors
      .map((a) => String(a).trim())
      .filter(Boolean)
      .join(", ");
  }
  return String(authors ?? row.bookAuthor ?? "").trim();
}

function barcodeRenderer(p: ICellRendererParams<LibraryRow>) {
  const raw = p.data?.bookBarcode ?? p.data?.barcode;
  if (raw == null || raw === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  const str = String(raw);
  const src = str.startsWith("data:") ? str : `data:image/jpg;base64,${str}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- base64 barcode from API
    <img
      src={src}
      alt="Book barcode"
      className="h-[30px] max-w-[192px] object-contain align-middle"
    />
  );
}

function availabilityRenderer(p: ICellRendererParams<LibraryRow>) {
  const v = p.data?.availabilityStatus;
  const available = v === 1 || v === true || v === "1";
  return (
    <StatusBadge
      status={available}
      label={available ? "Available" : "Not Available"}
    />
  );
}

export default function BooksSearchPage() {
  const [bookRows, setBookRows] = useState<LibraryRow[]>([]);
  const [bookOptions, setBookOptions] = useState<SelectOption[]>([]);
  const [selectedBookKey, setSelectedBookKey] = useState<string | null>(null);
  const [selectedBookDetailsId, setSelectedBookDetailsId] = useState<
    number | null
  >(null);
  const [selectedAuthors, setSelectedAuthors] = useState("");
  const [bookSearchLoading, setBookSearchLoading] = useState(false);

  const { data: detail = null, isLoading: loadingDetails } = useQuery({
    queryKey: QK.library.booksSearch(String(selectedBookDetailsId ?? "")),
    queryFn: () => getLibraryBookDetailById(selectedBookDetailsId!),
    enabled: selectedBookDetailsId != null && selectedBookDetailsId > 0,
  });

  const tableRows = useMemo<LibraryRow[]>(() => {
    if (!detail) return [];
    return [
      {
        ...detail,
        authors: selectedAuthors || formatAuthors(detail),
        bookAuthor: selectedAuthors || formatAuthors(detail),
      },
    ];
  }, [detail, selectedAuthors]);

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "accessionno",
        headerName: "Accession No",
        minWidth: 120,
      },
      {
        field: "bookTitle",
        headerName: "Book",
        minWidth: 180,
      },
      {
        headerName: "Author",
        minWidth: 140,
        valueGetter: (p) => formatAuthors(p.data),
      },
      {
        field: "libraryCode",
        headerName: "Library",
        minWidth: 100,
      },
      {
        field: "shelveName",
        headerName: "Shelve",
        minWidth: 100,
      },
      {
        field: "bookPosition",
        headerName: "Book Position",
        minWidth: 120,
      },
      {
        headerName: "Book BarCode",
        minWidth: 210,
        flex: 0,
        cellRenderer: barcodeRenderer,
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

  const onBookSearch = useCallback(async (term: string) => {
    const q = term.trim();
    // Angular: length > 2
    if (q.length <= 2) {
      setBookRows([]);
      setBookOptions([]);
      return;
    }
    setBookSearchLoading(true);
    try {
      const rows = await searchBookDetailsForBookSearch(q);
      setBookRows(rows);
      setBookOptions(
        rows.map((b) => ({
          value: bookOptionValue(b),
          label: bookOptionLabel(b),
        })),
      );
    } catch (e) {
      toastError(e, "Book search failed");
      setBookRows([]);
      setBookOptions([]);
    } finally {
      setBookSearchLoading(false);
    }
  }, []);

  function handleBookChange(value: string | null) {
    setSelectedBookKey(value);
    if (!value) {
      setSelectedBookDetailsId(null);
      setSelectedAuthors("");
      return;
    }
    const picked = bookRows.find((b) => bookOptionValue(b) === value);
    if (!picked) return;

    const detailsId = Number(picked.bookDetailsId ?? picked.bookDetailId ?? 0);
    if (!detailsId) {
      toastError("Selected book has no book details id");
      return;
    }

    // Angular selectedBook: join authors array for display
    setSelectedAuthors(formatAuthors(picked));
    setSelectedBookDetailsId(detailsId);
  }

  const showTable = selectedBookDetailsId != null;

  return (
    <FilteredListPage
      title="Book Search"
      filtersCollapsible
      filtersDefaultOpen
      filters={
        <GlobalFilterBarRow className="items-end">
          <div className="w-1/2 min-w-0 shrink-0 grow-0 basis-1/2">
            <GlobalFilterField
              label="Book Search"
              className="!max-w-full !min-w-0 !flex-none w-full"
            >
              <Select
                value={selectedBookKey}
                onChange={handleBookChange}
                options={bookOptions}
                placeholder="Book Search"
                searchable
                onSearch={(t) => void onBookSearch(t)}
                isLoading={bookSearchLoading}
                clearable
              />
            </GlobalFilterField>
          </div>
        </GlobalFilterBarRow>
      }
      rowData={showTable ? tableRows : []}
      columnDefs={columnDefs}
      loading={showTable ? loadingDetails : false}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Book Search",
      }}
    />
  );
}
