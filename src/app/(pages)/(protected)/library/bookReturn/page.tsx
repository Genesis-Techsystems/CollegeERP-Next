"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Pencil } from "lucide-react";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/config/constants/app";
import { useSessionContext } from "@/context/SessionContext";
import { toastError } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  getLibrarySecurityLibraryId,
  listIssuedBooksByMemberCode,
  searchBookReturn,
  searchLibraryMemberByQuery,
  type BookReturnSearchRow,
  type LibraryRow,
} from "@/services";
import type { LibraryMembership } from "@/types/library";
import { ViewHistoryModal } from "./_components/ViewHistoryModal";

const DEFAULT_MEMBER_PHOTO = "/assets/images/avatars/default_Student.png";

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

function returnSearchOptionLabel(r: BookReturnSearchRow): string {
  const code = String(r.memberCode ?? r.membershipNo ?? "").trim();
  const title = String(r.bookDetail?.bookTitle ?? "").trim();
  const acc = String(
    r.bookDetail?.accessionno ?? r.bookDetail?.accessionNo ?? "",
  ).trim();
  if (title && acc) return `${code} (${title} - ${acc})`;
  return code || memberOptionLabel(r);
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

function canEditReturn(row: LibraryRow): boolean {
  return !row.isreturned && row.fineTypeCode !== "BOOKLOST";
}

function returnStatusLabel(row: LibraryRow): string {
  if (row.fineTypeCode === "BOOKLOST") return "Book Lost";
  if (row.isrenewaled && !row.isreturned) return "Renewed";
  if (!row.isrenewaled && row.isreturned) return "Returned";
  if (!row.isrenewaled && !row.isreturned) return "Not Returned";
  return "—";
}

function returnStatusRenderer(p: ICellRendererParams<LibraryRow>) {
  const row = p.data ?? {};
  const label = returnStatusLabel(row);
  if (row.fineTypeCode === "BOOKLOST") {
    return (
      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
        Book Lost
      </span>
    );
  }
  if (label === "Returned") {
    return <span className="font-medium text-[#00be00]">{label}</span>;
  }
  if (label === "Not Returned") {
    return <span className="font-medium text-red-600">{label}</span>;
  }
  return <span>{label}</span>;
}

function makeActionsRenderer(
  onEdit: (row: LibraryRow) => void,
  onView: (row: LibraryRow) => void,
) {
  return (p: ICellRendererParams<LibraryRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1">
        {canEditReturn(row) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Return book"
            onClick={() => onEdit(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          aria-label="View history"
          onClick={() => onView(row)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

export default function BookReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const resolveLibraryId = useCallback((): number | undefined => {
    if (isAdmin) return undefined;
    return securityLibraryId;
  }, [isAdmin, securityLibraryId]);

  const [searchRows, setSearchRows] = useState<BookReturnSearchRow[]>([]);
  const [searchOptions, setSearchOptions] = useState<SelectOption[]>([]);
  const [selectedSearchKey, setSelectedSearchKey] = useState<string | null>(
    null,
  );
  const [selectedMember, setSelectedMember] =
    useState<BookReturnSearchRow | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [historyRow, setHistoryRow] = useState<LibraryRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const memberCode = memberCodeOf(selectedMember);

  const { data: issuedBooks = [], isLoading: loadingIssued } = useQuery({
    queryKey: ["Library", "issuedBooksByMemberCode", memberCode],
    queryFn: () => listIssuedBooksByMemberCode(memberCode),
    enabled: memberCode.length > 0,
  });

  const selectMember = useCallback((member: BookReturnSearchRow) => {
    setSelectedMember(member);
    setSelectedSearchKey(
      String(member.libMemberId ?? member.memberShipId ?? ""),
    );
    setSearchRows([member]);
    setSearchOptions([
      {
        value: String(member.libMemberId ?? member.memberShipId ?? ""),
        label: returnSearchOptionLabel(member),
      },
    ]);
  }, []);

  const loadMemberByRollNo = useCallback(
    async (rollNo: string) => {
      const q = rollNo.trim();
      if (!q) return;
      setSearchLoading(true);
      try {
        const rows = await searchLibraryMemberByQuery(q, resolveLibraryId());
        if (rows.length > 0) selectMember(rows[0]!);
      } catch (e) {
        toastError(e, "Failed to load member");
      } finally {
        setSearchLoading(false);
      }
    },
    [resolveLibraryId, selectMember],
  );

  useEffect(() => {
    const rollNo = String(searchParams.get("rollNo") ?? "").trim();
    if (!rollNo) return;
    if (!isAdmin && securityLibraryId === undefined && employeeId > 0) return;
    void loadMemberByRollNo(rollNo);
  }, [
    employeeId,
    isAdmin,
    loadMemberByRollNo,
    searchParams,
    securityLibraryId,
  ]);

  const onCombinedSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      if (q.length < 3) {
        setSearchRows([]);
        setSearchOptions([]);
        return;
      }
      setSearchLoading(true);
      try {
        const rows = await searchBookReturn(q, resolveLibraryId());
        setSearchRows(rows);
        setSearchOptions(
          rows.map((row, index) => ({
            value: `search::${index}`,
            label: returnSearchOptionLabel(row),
          })),
        );
      } catch (e) {
        toastError(e, "Membership and book search failed");
        setSearchRows([]);
        setSearchOptions([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [resolveLibraryId],
  );

  function handleSearchChange(value: string | null) {
    setSelectedSearchKey(value);
    if (!value) {
      setSelectedMember(null);
      return;
    }
    if (value.startsWith("search::")) {
      const index = Number(value.slice("search::".length));
      const picked = searchRows[index];
      if (picked) selectMember(picked);
      return;
    }
    const picked = searchRows.find(
      (row) => String(row.libMemberId ?? row.memberShipId ?? "") === value,
    );
    if (picked) selectMember(picked);
  }

  const handleEdit = useCallback(
    (row: LibraryRow) => {
      const id = Number(row.bookIssuedetailsId ?? 0);
      if (!id) return;
      const roll = memberCodeOf(selectedMember);
      router.push(
        `/library/book-return-fines?bookIssuedetailsId=${id}${
          roll ? `&rollNo=${encodeURIComponent(roll)}` : ""
        }`,
      );
    },
    [router, selectedMember],
  );

  const handleView = useCallback((row: LibraryRow) => {
    setHistoryRow(row);
    setHistoryOpen(true);
  }, []);

  const columnDefs = useMemo<ColDef<LibraryRow>[]>(
    () => [
      { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
      {
        headerName: "Accession No.",
        minWidth: 120,
        valueGetter: (p) => {
          const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
          return String(detail.accessionno ?? p.data?.accessionno ?? "—");
        },
      },
      {
        headerName: "Book Title",
        minWidth: 180,
        flex: 1,
        valueGetter: (p) => {
          const detail = (p.data?.bookDetail ?? {}) as LibraryRow;
          return String(detail.bookTitle ?? p.data?.bookTitle ?? "—");
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
        headerName: "Due Date",
        minWidth: 110,
        valueFormatter: (p) => formatDisplayDate(p.value),
      },
      {
        field: "issueDuedate",
        headerName: "Returned Date",
        minWidth: 120,
        valueFormatter: (p) => (p.value ? formatDisplayDate(p.value) : "—"),
      },
      {
        field: "fineTypeName",
        headerName: "Fine Type",
        minWidth: 100,
        valueFormatter: (p) => (p.value ? String(p.value) : "—"),
      },
      {
        headerName: "Status",
        minWidth: 120,
        cellRenderer: returnStatusRenderer,
        sortable: false,
      },
      {
        headerName: "Actions",
        minWidth: 100,
        flex: 0,
        width: 100,
        sortable: false,
        cellRenderer: makeActionsRenderer(handleEdit, handleView),
      },
    ],
    [handleEdit, handleView],
  );

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

  const filters = (
    <div className="space-y-4">
      <Select
        label="Membership and book Search"
        value={selectedSearchKey}
        onChange={handleSearchChange}
        options={searchOptions}
        placeholder="Membership and book Search"
        searchable
        onSearch={(t) => void onCombinedSearch(t)}
        isLoading={searchLoading}
        clearable
        className="w-full max-w-[50%]"
      />
      {selectedMember ? (
        <div className="flex overflow-hidden rounded-[3px] border-4 border-[#c3d9ff] bg-[#fbfbfb]">
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
  );

  return (
    <>
      <FilteredListPage
        title="Book Return"
        filters={filters}
        rowData={selectedMember ? issuedBooks : []}
        columnDefs={columnDefs}
        loading={selectedMember ? loadingIssued : false}
        pagination
        paginationPageSize={10}
        height="auto"
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          pdfDocumentTitle: "Issued Books",
        }}
      />
      <ViewHistoryModal
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryRow(null);
        }}
        row={historyRow}
      />
    </>
  );
}
