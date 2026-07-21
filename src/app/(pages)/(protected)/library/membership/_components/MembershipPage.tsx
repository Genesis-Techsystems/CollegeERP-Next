"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { PencilIcon, PrinterIcon } from "lucide-react";
import type {
  ColDef,
  ICellRendererParams,
  ValueGetterParams,
} from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionContext } from "@/context/SessionContext";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  generateLibraryMemberBarcode,
  getLibrarySecurityLibraryId,
  listEmployeeLibraryMemberships,
  listLibraryMembershipsPaginated,
  listStudentLibraryMemberships,
  searchLibraryMembers,
} from "@/services";
import type { LibraryMembership } from "@/types/library";
import { EditMembershipModal } from "./EditMembershipModal";
import { NewMembershipPanel } from "./NewMembershipPanel";

type MembershipTab = "list" | "new";
type SearchMode = "member" | "all" | "students" | "employees";
const PAGE_SIZE = 50;

const TAB_TRIGGER_CLASS =
  "rounded-none border-b-2 border-transparent px-4 py-2 text-[13px] data-[state=active]:border-[#c9a227] data-[state=active]:bg-[#fff8e1] data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LibraryMembership>,
  memberCode: {
    field: "memberCode",
    headerName: "Membership Id",
    minWidth: 125,
  } as ColDef<LibraryMembership>,
  memberType: {
    field: "memberType",
    headerName: "Member Type",
    minWidth: 115,
  } as ColDef<LibraryMembership>,
  memberName: {
    field: "memberName",
    headerName: "Member",
    minWidth: 150,
  } as ColDef<LibraryMembership>,
  department: {
    field: "empDeptName",
    headerName: "Department",
    minWidth: 130,
  } as ColDef<LibraryMembership>,
  dates: { headerName: "Date", minWidth: 190 } as ColDef<LibraryMembership>,
  maxBooks: {
    field: "noOfMaxBooks",
    headerName: "Max Books",
    minWidth: 100,
  } as ColDef<LibraryMembership>,
  library: {
    field: "libraryCode",
    headerName: "Library",
    minWidth: 110,
  } as ColDef<LibraryMembership>,
  barcode: {
    headerName: "Member BarCode",
    minWidth: 205,
  } as ColDef<LibraryMembership>,
  status: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<LibraryMembership>,
  actions: {
    headerName: "Actions",
    width: 86,
    minWidth: 86,
    flex: 0,
  } as ColDef<LibraryMembership>,
};

async function loadMembershipRows(
  mode: SearchMode,
  searchText: string,
  collegeId: number,
  page: number,
  libraryId?: number,
): Promise<{ rows: LibraryMembership[]; totalCount: number }> {
  if (mode === "member") {
    const term = searchText.trim();
    if (term.length < 5) return { rows: [], totalCount: 0 };
    const rows = await searchLibraryMembers(term, libraryId);
    return { rows, totalCount: rows.length };
  }
  if (mode === "all") {
    return listLibraryMembershipsPaginated(
      page,
      PAGE_SIZE,
      collegeId || undefined,
    );
  }
  const rows =
    mode === "students"
      ? await listStudentLibraryMemberships(collegeId || undefined)
      : await listEmployeeLibraryMemberships(collegeId || undefined);
  return { rows, totalCount: rows.length };
}

function dateRenderer(params: ICellRendererParams<LibraryMembership>) {
  const from = params.data?.memberFromDt;
  const to = params.data?.memberToDt;
  const display = (value: string | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : format(date, "MMM d, yyyy");
  };
  return `${display(from)} - ${display(to)}`;
}

function barcodeRenderer(params: ICellRendererParams<LibraryMembership>) {
  const barcode = params.data?.memberBarcode;
  if (!barcode) return <span>—</span>;
  return (
    <img
      src={`data:image/jpg;base64,${barcode}`}
      alt={`Barcode ${params.data?.memberCode ?? ""}`}
      className="h-[30px] w-[192px] object-contain"
    />
  );
}

