"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { XIcon, History, Plus } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { DataTable } from "@/common/components/table";
import { FilteredPage } from "@/components/layout";
import { toDateOnlyISO } from "@/common/generic-functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { USER_ROLES } from "@/config/constants/app";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  createBookIssues,
  getLibraryBookDetailById,
  getLibrarySecurityLibraryId,
  listBookIssuedOnTypes,
  listIssuedBooksByMemberId,
  listReservedBooksByMemberId,
  searchLibraryBookDetails,
  searchLibraryMembers,
  type BookIssuePayload,
  type LibraryRow,
} from "@/services";
import type { LibraryMembership } from "@/types/library";
import { BookReservedModal } from "./_components/BookReservedModal";
import { BookIssueCollapsible } from "./_components/BookIssueCollapsible";

function memberOptionLabel(m: LibraryMembership): string {
  const code = String(m.memberCode ?? m.membershipNo ?? "").trim();
  const student = m.studentDetail as Record<string, unknown> | null | undefined;
  const employee = m.employeeDetail as
    | Record<string, unknown>
    | null
    | undefined;
  const name = String(
    student?.firstName ?? employee?.firstName ?? m.memberName ?? "",
  ).trim();
  if (code && name) return `${code} (${name})`;
  return code || name || "Member";
}

function memberOptionValue(m: LibraryMembership): string {
  return String(m.libMemberId ?? m.memberShipId ?? "");
}

function memberCodeOf(m: LibraryMembership | null): string {
  return String(m?.memberCode ?? m?.membershipNo ?? "").trim();
}

function bookOptionLabel(b: LibraryRow): string {
  const acc = String(b.accessionno ?? b.accessionNo ?? "").trim();
  const title = String(b.bookTitle ?? b.title ?? "").trim();
  if (acc && title) return `(${acc}) ${title}`;
  if (acc) return `(${acc})`;
  return title || "Book";
}

function bookOptionValue(b: LibraryRow): string {
  return String(b.bookDetailsId ?? b.bookDetailId ?? "");
}

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
    book.authorFirstName ?? book.bookAuthor ?? book.authorName ?? "",
  ).trim();
}

function formatDisplayDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calcIssuedDays(issueDate: Date, returnDate: Date): number {
  const d1 = new Date(issueDate);
  const d2 = new Date(returnDate);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const timeDiff = Math.round(d2.getTime() - d1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function issuedReturnStatus(
  row: LibraryRow,
): boolean | "active" | "inactive" | "pending" {
  if (row.fineTypeCode === "BOOKLOST") return "inactive";
  return Boolean(row.isreturned);
}

type PendingIssueRow = BookIssuePayload & { _key: string };

const DEFAULT_MEMBER_PHOTO = "/assets/images/avatars/default_Student.png";

function issuedBarcodeRenderer(p: ICellRendererParams<LibraryRow>) {
  const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
  const raw = detail.bookBarcode ?? detail.barcode;
  if (raw == null || raw === "")
    return <span className="text-muted-foreground">—</span>;
  const str = String(raw);
  const src = str.startsWith("data:") ? str : `data:image/jpeg;base64,${str}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- base64 barcode from API
    <img src={src} alt="" className="h-[30px] max-w-[192px] object-contain" />
  );
}

function issuedReturnRenderer(p: ICellRendererParams<LibraryRow>) {
  const row = p.data ?? {};
  if (row.fineTypeCode === "BOOKLOST") {
    return (
      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
        Book Lost
      </span>
    );
  }
  return (
    <StatusBadge
      status={issuedReturnStatus(row)}
      label={row.isreturned ? "Returned" : "Not Returned"}
    />
  );
}

const PENDING_COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<PendingIssueRow>,
  accessionNo: {
    field: "accessionno",
    headerName: "Accession No",
    minWidth: 120,
  } as ColDef<PendingIssueRow>,
  fromDate: {
    field: "issueFromdate",
    headerName: "From Date",
    minWidth: 110,
    valueFormatter: (p) => formatDisplayDate(p.value),
  } as ColDef<PendingIssueRow>,
  toDate: {
    field: "issueTodate",
    headerName: "To Date",
    minWidth: 110,
    valueFormatter: (p) => formatDisplayDate(p.value),
  } as ColDef<PendingIssueRow>,
  bookTitle: {
    headerName: "Book Title",
    minWidth: 180,
    flex: 1,
    valueGetter: (p) => {
      const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
      return String(detail.bookTitle ?? detail.title ?? "—");
    },
  } as ColDef<PendingIssueRow>,
  volume: {
    headerName: "Volume",
    minWidth: 90,
    valueGetter: (p) => {
      const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
      return String(detail.bookVol ?? detail.vol ?? "—");
    },
  } as ColDef<PendingIssueRow>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
  } as ColDef<PendingIssueRow>,
};

function makePendingRemoveRenderer(onRemove: (key: string) => void) {
  return (p: ICellRendererParams<PendingIssueRow>) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Remove book"
      onClick={() => {
        const key = p.data?._key;
        if (key) onRemove(key);
      }}
    >
      <XIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function BookIssuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSessionContext();

  const isAdmin =
    user?.userRole === USER_ROLES.ADMIN ||
    user?.userRole === USER_ROLES.SUPERADMIN;
  const organizationId = Number(user?.organizationId ?? 0);
  const employeeId = Number(user?.employeeId ?? 0);

  const { data: securityLibraryId } = useQuery({
    queryKey: ["Library", "securityLibraryId", organizationId, employeeId],
    queryFn: () => getLibrarySecurityLibraryId(organizationId, employeeId),
    enabled: !isAdmin && organizationId > 0 && employeeId > 0,
  });

  const { data: bookIssuedOnTypes = [] } = useQuery({
    queryKey: ["Library", "bookIssuedOnTypes"],
    queryFn: listBookIssuedOnTypes,
  });

  const [memberRows, setMemberRows] = useState<LibraryMembership[]>([]);
  const [memberOptions, setMemberOptions] = useState<SelectOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<LibraryMembership | null>(null);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  const [bookRows, setBookRows] = useState<LibraryRow[]>([]);
  const [bookOptions, setBookOptions] = useState<SelectOption[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<LibraryRow | null>(null);
  const [bookDetail, setBookDetail] = useState<LibraryRow | null>(null);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);

  const [bookIssuedOnId, setBookIssuedOnId] = useState<number | undefined>();
  const [issueDate, setIssueDate] = useState<Date>(() => new Date());
  const [issuedDays, setIssuedDays] = useState(1);
  const [returnDate, setReturnDate] = useState<Date>(() => new Date());
  const [pendingIssues, setPendingIssues] = useState<PendingIssueRow[]>([]);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [reservedBooks, setReservedBooks] = useState<LibraryRow[]>([]);

  const libMemberId = Number(selectedMember?.libMemberId ?? 0);

  const {
    data: issuedBooks = [],
    isLoading: loadingIssued,
    refetch: refetchIssued,
  } = useQuery({
    queryKey: ["Library", "issuedBooksByMember", libMemberId],
    queryFn: () => listIssuedBooksByMemberId(libMemberId),
    enabled: libMemberId > 0,
  });

  const maxBooks = Number(selectedMember?.noOfMaxBooks ?? 0);
  const issuedCount =
    Number(selectedMember?.noOfBorrowedBooks ?? 0) + pendingIssues.length;
  const availableBooks = Math.max(0, maxBooks - issuedCount);

  const bookCategory = String(
    selectedBook?.bookCategoryCode ?? selectedBook?.bookCategory ?? "",
  );
  const bookAuthor = selectedBook ? formatBookAuthors(selectedBook) : "";
  const bookVolume = String(selectedBook?.vol ?? "");
  const availableCopies = useMemo(() => {
    if (!selectedBook) return 0;
    const total = Number(
      selectedBook.noofcopies ?? selectedBook.noOfCopies ?? 0,
    );
    const issued = Number(selectedBook.issuedCopies ?? 0);
    if (selectedBook.availableCopies != null) {
      return Number(selectedBook.availableCopies);
    }
    return Math.max(0, total - issued);
  }, [selectedBook]);

  const issuedOnOptions = useMemo(
    () =>
      bookIssuedOnTypes.map((row) => ({
        value: String(row.generalDetailId ?? ""),
        label: String(
          row.generalDetailDisplayName ??
            row.generalDetailCode ??
            row.generalDetailId ??
            "",
        ),
      })),
    [bookIssuedOnTypes],
  );

  const resolveLibraryId = useCallback(
    () => (isAdmin ? undefined : securityLibraryId),
    [isAdmin, securityLibraryId],
  );

  const onMemberSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length <= 4) {
        setMemberRows([]);
        setMemberOptions([]);
        return;
      }
      setMemberSearchLoading(true);
      try {
        const rows = await searchLibraryMembers(q, resolveLibraryId());
        setMemberRows(rows);
        const exact = rows.filter((m) => memberCodeOf(m) === q);
        const displayRows = exact.length === 1 ? exact : rows;
        setMemberOptions(
          displayRows.map((m) => ({
            value: memberOptionValue(m),
            label: memberOptionLabel(m),
          })),
        );
      } catch (e) {
        toastError(e, "Membership search failed");
        setMemberRows([]);
        setMemberOptions([]);
      } finally {
        setMemberSearchLoading(false);
      }
    },
    [resolveLibraryId],
  );

  const onBookSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length <= 2) {
        setBookRows([]);
        setBookOptions([]);
        return;
      }
      setBookSearchLoading(true);
      try {
        const libraryId = Number(
          selectedMember?.libraryId ??
            selectedMember?.fk_library_id ??
            resolveLibraryId() ??
            0,
        );
        const rows = await searchLibraryBookDetails(
          q,
          isAdmin ? undefined : libraryId > 0 ? libraryId : undefined,
        );
        const exact = rows.filter(
          (b) => String(b.accessionno ?? b.accessionNo ?? "").trim() === q,
        );
        const displayRows = exact.length > 0 ? exact : rows;
        setBookRows(displayRows);
        setBookOptions(
          displayRows.map((b) => ({
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
    },
    [isAdmin, resolveLibraryId, selectedMember],
  );

  function clearBookFields() {
    setSelectedBookId(null);
    setSelectedBook(null);
    setBookDetail(null);
    setBookRows([]);
    setBookOptions([]);
    setBookIssuedOnId(undefined);
    setIssueDate(new Date());
    setIssuedDays(1);
    setReturnDate(new Date());
  }

  function handleMemberChange(value: string | null) {
    setSelectedMemberId(value);
    setPendingIssues([]);
    clearBookFields();
    if (!value) {
      setSelectedMember(null);
      setReservedBooks([]);
      return;
    }
    const picked = memberRows.find((m) => memberOptionValue(m) === value);
    if (picked) setSelectedMember(picked);
  }

  async function handleBookChange(value: string | null) {
    setSelectedBookId(value);
    if (!value) {
      setSelectedBook(null);
      setBookDetail(null);
      return;
    }
    const picked = bookRows.find((b) => bookOptionValue(b) === value);
    if (!picked) return;

    setSelectedBook(picked);
    const defaultIssuedOn =
      Number(bookIssuedOnTypes[0]?.generalDetailId ?? 0) || undefined;
    setBookIssuedOnId(defaultIssuedOn);
    setIssuedDays(21);
    const nextReturn = addDays(issueDate, 20);
    setReturnDate(nextReturn);

    const bookDetailsId = Number(
      picked.bookDetailsId ?? picked.bookDetailId ?? 0,
    );
    if (bookDetailsId) {
      try {
        const detail = await getLibraryBookDetailById(bookDetailsId);
        setBookDetail(detail);
      } catch (e) {
        toastError(e, "Failed to load book details");
        setBookDetail(picked);
      }
    } else {
      setBookDetail(picked);
    }
  }

  function handleCalDays(nextIssue: Date, nextReturn: Date) {
    if (nextIssue.getTime() > nextReturn.getTime()) {
      toastInfo("Issue date should be greater then To return date.");
      return;
    }
    setIssuedDays(calcIssuedDays(nextIssue, nextReturn));
  }

  function handleIssueDateChange(date: Date | null) {
    if (!date) return;
    setIssueDate(date);
    handleCalDays(date, returnDate);
  }

  function handleReturnDateChange(date: Date | null) {
    if (!date) return;
    setReturnDate(date);
    handleCalDays(issueDate, date);
  }

  function handleIssuedDaysChange(value: string) {
    const days = Number(value);
    if (!Number.isFinite(days) || days < 1) return;
    setIssuedDays(days);
    setReturnDate(addDays(issueDate, days - 1));
  }

  function handleAddBook() {
    if (!selectedMember || !selectedBook || !bookDetail) return;
    if (!bookIssuedOnId) {
      toastInfo("Book Issue On is required");
      return;
    }
    const bookDetailsId = Number(
      selectedBook.bookDetailsId ?? selectedBook.bookDetailId ?? 0,
    );
    if (
      pendingIssues.some(
        (row) =>
          Number(
            row.bookDetail?.bookDetailsId ?? row.bookDetail?.bookDetailId ?? 0,
          ) === bookDetailsId,
      )
    ) {
      toastInfo("Book Already Present in Books List.");
      return;
    }

    const payload: PendingIssueRow = {
      _key: `${bookDetailsId}-${Date.now()}`,
      bookIssuedOnId,
      issueFromdate: toDateOnlyISO(issueDate),
      issuedDays,
      issueTodate: toDateOnlyISO(returnDate),
      libraryId: Number(selectedMember.libraryId ?? 0),
      libMemberId: Number(selectedMember.libMemberId ?? 0),
      isActive: true,
      bookDetail: bookDetail,
      isrenewaled: false,
      isreturned: false,
      accessionno: String(
        selectedBook.accessionno ?? selectedBook.accessionNo ?? "",
      ),
    };
    setPendingIssues((prev) => [...prev, payload]);
    clearBookFields();
  }

  const handleRemovePending = useCallback((key: string) => {
    setPendingIssues((prev) => prev.filter((row) => row._key !== key));
  }, []);

  async function refreshMemberAfterIssue(memberCode: string) {
    try {
      const rows = await searchLibraryMembers(memberCode, resolveLibraryId());
      const match = rows.find((m) => memberCodeOf(m) === memberCode) ?? rows[0];
      if (match) {
        setSelectedMember(match);
        setSelectedMemberId(memberOptionValue(match));
        setMemberRows(rows);
        setMemberOptions(
          rows.map((m) => ({
            value: memberOptionValue(m),
            label: memberOptionLabel(m),
          })),
        );
      }
      await refetchIssued();
    } catch (e) {
      toastError(e, "Failed to refresh member details");
    }
  }

  async function handleIssueBooks() {
    if (pendingIssues.length === 0) return;
    setIssuing(true);
    try {
      const payload = pendingIssues.map(({ _key, ...row }) => row);
      await createBookIssues(payload);
      toastSuccess("Books issued successfully");
      setPendingIssues([]);
      const code = memberCodeOf(selectedMember);
      if (code) await refreshMemberAfterIssue(code);
      void queryClient.invalidateQueries({
        queryKey: ["Library", "issuedBooksByMember", libMemberId],
      });
    } catch (e) {
      toastError(e, "Failed to issue books");
    } finally {
      setIssuing(false);
    }
  }

  async function loadReservedBooks() {
    if (!libMemberId) return;
    try {
      const rows = await listReservedBooksByMemberId(libMemberId);
      setReservedBooks(rows);
    } catch (e) {
      toastError(e, "Failed to load reserved books");
    }
  }

  const student = selectedMember?.studentDetail as
    | Record<string, unknown>
    | null
    | undefined;
  const employee = selectedMember?.employeeDetail as
    | Record<string, unknown>
    | null
    | undefined;
  const isEmployee = employee != null;
  const photoUrl =
    String(
      (isEmployee ? employee?.photoPath : student?.studentPhotoPath) ??
        DEFAULT_MEMBER_PHOTO,
    ).trim() || DEFAULT_MEMBER_PHOTO;
  const displayName = String(
    student?.firstName ??
      employee?.firstName ??
      selectedMember?.memberName ??
      "",
  );
  const displaySub1 = String(
    student?.rollNumber ??
      employee?.empNumber ??
      selectedMember?.rollNumber ??
      "",
  );
  const displaySub2 = isEmployee
    ? String(employee?.empDeptName ?? "")
    : [
        student?.collegeCode,
        student?.academicYear,
        student?.courseCode,
        student?.groupCode,
        student?.courseYearName,
        student?.section ? `Section ${student.section}` : "",
      ]
        .filter(Boolean)
        .join(" / ");
  const displayMobile = String(student?.mobile ?? employee?.mobile ?? "");

  const pendingColumnDefs = useMemo<ColDef<PendingIssueRow>[]>(
    () => [
      PENDING_COL_DEFS.siNo,
      PENDING_COL_DEFS.accessionNo,
      PENDING_COL_DEFS.fromDate,
      PENDING_COL_DEFS.toDate,
      PENDING_COL_DEFS.bookTitle,
      PENDING_COL_DEFS.volume,
      {
        ...PENDING_COL_DEFS.actions,
        cellRenderer: makePendingRemoveRenderer(handleRemovePending),
      },
    ],
    [handleRemovePending],
  );

  const issuedColumnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: "Sl.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Book Title",
        minWidth: 160,
        flex: 1,
        valueGetter: (p) => {
          const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
          return String(detail.bookTitle ?? p.data?.bookTitle ?? "—");
        },
      },
      {
        headerName: "Accession No",
        minWidth: 120,
        valueGetter: (p) => {
          const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
          return String(detail.accessionno ?? p.data?.accessionno ?? "—");
        },
      },
      {
        field: "issueFromdate",
        headerName: "Issue Date",
        minWidth: 110,
        valueFormatter: (p) => formatDisplayDate(p.value),
      },
      {
        field: "issueTodate",
        headerName: "Return Date",
        minWidth: 110,
        valueFormatter: (p) => formatDisplayDate(p.value),
      },
      {
        field: "bookIssuedOnCode",
        headerName: "Issued On",
        minWidth: 100,
        valueFormatter: (p) => (p.value ? String(p.value) : "—"),
      },
      {
        headerName: "Book BarCode",
        minWidth: 200,
        flex: 0,
        cellRenderer: issuedBarcodeRenderer,
        sortable: false,
      },
      {
        headerName: "Return Status",
        minWidth: 130,
        flex: 0,
        cellRenderer: issuedReturnRenderer,
        sortable: false,
      },
    ],
    [],
  );

  const filters = (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-2 lg:col-span-4">
          <Select
            label="Membership Search"
            value={selectedMemberId}
            onChange={handleMemberChange}
            options={memberOptions}
            placeholder="Membership Search"
            searchable
            onSearch={(t) => void onMemberSearch(t)}
            isLoading={memberSearchLoading}
            clearable
            className="w-full"
          />
        </div>
        {selectedMember ? (
          <div className="flex overflow-hidden rounded-[3px] border-4 border-[#c3d9ff] bg-[#fbfbfb] lg:col-span-8">
            <div className="flex w-[26%] min-w-[88px] max-w-[140px] shrink-0 items-center justify-center bg-[#c3d9ff] p-1.5">
              <img
                src={photoUrl}
                alt=""
                className="h-auto w-full max-h-[110px] object-contain"
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith("default_Student.png")) {
                    e.currentTarget.src = DEFAULT_MEMBER_PHOTO;
                  }
                }}
              />
            </div>
            <div className="min-w-0 flex-1 p-3 text-[13px] leading-snug">
              <p className="font-semibold text-foreground">
                {displayName || "—"}
              </p>
              <p className="text-[#8c8c8c]">{displaySub1 || "—"}</p>
              {displaySub2 ? (
                <p className="text-[#8c8c8c]">{displaySub2}</p>
              ) : null}
              {displayMobile ? (
                <p className="text-[#8c8c8c]">{displayMobile}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {selectedMember ? (
        <>
          <div className="grid gap-3 rounded-[3px] border-2 border-[#89c5ff] bg-[#fbfbfb] p-3 sm:grid-cols-3">
            <p className="text-[15px] font-medium text-[#616161]">
              Max Allowed Books :{" "}
              <span className="font-semibold text-blue-600">{maxBooks}</span>
            </p>
            <p className="text-[15px] font-medium text-[#616161]">
              Issued Books :{" "}
              <span className="font-semibold text-blue-600">{issuedCount}</span>
            </p>
            <p className="text-[15px] font-medium text-[#616161]">
              Available :{" "}
              <span className="font-semibold text-blue-600">
                {availableBooks}
              </span>
            </p>
          </div>
        </>
      ) : null}
    </div>
  );

  const memberBody = selectedMember ? (
    <div className="space-y-4">
      <BookIssueCollapsible
        title="Book Issue"
        icon={<Plus className="h-3.5 w-3.5" />}
        defaultOpen
        contentClassName="p-3"
        titleExtra={
          availableBooks === 0 ? (
            <span className="text-[12px] font-medium text-destructive">
              (Max book limit is over.)
            </span>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-5">
            <Select
              label="Book Search"
              value={selectedBookId}
              onChange={(v) => void handleBookChange(v)}
              options={bookOptions}
              placeholder="Book Search"
              searchable
              onSearch={(t) => void onBookSearch(t)}
              isLoading={bookSearchLoading}
              clearable
              disabled={availableBooks === 0}
              className="w-full"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-[13px]">Book Category</Label>
            <Input
              className="h-9"
              value={bookCategory}
              placeholder="Book Category"
              readOnly
              disabled
            />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label className="text-[13px]">Author</Label>
            <Input
              className="h-9"
              value={bookAuthor}
              placeholder="Author"
              readOnly
              disabled
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-[13px]">Volume</Label>
            <Input
              className="h-9"
              value={bookVolume}
              placeholder="Volume"
              readOnly
              disabled
            />
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Select
              label="Book Issue On"
              required
              value={bookIssuedOnId ? String(bookIssuedOnId) : null}
              onChange={(v) => setBookIssuedOnId(v ? Number(v) : undefined)}
              options={issuedOnOptions}
              placeholder="Book Issue On"
              searchable
              disabled={availableBooks === 0}
            />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label className="text-[13px]">Issue Date</Label>
            <DatePicker
              value={issueDate}
              onChange={handleIssueDateChange}
              placeholder="Issue Date"
              disabled={availableBooks === 0}
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label className="text-[13px]">Issue Days</Label>
            <Input
              type="number"
              className="h-9"
              min={1}
              value={issuedDays}
              placeholder="Issue Days"
              onChange={(e) => handleIssuedDaysChange(e.target.value)}
              disabled={availableBooks === 0}
            />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label className="text-[13px]">Return Date</Label>
            <DatePicker
              value={returnDate}
              onChange={handleReturnDateChange}
              placeholder="Return Date"
              disabled={availableBooks === 0}
            />
          </div>
          {selectedBook ? (
            <div className="flex flex-wrap items-end gap-2 lg:col-span-12">
              {availableBooks > 0 ? (
                <Button type="button" size="sm" onClick={handleAddBook}>
                  Add
                </Button>
              ) : null}
              {availableCopies === 0 && availableBooks > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setReserveOpen(true)}
                >
                  Reserved Book
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearBookFields}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>
      </BookIssueCollapsible>

      {pendingIssues.length > 0 ? (
        <BookIssueCollapsible
          title="Issuing Books"
          icon={<History className="h-3.5 w-3.5" />}
          defaultOpen
        >
          <DataTable
            title=""
            bordered={false}
            rowData={pendingIssues}
            columnDefs={pendingColumnDefs}
            getRowId={(p) => p.data._key}
            pagination
            paginationPageSize={10}
            height="auto"
            toolbar={{
              search: true,
              searchPlaceholder: "Search",
            }}
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 pb-4 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleIssueBooks()}
              disabled={issuing}
            >
              {issuing ? "Saving…" : "Save"}
            </Button>
          </div>
        </BookIssueCollapsible>
      ) : null}

      {reservedBooks.length > 0 ? (
        <BookIssueCollapsible
          title="Reserved Books List"
          icon={<History className="h-3.5 w-3.5" />}
          defaultOpen
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-2 font-medium">SI.No</th>
                  <th className="px-2 py-2 font-medium">Book Title</th>
                  <th className="px-2 py-2 font-medium">Reserved Date</th>
                  <th className="px-2 py-2 font-medium">Priority</th>
                </tr>
              </thead>
              <tbody>
                {reservedBooks.map((row, index) => (
                  <tr
                    key={String(row.reserveBookId ?? index)}
                    className="border-b"
                  >
                    <td className="px-2 py-2">{index + 1}</td>
                    <td className="px-2 py-2">
                      {String(row.title ?? row.bookTitle ?? "—")}
                    </td>
                    <td className="px-2 py-2">
                      {formatDisplayDate(row.reservedOn)}
                    </td>
                    <td className="px-2 py-2">
                      {String(row.priorityCatdetCode ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BookIssueCollapsible>
      ) : null}

      <BookIssueCollapsible
        title="Issued Books List"
        icon={<History className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <DataTable
          title=""
          subtitle=""
          bordered={false}
          rowData={issuedBooks}
          columnDefs={issuedColumnDefs}
          loading={loadingIssued}
          pagination
          paginationPageSize={10}
          height="auto"
          toolbar={{
            search: true,
            searchPlaceholder: "Search",
            pdfDocumentTitle: "Issued Books List",
          }}
        />
      </BookIssueCollapsible>
    </div>
  ) : null;

  return (
    <FilteredPage
      title="Book Issue"
      filters={filters}
      body={memberBody}
      bodyClassName="border-t-0 px-5 pb-3 pt-0"
    >
      {selectedMember && selectedBook ? (
        <BookReservedModal
          open={reserveOpen}
          onClose={() => setReserveOpen(false)}
          organizationId={Number(
            selectedMember.organizationId ?? organizationId,
          )}
          libraryId={Number(
            selectedBook.libraryId ?? selectedMember.libraryId ?? 0,
          )}
          bookId={Number(selectedBook.bookId ?? 0)}
          libMemberId={Number(selectedMember.libMemberId ?? 0)}
          onSaved={() => {
            clearBookFields();
            void loadReservedBooks();
          }}
        />
      ) : null}
    </FilteredPage>
  );
}
