"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { RotateCcw, XIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getLibraryBookDetailById,
  listBookDetailsByAccession,
  listBookDetailsByBookId,
  searchLibraryBookDetails,
  searchLibraryBooks,
  type LibraryRow,
} from "@/services";

type SearchMode = "title" | "accession";

function formatBookAuthors(book: LibraryRow): string {
  const authors = book.authors;
  if (Array.isArray(authors)) {
    return authors
      .map((a) => {
        if (typeof a === "string") return a;
        const row = a as Record<string, unknown>;
        return String(row.firstName ?? row.authorName ?? row.name ?? "").trim();
      })
      .filter(Boolean)
      .join(", ");
  }
  return String(
    book.bookAuthor ?? book.authorFirstName ?? authors ?? "",
  ).trim();
}

function titleBookLabel(b: LibraryRow): string {
  const title = String(b.bookTitle ?? b.title ?? "").trim();
  const copies = b.noofcopies;
  if (title && copies != null && copies !== "") return `${title} - ${copies}`;
  return title || "Book";
}

function accessionBookLabel(b: LibraryRow): string {
  const title = String(b.bookTitle ?? b.title ?? "").trim();
  const acc = String(b.accessionno ?? b.accessionNo ?? "").trim();
  if (title && acc) return `${title} (${acc})`;
  return title || acc || "Book";
}

function titleBookValue(b: LibraryRow): string {
  return String(b.bookId ?? "");
}

function accessionBookValue(b: LibraryRow): string {
  // Angular option value is bookId; lookup uses accessionno after select
  return String(b.bookId ?? b.bookDetailsId ?? b.bookDetailId ?? "");
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
      className="h-[30px] max-w-[192px] object-contain"
    />
  );
}

function availabilityRenderer(p: ICellRendererParams<LibraryRow>) {
  const v = p.data?.availabilityStatus;
  if (v === undefined || v === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const active = v === true || v === 1 || v === "1" || v === "true";
  return (
    <StatusBadge
      status={active}
      label={active ? "Available" : "Not Available"}
    />
  );
}

function makeRemoveRenderer(onRemove: (row: LibraryRow) => void) {
  return (p: ICellRendererParams<LibraryRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        aria-label="Remove from queue"
        onClick={() => onRemove(row)}
      >
        <XIcon className="h-3.5 w-3.5" />
      </Button>
    );
  };
}