function statusRenderer(params: ICellRendererParams<LibraryMembership>) {
  return <StatusBadge status={params.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: LibraryMembership) => void) {
  return (params: ICellRendererParams<LibraryMembership>) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Edit membership"
      onClick={() => params.data && onEdit(params.data)}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export function MembershipPage() {
  const { user } = useSessionContext();
  const isAdmin = user?.userRole === "ADMIN";
  const collegeId = isAdmin ? 0 : (user?.collegeId ?? 0);

  const [activeTab, setActiveTab] = useState<MembershipTab>("list");
  const [searchMode, setSearchMode] = useState<SearchMode>("member");
  const [searchText, setSearchText] = useState("");
  const [selectedMember, setSelectedMember] =
    useState<LibraryMembership | null>(null);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<LibraryMembership | null>(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const securityQuery = useQuery({
    queryKey: [
      "Library",
      "membership-security",
      user?.organizationId,
      user?.employeeId,
    ],
    queryFn: () =>
      getLibrarySecurityLibraryId(
        Number(user?.organizationId ?? 0),
        Number(user?.employeeId ?? 0),
      ),
    enabled: !isAdmin && Boolean(user?.organizationId),
  });
  const memberReady = searchMode !== "member" || searchText.trim().length >= 5;
  const queryEnabled =
    Boolean(user) &&
    activeTab === "list" &&
    memberReady &&
    (isAdmin || !securityQuery.isFetching);

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      "Library",
      "membership",
      searchMode,
      searchText.trim(),
      collegeId,
      page,
      securityQuery.data,
    ],
    queryFn: () =>
      loadMembershipRows(
        searchMode,
        searchText,
        collegeId,
        page,
        securityQuery.data,
      ),
    enabled: queryEnabled,
  });
  const rows = data?.rows ?? [];
  const totalCount = data?.totalCount ?? 0;

  const onEdit = useCallback((row: LibraryMembership) => setEditing(row), []);
  const memberOptions = useMemo(
    () =>
      rows.map((row) => ({
        value: String(row.libMemberId ?? row.memberShipId ?? ""),
        label: `${row.memberCode ?? row.membershipNo ?? ""}${row.memberName ? ` (${row.memberName})` : ""}`,
      })),
    [rows],
  );
  const displayedRows =
    searchMode === "member" ? (selectedMember ? [selectedMember] : []) : rows;
  const showTable = searchMode !== "member" || selectedMember != null;

  const columnDefs = useMemo<ColDef<LibraryMembership>[]>(() => {
    const definitions = [
      {
        ...COL_DEFS.siNo,
        valueGetter: (params: ValueGetterParams<LibraryMembership>) =>
          (params.node?.rowIndex ?? 0) +
          1 +
          (searchMode === "all" ? page * PAGE_SIZE : 0),
      },
      COL_DEFS.memberCode,
      COL_DEFS.memberType,
      COL_DEFS.memberName,
      ...(searchMode === "employees" ? [COL_DEFS.department] : []),
      { ...COL_DEFS.dates, cellRenderer: dateRenderer },
      COL_DEFS.maxBooks,
      COL_DEFS.library,
      { ...COL_DEFS.barcode, cellRenderer: barcodeRenderer },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(onEdit) },
    ];
    return definitions;
  }, [onEdit, page, searchMode]);

  async function handleGenerateBarcode() {
    setGeneratingBarcode(true);
    try {
      await generateLibraryMemberBarcode();
      toastSuccess("Member barcodes generated successfully");
    } catch (barcodeError) {
      toastError(barcodeError, "Failed to generate member barcodes");
    } finally {
      setGeneratingBarcode(false);
    }
  }

  const tabs = (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as MembershipTab)}
    >
      <TabsList className="h-auto w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
        <TabsTrigger value="list" className={TAB_TRIGGER_CLASS}>
          Membership List
        </TabsTrigger>
        <TabsTrigger value="new" className={TAB_TRIGGER_CLASS}>
          New Membership
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const listFilters = (
    <div className="space-y-4">
      {tabs}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <RadioGroup
          value={searchMode}
          onValueChange={(value) => {
            setSearchMode(value as SearchMode);
            setSearchText("");
            setSelectedMember(null);
            setPage(0);
          }}
          className="flex flex-wrap gap-x-6 gap-y-2"
        >
          {[
            ["member", "Search By Member"],
            ["all", "All Members"],
            ["students", "Student List"],
            ["employees", "Employee List"],
          ].map(([value, label]) => (
            <div className="flex items-center gap-2" key={value}>
              <RadioGroupItem value={value} id={`membership-${value}`} />
              <Label
                htmlFor={`membership-${value}`}
                className="text-[13px] font-normal"
              >
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="flex gap-2">
          {searchMode === "students" || searchMode === "employees" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => globalThis.print()}
            >
              <PrinterIcon className="mr-1 h-3.5 w-3.5" /> Print
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={generatingBarcode}
            onClick={() => void handleGenerateBarcode()}
          >
            Generate Member BarCode
          </Button>
        </div>
      </div>
      {searchMode === "member" ? (
        <Select
          className="max-w-sm"
          value={
            selectedMember
              ? String(
                  selectedMember.libMemberId ??
                    selectedMember.memberShipId ??
                    "",
                )
              : null
          }
          onChange={(value) => {
            setSelectedMember(
              rows.find(
                (row) =>
                  String(row.libMemberId ?? row.memberShipId ?? "") === value,
              ) ?? null,
            );
          }}
          onSearch={(term) => {
            if (term) {
              setSearchText(term);
              setSelectedMember(null);
            }
          }}
          options={memberOptions}
          placeholder="Membership Id or Name"
          isLoading={isFetching}
          searchable
          clearable
        />
      ) : null}
    </div>
  );

  if (activeTab === "new") {
    return (
      <FilteredListPage
        title="Membership"
        filters={tabs}
        filtersCollapsible={false}
        body={<NewMembershipPanel onSaved={() => void refetch()} />}
      />
    );
  }

  return (
    <FilteredListPage
      title="Membership"
      filters={listFilters}
      filtersCollapsible={false}
      notice={
        isError && !/no\s*record/i.test(getErrorMessage(error)) ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      rowData={memberReady ? displayedRows : []}
      columnDefs={showTable ? columnDefs : undefined}
      body={showTable ? undefined : null}
      loading={isFetching}
      pagination={searchMode !== "all"}
      serverSide={searchMode === "all"}
      totalCount={totalCount}
      currentPage={page}
      paginationPageSize={PAGE_SIZE}
      onPageChange={setPage}
      rowHeight={44}
      toolbar={{
        search: true,
        searchPlaceholder: "Search By Membership Id",
        pdfDocumentTitle: "Library Membership",
      }}
    >
      <EditMembershipModal
        open={editing != null}
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={() => void refetch()}
      />
      <div id="membership-print" className="hidden print:block">
        {rows.length > 0 ? (
          <table className="w-full border-collapse">
            <tbody>
              {Array.from(
                { length: Math.ceil(rows.length / 4) },
                (_, rowIndex) => (
                  <tr key={rowIndex}>
                    {rows.slice(rowIndex * 4, rowIndex * 4 + 4).map((row) => (
                      <td
                        key={String(row.libMemberId ?? row.memberShipId)}
                        className="w-1/4 p-4 text-center"
                      >
                        <div className="text-xs">
                          {row.empNumber || row.rollNumber}
                        </div>
                        {row.memberBarcode ? (
                          <img
                            src={`data:image/jpg;base64,${row.memberBarcode}`}
                            alt=""
                            className="mx-auto h-[30px] w-[192px] object-contain"
                          />
                        ) : null}
                        <div className="text-[8px]">{row.memberCode}</div>
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        ) : null}
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #membership-print,
          #membership-print * {
            visibility: visible !important;
          }
          #membership-print {
            display: block !important;
            position: absolute;
            inset: 0;
            width: 100%;
            background: white;
          }
        }
      `}</style>
    </FilteredListPage>
  );
}
