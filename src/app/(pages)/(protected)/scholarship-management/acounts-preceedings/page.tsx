"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { getSecuredValue, setSecuredValue } from "@/common/generic-functions";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  createSchAccountsPreceeding,
  getScholarshipCollegeFilters,
  listSchAccountsPreceedings,
  updateSchAccountsPreceeding,
} from "@/services";
import type { SchAccountsPreceeding } from "@/types/scholarship";
import {
  AccountPreceedingModal,
  type AccountPreceedingModalResult,
} from "./AccountPreceedingModal";
import { ViewPreceedingsModal } from "./ViewPreceedingsModal";

type AccountRow = SchAccountsPreceeding & Record<string, unknown>;

const FILTER_STORAGE_KEY = "scholarship.acountsPreceedings.filters";

type StoredFilters = {
  collegeId: string | null;
};

function readStoredFilters(): StoredFilters {
  const stored = getSecuredValue<StoredFilters>(FILTER_STORAGE_KEY);
  if (!stored || typeof stored !== "object") {
    return { collegeId: null };
  }
  return {
    collegeId: stored.collegeId ? String(stored.collegeId) : null,
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AccountRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 120,
  } as ColDef<AccountRow>,
  title: {
    field: "title",
    headerName: "Cheque Title",
    minWidth: 180,
  } as ColDef<AccountRow>,
  chequeNo: {
    field: "chequeNo",
    headerName: "Cheque No",
    minWidth: 130,
  } as ColDef<AccountRow>,
  chequeDate: {
    field: "chequeDate",
    headerName: "Cheque Date",
    minWidth: 130,
  } as ColDef<AccountRow>,
  bankName: {
    field: "bankName",
    headerName: "Bank",
    minWidth: 140,
  } as ColDef<AccountRow>,
  preceedings: {
    headerName: "Preceedings",
    minWidth: 110,
    flex: 0,
    width: 120,
  } as ColDef<AccountRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    flex: 0,
    width: 110,
  } as ColDef<AccountRow>,
};

function formatDt(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, DATE_FORMATS.DISPLAY);
  } catch {
    return raw;
  }
}

function dateRenderer(p: ICellRendererParams<AccountRow>) {
  return formatDt(p.data?.chequeDate);
}

function accountPreceedingId(row: AccountRow): number {
  return Number(
    row.schAccountsPreceedingsId ?? row.schAccountsPreceedingId ?? 0,
  );
}

function makeViewRenderer(onView: (row: AccountRow) => void) {
  return (p: ICellRendererParams<AccountRow>) => (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-7 px-2"
      onClick={() => p.data && onView(p.data)}
    >
      View
    </Button>
  );
}