export default function PrintBooksBarcodesPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>("title");
  const [bookRows, setBookRows] = useState<LibraryRow[]>([]);
  const [bookOptions, setBookOptions] = useState<SelectOption[]>([]);
  const [selectedBookKey, setSelectedBookKey] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<LibraryRow | null>(null);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [printQueue, setPrintQueue] = useState<LibraryRow[]>([]);

  const [spineStickers, setSpineStickers] = useState(false);

  // Angular: title length > 3, accession length > 2
  const minSearchLen = searchMode === "title" ? 4 : 3;

  const onBookSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length < minSearchLen) {
        setBookRows([]);
        setBookOptions([]);
        return;
      }
      setBookSearchLoading(true);
      try {
        if (searchMode === "title") {
          const rows = await searchLibraryBooks(q);
          setBookRows(rows);
          setBookOptions(
            rows.map((b) => ({
              value: titleBookValue(b),
              label: titleBookLabel(b),
            })),
          );
        } else {
          const rows = await searchLibraryBookDetails(q);
          // Angular: keep exact accession matches, then dedupe by accessionno
          const exact = rows.filter(
            (r) =>
              String(r.accessionno ?? r.accessionNo ?? "").toLowerCase() ===
              q.toLowerCase(),
          );
          const list = exact.length > 0 ? exact : rows;
          const seen = new Set<string>();
          const deduped = list.filter((r) => {
            const acc = String(r.accessionno ?? r.accessionNo ?? "").trim();
            if (!acc) return true;
            if (seen.has(acc)) return false;
            seen.add(acc);
            return true;
          });
          setBookRows(deduped);
          setBookOptions(
            deduped.map((b) => ({
              value: accessionBookValue(b),
              label: accessionBookLabel(b),
            })),
          );
        }
      } catch (e) {
        toastError(e, "Book search failed");
        setBookRows([]);
        setBookOptions([]);
      } finally {
        setBookSearchLoading(false);
      }
    },
    [searchMode, minSearchLen],
  );

  function handleModeChange(mode: SearchMode) {
    setSearchMode(mode);
    setSelectedBookKey(null);
    setSelectedBook(null);
    setBookRows([]);
    setBookOptions([]);
    setPrintQueue([]);
  }

  function handleBookChange(value: string | null) {
    setSelectedBookKey(value);
    if (!value) {
      setSelectedBook(null);
      return;
    }
    const picked = bookRows.find((b) =>
      searchMode === "title"
        ? titleBookValue(b) === value
        : accessionBookValue(b) === value,
    );
    if (picked) setSelectedBook(picked);
  }

  function handleReset() {
    setSelectedBookKey(null);
    setSelectedBook(null);
    setBookRows([]);
    setBookOptions([]);
    setPrintQueue([]);
  }

  const removeFromQueue = useCallback((row: LibraryRow) => {
    const id = row.bookDetailsId;
    setPrintQueue((prev) => prev.filter((r) => r.bookDetailsId !== id));
  }, []);

  async function handleAdd() {
    if (!selectedBook) {
      toastError("Select a book first.");
      return;
    }
    setAdding(true);
    try {
      let details: LibraryRow[] = [];
      if (searchMode === "title") {
        const bookId = Number(selectedBook.bookId ?? 0);
        if (!bookId) {
          toastError("Invalid book selection.");
          return;
        }
        // Angular: BookDetail by Book.bookId
        details = await listBookDetailsByBookId(bookId);
      } else {
        const acc = String(
          selectedBook.accessionno ?? selectedBook.accessionNo ?? "",
        ).trim();
        if (acc) {
          // Angular: BookDetail by accessionno
          details = await listBookDetailsByAccession(acc);
        }
        if (!details.length) {
          const detailsId = Number(
            selectedBook.bookDetailsId ?? selectedBook.bookDetailId ?? 0,
          );
          if (detailsId > 0) {
            const one = await getLibraryBookDetailById(detailsId);
            if (one) details = [one];
          }
        }
      }

      if (!details.length) {
        toastError("No book copies found to add.");
        return;
      }

      const author = formatBookAuthors(selectedBook);
      let added = 0;
      let skipped = false;
      setPrintQueue((prev) => {
        const next = [...prev];
        for (const d of details) {
          const id = d.bookDetailsId;
          if (id != null && next.some((x) => x.bookDetailsId === id)) {
            skipped = true;
            continue;
          }
          next.push({
            ...d,
            authors: formatBookAuthors(d) || author,
            bookAuthor: formatBookAuthors(d) || author,
          });
          added += 1;
        }
        return next;
      });

      if (added > 0) {
        toastSuccess(
          `Added ${added} copy${added === 1 ? "" : "ies"} to print queue`,
        );
        setSelectedBookKey(null);
        setSelectedBook(null);
      } else if (skipped) {
        toastInfo(
          searchMode === "title"
            ? "Already Added With Same Book Title"
            : "Already Added With Same Accession Number",
        );
      }
    } catch (e) {
      toastError(e, "Failed to add books");
    } finally {
      setAdding(false);
    }
  }

  function handlePrint(spine: boolean) {
    if (printQueue.length === 0) return;
    // Angular printPage / printSpinePage — toggle layout then window.print()
    setSpineStickers(spine);
    globalThis.setTimeout(() => globalThis.print(), 500);
  }

  function barcodeSrc(row: LibraryRow): string {
    const raw = row.bookBarcode ?? row.barcode;
    if (raw == null || raw === "") return "";
    const str = String(raw);
    return str.startsWith("data:") ? str : `data:image/jpg;base64,${str}`;
  }

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
        minWidth: 160,
      },
      {
        headerName: "Author",
        minWidth: 140,
        valueGetter: (p) => formatBookAuthors(p.data ?? {}),
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
        field: "availabilityStatus",
        headerName: "Availability Status",
        minWidth: 140,
        cellRenderer: availabilityRenderer,
      },
      {
        headerName: "Book BarCode",
        minWidth: 210,
        flex: 0,
        cellRenderer: barcodeRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 80,
        flex: 0,
        sortable: false,
        cellRenderer: makeRemoveRenderer(removeFromQueue),
      },
    ],
    [removeFromQueue],
  );

  return (
    <>
      <div className="print:hidden">
        <FilteredListPage
          title="Print Books Barcodes"
          filters={
            <div className="space-y-4">
              <RadioGroup
                value={searchMode}
                onValueChange={(v) => handleModeChange(v as SearchMode)}
                className="flex flex-wrap gap-x-6 gap-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="title" id="print-barcode-title" />
                  <Label
                    htmlFor="print-barcode-title"
                    className="text-[13px] font-normal"
                  >
                    Search By Book Title
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="accession" id="print-barcode-acc" />
                  <Label
                    htmlFor="print-barcode-acc"
                    className="text-[13px] font-normal"
                  >
                    Search By Accession Number
                  </Label>
                </div>
              </RadioGroup>

              <GlobalFilterBarRow className="items-end">
                <div className="w-1/2 min-w-0 shrink-0 grow-0 basis-1/2">
                  <GlobalFilterField
                    label={
                      searchMode === "title"
                        ? "Search Book"
                        : "Search Accession Number"
                    }
                    className="!max-w-full !min-w-0 !flex-none w-full"
                  >
                    <Select
                      value={selectedBookKey}
                      onChange={handleBookChange}
                      options={bookOptions}
                      placeholder={
                        searchMode === "title"
                          ? "Search Book ..."
                          : "Search Accession Number ..."
                      }
                      searchable
                      onSearch={(t) => void onBookSearch(t)}
                      isLoading={bookSearchLoading}
                      clearable
                    />
                  </GlobalFilterField>
                </div>
                <GlobalFilterField
                  label=" "
                  className="global-filter-field--action global-filter-field--shrink"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 shrink-0 px-4 text-[12px]"
                      disabled={adding || !selectedBook}
                      onClick={() => void handleAdd()}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 w-9 shrink-0 p-0"
                      aria-label="Reset"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </GlobalFilterField>
              </GlobalFilterBarRow>
            </div>
          }
          rowData={printQueue}
          columnDefs={columnDefs}
          pagination
          paginationPageSize={10}
          height="auto"
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
            pdfDocumentTitle: "Print Books Barcodes",
          }}
          toolbarTrailing={
            printQueue.length > 0 ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-[30px]"
                  onClick={() => handlePrint(false)}
                >
                  Print Stickers
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-[30px]"
                  onClick={() => handlePrint(true)}
                >
                  Print Spine Stickers
                </Button>
              </>
            ) : undefined
          }
        />
      </div>

      {/* Angular sticker / spine print layout — screen-hidden, shown for window.print() */}
      <div className="print-only mx-auto w-[990px] bg-white text-black">
        {!spineStickers ? (
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                {printQueue.map((row) => {
                  const src = barcodeSrc(row);
                  const acc = String(row.accessionno ?? "").trim();
                  const title = String(row.bookTitle ?? row.title ?? "").trim();
                  return (
                    <td
                      key={String(row.bookDetailsId ?? acc)}
                      style={{
                        width: "25%",
                        border: "none",
                        verticalAlign: "middle",
                        padding: "25px 0 9px",
                        float: "left",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: -3,
                          fontSize: 12,
                        }}
                      >
                        {acc}
                      </span>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={acc}
                          style={{
                            height: 30,
                            width: 192,
                            margin: "0 auto",
                            display: "block",
                          }}
                        />
                      ) : null}
                      <span
                        style={{
                          display: "block",
                          justifyContent: "center",
                          fontSize: 8,
                          marginTop: 1,
                          width: 180,
                          marginLeft: "auto",
                          marginRight: "auto",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          padding: "0 15px",
                          textAlign: "center",
                        }}
                      >
                        {title}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                {printQueue.map((row) => {
                  const src = barcodeSrc(row);
                  const acc = String(row.accessionno ?? "").trim();
                  return (
                    <td
                      key={`spine-${String(row.bookDetailsId ?? acc)}`}
                      style={{
                        width: "11%",
                        border: "none",
                        verticalAlign: "middle",
                        padding: "20px 0 9px",
                        float: "left",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginBottom: -3,
                          fontSize: 12,
                        }}
                      >
                        {acc}
                      </span>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={acc}
                          style={{
                            height: 20,
                            width: 50,
                            margin: "0 auto",
                            display: "block",
                          }}
                        />
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
