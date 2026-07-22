"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon, PencilIcon } from "lucide-react";
import { Select, type SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSessionContext } from "@/context/SessionContext";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  generateBooksBarcode,
  getLibraryBookById,
  listBookCategoriesByLibrary,
  listBooksByLibraryAndCategory,
  listCollegesForLibrary,
  listLibrariesByCollege,
  searchBooksInLibraryCategory,
} from "@/services";
import type { LibraryRow } from "@/services";
import { EditBookModal } from "./EditBookModal";

type SearchMode = "book" | "all";

function bookOptionLabel(b: LibraryRow): string {
  const title = String(b.bookTitle ?? b.title ?? "Book").trim();
  const lib = String(b.libraryCode ?? "").trim();
  const copies =
    b.availableCopies == null || b.availableCopies === ""
      ? "Not Available"
      : `Available: ${String(b.availableCopies)}`;
  const authors = Array.isArray(b.authors)
    ? b.authors.join(", ")
    : String(b.authors ?? "");
  const publishers = Array.isArray(b.publisher)
    ? b.publisher.join(", ")
    : String(b.publisher ?? "");
  const category = String(b.bookCategoryCode ?? "");
  return [
    title,
    copies,
    lib ? `(${lib})` : "",
    authors ? `Authors: ${authors}` : "",
    publishers ? `Publishers: ${publishers}` : "",
    category ? `Category: ${category}` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  return <StatusBadge status={Boolean(p.data?.isActive)} />;
}

function makeActionsRenderer(
  collegeId: string | null,
  libraryId: string | null,
  bookcatId: string | null,
  searchMode: SearchMode,
  onEdit: (row: LibraryRow) => void,
) {
  return (p: ICellRendererParams<LibraryRow>) => {
    const row = p.data;
    if (!row?.bookId) return null;
    const qs = new URLSearchParams({
      bookId: String(row.bookId),
      bookTitle: String(row.bookTitle ?? row.title ?? ""),
      bookCode: String(row.bookCode ?? ""),
      noofcopies: String(row.noofcopies ?? ""),
      availableCopies: String(row.availableCopies ?? ""),
      issuedCopies: String(row.issuedCopies ?? ""),
    });
    if (collegeId) qs.set("collegeId", collegeId);
    if (libraryId) qs.set("libraryId", libraryId);
    if (bookcatId) qs.set("bookcatId", bookcatId);
    if (searchMode === "book") qs.set("check", "1");
    if (searchMode === "all") qs.set("check", "2");
    return (
      <div className="flex min-h-[3rem] flex-wrap items-center gap-x-2 gap-y-1 py-2 text-[12px] leading-snug">
        <Link
          href={`/library/add-more-books?${qs}`}
          className="shrink-0 whitespace-nowrap text-primary hover:underline"
        >
          Add More Books
        </Link>
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          |
        </span>
        <Link
          href={`/library/book-details?${qs}`}
          className="shrink-0 whitespace-nowrap text-primary hover:underline"
        >
          Book Details
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0"
          aria-label="Edit book"
          type="button"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export function BooksPage() {
  const { user } = useSessionContext();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const defaultCollegeId = user?.collegeId ?? 0;
  const organizationId = Number(user?.organizationId ?? 0);
  const employeeId = Number(user?.employeeId ?? 0);
  const requestedCollegeId = searchParams.get("collegeId");
  const requestedLibraryId = searchParams.get("libraryId");
  const requestedCategoryId = searchParams.get("bookcatId");
  const requestedBookId = searchParams.get("bookId");
  const requestedBookTitle = searchParams.get("bookTitle") ?? "";
  const requestedCheck = searchParams.get("check");

  const [searchMode, setSearchMode] = useState<SearchMode>(
    requestedCheck === "2" ? "all" : "book",
  );
  const [editBookRow, setEditBookRow] = useState<LibraryRow | null>(null);
  const [editBookOpen, setEditBookOpen] = useState(false);
  const [collegeId, setCollegeId] = useState<string | null>(
    requestedCollegeId ?? (defaultCollegeId ? String(defaultCollegeId) : null),
  );
  const [libraryId, setLibraryId] = useState<string | null>(requestedLibraryId);
  const [bookcatId, setBookcatId] = useState<string | null>(
    requestedCategoryId,
  );
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [bookSuggestions, setBookSuggestions] = useState<LibraryRow[]>([]);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const restoredBookRef = useRef(false);

  const collegeNum = collegeId ? Number(collegeId) : 0;
  const libraryNum = libraryId ? Number(libraryId) : 0;
  const bookcatNum = bookcatId ? Number(bookcatId) : 0;
  const filtersReady = collegeNum > 0 && libraryNum > 0 && bookcatNum > 0;

  const { data: colleges = [] } = useQuery({
    queryKey: [...QK.library.collegesForLibrary(), organizationId, employeeId],
    queryFn: () => listCollegesForLibrary(organizationId, employeeId),
  });

  const { data: libraries = [], isLoading: loadingLibraries } = useQuery({
    queryKey: QK.library.librariesByCollege(collegeNum),
    queryFn: () => listLibrariesByCollege(collegeNum),
    enabled: collegeNum > 0,
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: QK.library.bookCategoriesByLibrary(libraryNum),
    queryFn: () => listBookCategoriesByLibrary(libraryNum),
    enabled: libraryNum > 0,
  });

  const {
    data: categoryBooks = [],
    isLoading: loadingCategoryBooks,
    isError,
    error,
  } = useQuery({
    queryKey: QK.library.booksByCategory(libraryNum, bookcatNum || 0),
    queryFn: () =>
      listBooksByLibraryAndCategory(
        libraryNum,
        bookcatNum > 0 ? bookcatNum : null,
      ),
    // Angular clearData(All) → selectcategory() even when bookcatId is undefined
    enabled: searchMode === "all" && libraryNum > 0,
  });

  useEffect(() => {
    if (searchMode === "all" && isError && error) {
      toastError(error, "Failed to load books");
    }
  }, [searchMode, isError, error]);

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      (Array.isArray(colleges) ? colleges : []).map((c) => ({
        value: String(c.collegeId ?? c.fk_college_id ?? ""),
        label: String(
          c.collegeCode ?? c.college_code ?? c.collegeName ?? c.collegeId ?? "",
        ),
      })),
    [colleges],
  );

  const libraryOptions = useMemo<SelectOption[]>(
    () =>
      (Array.isArray(libraries) ? libraries : []).map((lib) => ({
        value: String(lib.libraryId),
        label: lib.libraryCode ?? lib.libraryName ?? String(lib.libraryId),
      })),
    [libraries],
  );

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      (Array.isArray(categories) ? categories : []).map((cat) => ({
        value: String(cat.bookcatId),
        label:
          cat.bookCategoryCode ?? cat.bookCategoryName ?? String(cat.bookcatId),
      })),
    [categories],
  );

  const bookOptions = useMemo<SelectOption[]>(() => {
    const base = bookSuggestions.map((b) => ({
      value: String(b.bookId ?? ""),
      label: bookOptionLabel(b),
    }));
    if (selectedBookId && !base.some((o) => o.value === selectedBookId)) {
      const picked = bookSuggestions.find(
        (b) => String(b.bookId) === selectedBookId,
      );
      if (picked)
        return [
          { value: selectedBookId, label: bookOptionLabel(picked) },
          ...base,
        ];
    }
    return base;
  }, [bookSuggestions, selectedBookId]);

  const selectedBook = useMemo(
    () =>
      bookSuggestions.find((b) => String(b.bookId) === selectedBookId) ?? null,
    [bookSuggestions, selectedBookId],
  );

  const tableRows = useMemo(() => {
    if (searchMode === "book") {
      return selectedBook ? [selectedBook] : [];
    }
    return Array.isArray(categoryBooks) ? categoryBooks : [];
  }, [searchMode, selectedBook, categoryBooks]);

  const onBookSearch = useCallback(
    async (term: string) => {
      if (!filtersReady || term.trim().length < 4) {
        setBookSuggestions([]);
        return;
      }
      setBookSearchLoading(true);
      try {
        const found = await searchBooksInLibraryCategory(
          libraryNum,
          bookcatNum,
          term,
        );
        setBookSuggestions(found);
      } catch (e) {
        toastError(e, "Book search failed");
        setBookSuggestions([]);
      } finally {
        setBookSearchLoading(false);
      }
    },
    [filtersReady, libraryNum, bookcatNum],
  );

  useEffect(() => {
    if (
      collegeOptions.length > 0 &&
      (!collegeId || !collegeOptions.some((o) => o.value === collegeId))
    ) {
      setCollegeId(collegeOptions[0]!.value);
    }
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (libraryOptions.length === 0) {
      if (libraryId) setLibraryId(null);
      return;
    }
    if (!libraryId || !libraryOptions.some((o) => o.value === libraryId)) {
      setLibraryId(libraryOptions[0]!.value);
    }
  }, [libraryOptions, libraryId]);

  useEffect(() => {
    if (categoryOptions.length === 0) {
      if (bookcatId) setBookcatId(null);
      return;
    }
    if (!bookcatId || !categoryOptions.some((o) => o.value === bookcatId)) {
      setBookcatId(categoryOptions[0]!.value);
    }
  }, [categoryOptions, bookcatId]);

  useEffect(() => {
    if (
      restoredBookRef.current ||
      searchMode !== "book" ||
      !filtersReady ||
      !requestedBookId ||
      requestedBookTitle.trim().length < 4
    )
      return;
    restoredBookRef.current = true;
    void searchBooksInLibraryCategory(
      libraryNum,
      bookcatNum,
      requestedBookTitle,
    )
      .then((rows) => {
        setBookSuggestions(rows);
        if (rows.some((row) => String(row.bookId) === requestedBookId)) {
          setSelectedBookId(requestedBookId);
        }
      })
      .catch((error) => toastError(error, "Could not restore selected book"));
  }, [
    bookcatNum,
    filtersReady,
    libraryNum,
    requestedBookId,
    requestedBookTitle,
    searchMode,
  ]);

  function resetCascade(from: "college" | "library" | "category") {
    if (from === "college") {
      setLibraryId(null);
      setBookcatId(null);
    } else if (from === "library") {
      setBookcatId(null);
    }
    setSelectedBookId(null);
    setBookSuggestions([]);
  }

  function handleCollegeChange(value: string | null) {
    setCollegeId(value);
    resetCascade("college");
  }

  function handleLibraryChange(value: string | null) {
    setLibraryId(value);
    resetCascade("library");
  }

  function handleCategoryChange(value: string | null) {
    setBookcatId(value);
    setSelectedBookId(null);
    setBookSuggestions([]);
  }

  function handleBookChange(value: string | null) {
    setSelectedBookId(value);
    if (!value) return;
    const picked = bookSuggestions.find((b) => String(b.bookId) === value);
  }

  const handleEditBook = useCallback((row: LibraryRow) => {
    setEditBookRow(row);
    setEditBookOpen(true);
  }, []);

  function handleBookSaved() {
    void queryClient.invalidateQueries({
      queryKey: QK.library.booksByCategory(libraryNum, bookcatNum),
    });
    const savedId = editBookRow?.bookId;
    if (!savedId) return;
    void getLibraryBookById(Number(savedId)).then((updated) => {
      if (!updated) return;
      const id = String(updated.bookId);
      setBookSuggestions((prev) => {
        const mapped = prev.map((b) => (String(b.bookId) === id ? updated : b));
        return mapped.some((b) => String(b.bookId) === id) ? mapped : prev;
      });
    });
  }

  async function handleGenerateBarcode() {
    setGeneratingBarcode(true);
    try {
      await generateBooksBarcode();
      toastSuccess("Book barcodes generated");
    } catch (e) {
      toastError(e, "Could not generate book barcodes");
    } finally {
      setGeneratingBarcode(false);
    }
  }

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        field: "title",
        headerName: "Title",
        minWidth: 220,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        valueGetter: (p) => p.data?.title ?? p.data?.bookTitle,
      },
      { field: "libraryCode", headerName: "Library", minWidth: 120 },
      { field: "noofcopies", headerName: "No of copies", minWidth: 110 },
      {
        field: "availableCopies",
        headerName: "Available Copies",
        minWidth: 120,
      },
      {
        field: "issuedCopies",
        headerName: "Issued Copies",
        minWidth: 110,
        valueGetter: (p) =>
          p.data?.issuedCopies == null ? 0 : p.data.issuedCopies,
      },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 100,
        flex: 0,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        minWidth: 220,
        width: 220,
        flex: 0,
        autoHeight: true,
        wrapText: true,
        sortable: false,
        cellRenderer: makeActionsRenderer(
          collegeId,
          libraryId,
          bookcatId,
          searchMode,
          handleEditBook,
        ),
      },
    ],
    [collegeId, libraryId, bookcatId, searchMode, handleEditBook],
  );

  const tableLoading = searchMode === "all" ? loadingCategoryBooks : false;

  return (
    <FilteredListPage
      title="Books"
      filters={
        <div className="space-y-4">
          <RadioGroup
            value={searchMode}
            onValueChange={(v) => {
              const next = v as SearchMode;
              setSearchMode(next);
              setSelectedBookId(null);
              setBookSuggestions([]);
              // Angular clearData(All) → selectcategory() even if bookcatId is undefined
              if (next === "all" && libraryNum > 0) {
                void queryClient.invalidateQueries({
                  queryKey: QK.library.booksByCategory(
                    libraryNum,
                    bookcatNum || 0,
                  ),
                });
              }
            }}
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="book" id="lib-books-mode-book" />
              <Label
                htmlFor="lib-books-mode-book"
                className="text-[13px] font-normal"
              >
                Search By Book
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="lib-books-mode-all" />
              <Label
                htmlFor="lib-books-mode-all"
                className="text-[13px] font-normal"
              >
                All
              </Label>
            </div>
          </RadioGroup>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={handleCollegeChange}
              options={collegeOptions}
              placeholder="College"
              searchable
            />
            <Select
              label="Library"
              required
              value={libraryId}
              onChange={handleLibraryChange}
              options={libraryOptions}
              placeholder="Library"
              searchable
              isLoading={loadingLibraries}
              disabled={!collegeId}
            />
            <Select
              label="Book category"
              required
              value={bookcatId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              placeholder="Book category"
              searchable
              isLoading={loadingCategories}
              disabled={!libraryId}
            />
            {searchMode === "book" ? (
              <Select
                label="Search Book"
                value={selectedBookId}
                onChange={handleBookChange}
                options={bookOptions}
                placeholder="Search Book…"
                searchable
                onSearch={(t) => void onBookSearch(t)}
                isLoading={bookSearchLoading}
                clearable
                disabled={!filtersReady}
              />
            ) : null}
          </div>
        </div>
      }
      filtersCollapsible
      filtersDefaultOpen
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={tableLoading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Books",
      }}
      toolbarTrailing={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[30px] px-3 text-[12px]"
            disabled={generatingBarcode || tableRows.length === 0}
            onClick={() => void handleGenerateBarcode()}
          >
            Generate Book BarCode
          </Button>
          <Button asChild size="sm" className="h-[30px] px-3 text-[12px]">
            <Link href="/library/add-books">
              <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
              Add Books
            </Link>
          </Button>
        </div>
      }
    >
      <EditBookModal
        open={editBookOpen}
        onClose={() => {
          setEditBookOpen(false);
          setEditBookRow(null);
        }}
        row={editBookRow}
        onSaved={handleBookSaved}
      />
    </FilteredListPage>
  );
}