function makeActionsRenderer(onEdit: (row: AccountRow) => void) {
  return (p: ICellRendererParams<AccountRow>) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 px-2"
      title="Edit"
      onClick={() => p.data && onEdit(p.data)}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function AccountsPreceedingsPage() {
  const queryClient = useQueryClient();
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(
    () => readStoredFilters().collegeId,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewAccountId, setViewAccountId] = useState(0);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["SchAccountsPreceeding", "filters", orgId, employeeId],
    queryFn: () => getScholarshipCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);
  const collegeNum = Number(collegeId ?? 0);

  const collegeOptions = useMemo(
    () =>
      colleges
        .map((c) => ({
          value: String(pickNum(c, ["fk_college_id", "collegeId"])),
          label:
            pickText(c, ["college_code", "collegeCode"]) ||
            pickText(c, ["college_name", "collegeName"]) ||
            String(pickNum(c, ["fk_college_id", "collegeId"])),
        }))
        .filter((o) => o.value !== "0"),
    [colleges],
  );

  useEffect(() => {
    if (colleges.length === 0) return;

    const ids = new Set(
      colleges.map((c) => String(pickNum(c, ["fk_college_id", "collegeId"]))),
    );
    const storedId = readStoredFilters().collegeId;
    const currentValid = collegeId != null && ids.has(collegeId);
    if (currentValid) return;

    if (storedId && ids.has(storedId)) {
      setCollegeId(storedId);
      return;
    }

    setCollegeId(String(pickNum(colleges[0], ["fk_college_id", "collegeId"])));
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeId) return;
    setSecuredValue(FILTER_STORAGE_KEY, {
      collegeId,
    } satisfies StoredFilters);
  }, [collegeId]);

  const {
    data: rows = [],
    isLoading: loadingList,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QK.schAccountsPreceedings.list(collegeNum || undefined),
    queryFn: () => listSchAccountsPreceedings(collegeNum),
    enabled: collegeNum > 0,
  });

  const collegeCode = useMemo(() => {
    const opt = collegeOptions.find((o) => o.value === collegeId);
    return opt?.label ?? "";
  }, [collegeOptions, collegeId]);

  const openCreate = useCallback(() => {
    if (!collegeNum) {
      toastInfo("Select a college first.");
      return;
    }
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  }, [collegeNum]);

  const openEdit = useCallback(
    (row: AccountRow) => {
      setEditing({
        ...row,
        collegeId: Number(row.collegeId ?? collegeNum),
      });
      setModalMode("edit");
      setModalOpen(true);
    },
    [collegeNum],
  );

  const openView = useCallback((row: AccountRow) => {
    const id = accountPreceedingId(row);
    if (!id) {
      toastInfo("Accounts preceeding id missing.");
      return;
    }
    setViewAccountId(id);
    setViewOpen(true);
  }, []);

  const handleModalSubmit = useCallback(
    async (payload: AccountPreceedingModalResult) => {
      try {
        if (modalMode === "edit" && payload.schAccountsPreceedingsId) {
          await updateSchAccountsPreceeding(payload.schAccountsPreceedingsId, {
            collegeId: payload.collegeId,
            bankId: payload.bankId,
            title: payload.title,
            chequeNo: payload.chequeNo,
            chequeDate: payload.chequeDate,
            comments: payload.comments,
            isHandOvertoAcc: payload.isHandOvertoAcc,
            isActive: payload.isActive,
            reason: payload.reason,
            schPreceedingIds: payload.schPreceedingIds,
          });
          toastSuccess("Accounts preceeding updated.");
        } else {
          await createSchAccountsPreceeding({
            collegeId: payload.collegeId,
            bankId: payload.bankId,
            title: payload.title,
            chequeNo: payload.chequeNo,
            chequeDate: payload.chequeDate,
            comments: payload.comments,
            isHandOvertoAcc: payload.isHandOvertoAcc,
            isActive: payload.isActive,
            reason: payload.reason,
            schPreceedingList: payload.schPreceedingList,
            schPreceedingIds: payload.schPreceedingIds,
          });
          toastSuccess("Accounts preceeding saved.");
        }
        setModalOpen(false);
        setEditing(null);
        await queryClient.invalidateQueries({
          queryKey: QK.schAccountsPreceedings.all,
        });
        await refetch();
      } catch (err) {
        toastError(
          err,
          modalMode === "edit"
            ? "Failed to update accounts preceeding"
            : "Failed to save accounts preceeding",
        );
      }
    },
    [modalMode, queryClient, refetch],
  );

  const columnDefs = useMemo<ColDef<AccountRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.collegeCode,
      COL_DEFS.title,
      COL_DEFS.chequeNo,
      { ...COL_DEFS.chequeDate, cellRenderer: dateRenderer },
      COL_DEFS.bankName,
      { ...COL_DEFS.preceedings, cellRenderer: makeViewRenderer(openView) },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEdit) },
    ],
    [openEdit, openView],
  );

  return (
    <FilteredListPage
      title="Accounts Preceedings"
      filters={
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => setCollegeId(v)}
            options={collegeOptions}
            placeholder="Select college"
            isLoading={loadingFilters}
            searchable
          />
        </div>
      }
      rowData={collegeNum > 0 ? (rows as AccountRow[]) : []}
      columnDefs={columnDefs}
      loading={loadingList || isFetching}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        collegeNum > 0 ? (
          <Button type="button" onClick={openCreate}>
            Add Accounts Preceedings
          </Button>
        ) : null
      }
      getRowId={(p) => String(accountPreceedingId(p.data as AccountRow))}
    >
      <AccountPreceedingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        mode={modalMode}
        collegeId={collegeNum}
        collegeCode={
          modalMode === "edit"
            ? String(editing?.collegeCode ?? collegeCode)
            : collegeCode
        }
        row={editing}
        onSubmit={handleModalSubmit}
      />
      <ViewPreceedingsModal
        open={viewOpen}
        onClose={() => {
          setViewOpen(false);
          setViewAccountId(0);
        }}
        schAccountsPreceedingsId={viewAccountId}
      />
    </FilteredListPage>
  );
}
